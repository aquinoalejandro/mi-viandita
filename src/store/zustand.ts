import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type {
  Client,
  ClientEvent,
  ExpenseCategory,
  ExpenseRecord,
  Holiday,
  MiViandaStackParamList,
  MisGastosStackParamList,
  PaymentCycle,
  Period,
  ViandaTipo,
} from "../types/types";
import type { MiViandaBackupData } from "../utils/backup";
import {
  getClientCycleDays,
  getClientExtraDays,
  recalcularEstadoCliente,
  synchronizeClientCycles,
} from "../utils/billing";
import { buildPeriodsFromCycles } from "../utils/cycle";
import { getTodayString, isValidIsoDateString } from "../utils/date";
import { STORAGE_KEYS } from "../utils/storage";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type RawMiViandaData = {
  clientes: Client[];
  eventos: ClientEvent[];
  ciclos: PaymentCycle[];
  feriados: Holiday[];
  tiposVianda: ViandaTipo[];
};

type ReconciledMiViandaData = {
  clientes: Client[];
  eventos: ClientEvent[];
  periodos: Period[];
  ciclos: PaymentCycle[];
  feriados: Holiday[];
  tiposVianda: ViandaTipo[];
};

const reconcileMiViandaData = (raw: RawMiViandaData): ReconciledMiViandaData => {
  const today = getTodayString();

  const feriadosMap = new Map<string, Holiday>();
  raw.feriados
    .filter((f) => isValidIsoDateString(f.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((f) => {
      if (!feriadosMap.has(f.fecha)) {
        feriadosMap.set(f.fecha, f);
      }
    });
  const feriados = Array.from(feriadosMap.values());

  const tiposVianda = [...raw.tiposVianda]
    .filter((t) => t.nombre.trim().length > 0)
    .map((t) => ({ ...t, nombre: t.nombre.trim() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const eventos = raw.eventos
    .filter((ev) => ev.tipo === "pago" && isValidIsoDateString(ev.fecha))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const clientes: Client[] = [];
  const ciclos: PaymentCycle[] = [];
  const periodos: Period[] = [];

  for (const cliente of raw.clientes) {
    const pagosCliente = eventos.filter((ev) => ev.clienteId === cliente.id);
    const ciclosPrevios = raw.ciclos.filter((c) => c.clienteId === cliente.id);
    const extraDays = getClientExtraDays(cliente);

    const ciclosSync = synchronizeClientCycles(
      cliente.id,
      pagosCliente,
      ciclosPrevios,
      feriados,
      today,
      extraDays
    );
    const periodosSync = buildPeriodsFromCycles(cliente.id, ciclosSync, feriados);
    const clienteNormalizado = recalcularEstadoCliente(
      cliente,
      pagosCliente,
      feriados,
      today,
      ciclosSync
    );

    clientes.push(clienteNormalizado);
    ciclos.push(...ciclosSync);
    periodos.push(...periodosSync);
  }

  return {
    clientes,
    eventos,
    periodos,
    ciclos,
    feriados,
    tiposVianda,
  };
};

const persistMiViandaAll = async (data: ReconciledMiViandaData) => {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(data.clientes)),
    AsyncStorage.setItem(STORAGE_KEYS.EVENTOS_CLIENTE, JSON.stringify(data.eventos)),
    AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(data.periodos)),
    AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(data.ciclos)),
    AsyncStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(data.feriados)),
    AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(data.tiposVianda)),
  ]);
};

type Store = {
  // Navegación
  ubicacion: keyof MiViandaStackParamList;
  setUbi: (ruta: keyof MiViandaStackParamList) => void;
  misGastosUbicacion: keyof MisGastosStackParamList;
  setMisGastosUbi: (ruta: keyof MisGastosStackParamList) => void;

  // MisGastos
  misGastosCategories: ExpenseCategory[];
  misGastosExpenses: ExpenseRecord[];
  misGastosHydrated: boolean;
  misGastosHydrating: boolean;
  hydrateMisGastos: () => Promise<void>;
  persistMisGastosCategories: (nextCategories: ExpenseCategory[]) => Promise<void>;
  persistMisGastosExpenses: (nextExpenses: ExpenseRecord[]) => Promise<void>;
  saveMisGastosCategory: (category: ExpenseCategory) => Promise<void>;
  deleteMisGastosCategory: (categoryId: string) => Promise<void>;
  saveMisGastosExpense: (expense: ExpenseRecord) => Promise<void>;
  deleteMisGastosExpense: (expenseId: string) => Promise<void>;
  replaceMisGastosData: (
    nextCategories: ExpenseCategory[],
    nextExpenses: ExpenseRecord[]
  ) => Promise<void>;
  clearMisGastosData: () => Promise<void>;

  // MiVianda
  miViandaClientes: Client[];
  miViandaEventos: ClientEvent[];
  miViandaPeriodos: Period[];
  miViandaCiclos: PaymentCycle[];
  miViandaFeriados: Holiday[];
  miViandaTiposVianda: ViandaTipo[];
  miViandaHydrated: boolean;
  miViandaHydrating: boolean;
  hydrateMiVianda: (force?: boolean) => Promise<void>;
  addMiViandaClient: (
    cliente: Client,
    pagoInicial?: { fecha: string; detalle?: string }
  ) => Promise<void>;
  updateMiViandaClient: (cliente: Client) => Promise<void>;
  deleteMiViandaClient: (clienteId: string) => Promise<void>;
  adjustMiViandaClientDays: (clienteId: string, delta: number) => Promise<boolean>;
  resetMiViandaClientAdjustment: (clienteId: string) => Promise<void>;
  addMiViandaPayment: (clienteId: string, fecha: string, detalle?: string) => Promise<ClientEvent>;
  updateMiViandaPayment: (
    pagoId: string,
    nuevaFecha: string,
    detalle?: string
  ) => Promise<void>;
  deleteMiViandaPayment: (pagoId: string) => Promise<void>;
  addMiViandaTipo: (nombre: string) => Promise<ViandaTipo>;
  renameMiViandaTipo: (tipoId: string, nuevoNombre: string) => Promise<void>;
  deleteMiViandaTipo: (tipoId: string) => Promise<void>;
  addMiViandaHoliday: (fecha: string, motivo?: string) => Promise<Holiday>;
  deleteMiViandaHoliday: (feriadoId: string) => Promise<void>;
  replaceMiViandaData: (data: MiViandaBackupData) => Promise<void>;
  clearMiViandaData: () => Promise<void>;
};

export const useStore = create<Store>((set, get) => ({
  ubicacion: "Clientes",
  setUbi: (ruta) => set({ ubicacion: ruta }),
  misGastosUbicacion: "Resumen",
  setMisGastosUbi: (ruta) => set({ misGastosUbicacion: ruta }),

  // --------------------------------------------------------------------------
  // MisGastos
  // --------------------------------------------------------------------------
  misGastosCategories: [],
  misGastosExpenses: [],
  misGastosHydrated: false,
  misGastosHydrating: false,

  hydrateMisGastos: async () => {
    const { misGastosHydrated, misGastosHydrating } = get();
    if (misGastosHydrated || misGastosHydrating) return;

    set({ misGastosHydrating: true });
    try {
      const [storedCategories, storedExpenses] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.GASTOS_CATEGORIAS),
        AsyncStorage.getItem(STORAGE_KEYS.GASTOS_REGISTROS),
      ]);

      const parsedCategories = storedCategories ? JSON.parse(storedCategories) : [];
      const parsedExpenses = storedExpenses ? JSON.parse(storedExpenses) : [];

      set({
        misGastosCategories: Array.isArray(parsedCategories) ? parsedCategories : [],
        misGastosExpenses: Array.isArray(parsedExpenses) ? parsedExpenses : [],
        misGastosHydrated: true,
      });
    } catch {
      set({
        misGastosCategories: [],
        misGastosExpenses: [],
        misGastosHydrated: true,
      });
    } finally {
      set({ misGastosHydrating: false });
    }
  },

  persistMisGastosCategories: async (nextCategories) => {
    set({ misGastosCategories: nextCategories, misGastosHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories));
  },

  persistMisGastosExpenses: async (nextExpenses) => {
    set({ misGastosExpenses: nextExpenses, misGastosHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses));
  },

  saveMisGastosCategory: async (category) => {
    const { misGastosCategories } = get();
    const exists = misGastosCategories.some((c) => c.id === category.id);
    const nextCategories = exists
      ? misGastosCategories.map((c) => (c.id === category.id ? category : c))
      : [...misGastosCategories, category];
    await get().persistMisGastosCategories(nextCategories);
  },

  deleteMisGastosCategory: async (categoryId) => {
    const { misGastosCategories, misGastosExpenses } = get();
    const nextCategories = misGastosCategories.filter((c) => c.id !== categoryId);
    const nextExpenses = misGastosExpenses.filter((e) => e.categoriaId !== categoryId);
    set({
      misGastosCategories: nextCategories,
      misGastosExpenses: nextExpenses,
      misGastosHydrated: true,
    });
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories)),
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses)),
    ]);
  },

  saveMisGastosExpense: async (expense) => {
    const { misGastosExpenses } = get();
    const exists = misGastosExpenses.some((e) => e.id === expense.id);
    const nextExpenses = exists
      ? misGastosExpenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...misGastosExpenses];
    await get().persistMisGastosExpenses(nextExpenses);
  },

  deleteMisGastosExpense: async (expenseId) => {
    const { misGastosExpenses } = get();
    const nextExpenses = misGastosExpenses.filter((e) => e.id !== expenseId);
    await get().persistMisGastosExpenses(nextExpenses);
  },

  replaceMisGastosData: async (nextCategories, nextExpenses) => {
    set({
      misGastosCategories: nextCategories,
      misGastosExpenses: nextExpenses,
      misGastosHydrated: true,
    });
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories)),
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses)),
    ]);
  },

  clearMisGastosData: async () => {
    set({
      misGastosCategories: [],
      misGastosExpenses: [],
      misGastosHydrated: true,
    });
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.GASTOS_CATEGORIAS),
      AsyncStorage.removeItem(STORAGE_KEYS.GASTOS_REGISTROS),
    ]);
  },

  // --------------------------------------------------------------------------
  // MiVianda
  // --------------------------------------------------------------------------
  miViandaClientes: [],
  miViandaEventos: [],
  miViandaPeriodos: [],
  miViandaCiclos: [],
  miViandaFeriados: [],
  miViandaTiposVianda: [],
  miViandaHydrated: false,
  miViandaHydrating: false,

  hydrateMiVianda: async (force = false) => {
    const { miViandaHydrated, miViandaHydrating } = get();
    if ((!force && miViandaHydrated) || miViandaHydrating) return;

    set({ miViandaHydrating: true });
    try {
      const [
        rawClientes,
        rawEventos,
        rawPeriodos,
        rawCiclos,
        rawFeriados,
        rawTipos,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
        AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE),
        AsyncStorage.getItem(STORAGE_KEYS.PERIODOS),
        AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS),
        AsyncStorage.getItem(STORAGE_KEYS.FERIADOS),
        AsyncStorage.getItem(STORAGE_KEYS.VIANDAS_TIPOS),
      ]);

      const parsedClientes = rawClientes ? JSON.parse(rawClientes) : [];
      const parsedEventos = rawEventos ? JSON.parse(rawEventos) : [];
      const parsedPeriodos = rawPeriodos ? JSON.parse(rawPeriodos) : [];
      const parsedCiclos = rawCiclos ? JSON.parse(rawCiclos) : [];
      const parsedFeriados = rawFeriados ? JSON.parse(rawFeriados) : [];
      const parsedTipos = rawTipos ? JSON.parse(rawTipos) : [];

      const reconciled = reconcileMiViandaData({
        clientes: Array.isArray(parsedClientes) ? parsedClientes : [],
        eventos: Array.isArray(parsedEventos) ? parsedEventos : [],
        ciclos: Array.isArray(parsedCiclos) ? parsedCiclos : [],
        feriados: Array.isArray(parsedFeriados) ? parsedFeriados : [],
        tiposVianda: Array.isArray(parsedTipos) ? parsedTipos : [],
      });

      set({
        miViandaClientes: reconciled.clientes,
        miViandaEventos: reconciled.eventos,
        miViandaPeriodos: reconciled.periodos,
        miViandaCiclos: reconciled.ciclos,
        miViandaFeriados: reconciled.feriados,
        miViandaTiposVianda: reconciled.tiposVianda,
        miViandaHydrated: true,
      });

      const changed =
        JSON.stringify(reconciled.clientes) !== JSON.stringify(parsedClientes) ||
        JSON.stringify(reconciled.eventos) !== JSON.stringify(parsedEventos) ||
        JSON.stringify(reconciled.periodos) !== JSON.stringify(parsedPeriodos) ||
        JSON.stringify(reconciled.ciclos) !== JSON.stringify(parsedCiclos);

      if (changed) {
        await persistMiViandaAll(reconciled);
      }
    } catch {
      set({
        miViandaClientes: [],
        miViandaEventos: [],
        miViandaPeriodos: [],
        miViandaCiclos: [],
        miViandaFeriados: [],
        miViandaTiposVianda: [],
        miViandaHydrated: true,
      });
    } finally {
      set({ miViandaHydrating: false });
    }
  },

  addMiViandaClient: async (cliente, pagoInicial) => {
    const state = get();
    const nextEventos = [...state.miViandaEventos];

    if (pagoInicial && isValidIsoDateString(pagoInicial.fecha)) {
      nextEventos.unshift({
        id: createId(),
        clienteId: cliente.id,
        tipo: "pago",
        fecha: pagoInicial.fecha,
        detalle: pagoInicial.detalle?.trim() || "Pago inicial",
      });
    }

    const reconciled = reconcileMiViandaData({
      clientes: [...state.miViandaClientes, cliente],
      eventos: nextEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaFeriados: reconciled.feriados,
      miViandaTiposVianda: reconciled.tiposVianda,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  updateMiViandaClient: async (cliente) => {
    const state = get();
    const nextClientes = state.miViandaClientes.map((c) =>
      c.id === cliente.id ? cliente : c
    );

    const reconciled = reconcileMiViandaData({
      clientes: nextClientes,
      eventos: state.miViandaEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaFeriados: reconciled.feriados,
      miViandaTiposVianda: reconciled.tiposVianda,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  deleteMiViandaClient: async (clienteId) => {
    const state = get();
    const nextClientes = state.miViandaClientes.filter((c) => c.id !== clienteId);
    const nextEventos = state.miViandaEventos.filter((ev) => ev.clienteId !== clienteId);
    const nextPeriodos = state.miViandaPeriodos.filter((p) => p.clienteId !== clienteId);
    const nextCiclos = state.miViandaCiclos.filter((c) => c.clienteId !== clienteId);

    set({
      miViandaClientes: nextClientes,
      miViandaEventos: nextEventos,
      miViandaPeriodos: nextPeriodos,
      miViandaCiclos: nextCiclos,
      miViandaHydrated: true,
    });

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(nextClientes)),
      AsyncStorage.setItem(STORAGE_KEYS.EVENTOS_CLIENTE, JSON.stringify(nextEventos)),
      AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(nextPeriodos)),
      AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(nextCiclos)),
    ]);
  },

  adjustMiViandaClientDays: async (clienteId, delta) => {
    const state = get();
    const target = state.miViandaClientes.find((c) => c.id === clienteId);
    if (!target) return false;

    const diasActuales = getClientCycleDays(target);
    if (diasActuales + delta < 1) {
      return false;
    }

    const nextClientes = state.miViandaClientes.map((c) =>
      c.id === clienteId
        ? { ...c, ajusteDiasPeriodo: (c.ajusteDiasPeriodo ?? 0) + delta }
        : c
    );

    const reconciled = reconcileMiViandaData({
      clientes: nextClientes,
      eventos: state.miViandaEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
    return true;
  },

  resetMiViandaClientAdjustment: async (clienteId) => {
    const state = get();
    const nextClientes = state.miViandaClientes.map((c) =>
      c.id === clienteId
        ? { ...c, ajusteDiasPeriodo: 0, diasReponer: 0, comidasReponer: 0 }
        : c
    );

    const reconciled = reconcileMiViandaData({
      clientes: nextClientes,
      eventos: state.miViandaEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  addMiViandaPayment: async (clienteId, fecha, detalle) => {
    const state = get();
    const pagoEvent: ClientEvent = {
      id: createId(),
      clienteId,
      tipo: "pago",
      fecha,
      detalle: detalle?.trim() || "Pago registrado",
    };

    const reconciled = reconcileMiViandaData({
      clientes: state.miViandaClientes,
      eventos: [pagoEvent, ...state.miViandaEventos],
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
    return pagoEvent;
  },

  updateMiViandaPayment: async (pagoId, nuevaFecha, detalle) => {
    const state = get();
    const nextEventos = state.miViandaEventos.map((ev) =>
      ev.id === pagoId
        ? {
            ...ev,
            fecha: nuevaFecha,
            detalle: detalle !== undefined ? detalle.trim() || "Pago registrado" : ev.detalle,
          }
        : ev
    );

    const reconciled = reconcileMiViandaData({
      clientes: state.miViandaClientes,
      eventos: nextEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  deleteMiViandaPayment: async (pagoId) => {
    const state = get();
    const nextEventos = state.miViandaEventos.filter((ev) => ev.id !== pagoId);

    const reconciled = reconcileMiViandaData({
      clientes: state.miViandaClientes,
      eventos: nextEventos,
      ciclos: state.miViandaCiclos,
      feriados: state.miViandaFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  addMiViandaTipo: async (nombre) => {
    const state = get();
    const nuevo: ViandaTipo = {
      id: createId(),
      nombre: nombre.trim(),
    };
    const nextTipos = [...state.miViandaTiposVianda, nuevo].sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
    set({ miViandaTiposVianda: nextTipos, miViandaHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(nextTipos));
    return nuevo;
  },

  renameMiViandaTipo: async (tipoId, nuevoNombre) => {
    const state = get();
    const trimmed = nuevoNombre.trim();
    const anterior = state.miViandaTiposVianda.find((t) => t.id === tipoId);
    const oldNameLower = anterior?.nombre.toLowerCase();

    const nextTipos = state.miViandaTiposVianda
      .map((t) => (t.id === tipoId ? { ...t, nombre: trimmed } : t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const nextClientes = state.miViandaClientes.map((cliente) => {
      if (!oldNameLower) return cliente;
      let changed = false;
      const merged = new Map<string, { id: string; tipo: string; cantidad: number }>();

      for (const item of cliente.viandas) {
        const isRenamed = item.tipo.trim().toLowerCase() === oldNameLower;
        const targetTipo = isRenamed ? trimmed : item.tipo;
        if (isRenamed) changed = true;

        const key = targetTipo.toLowerCase();
        const existing = merged.get(key);
        if (existing) {
          existing.cantidad += item.cantidad;
          changed = true;
        } else {
          merged.set(key, { ...item, tipo: targetTipo });
        }
      }

      if (!changed) return cliente;
      const viandas = Array.from(merged.values());
      const totalComidas = viandas.reduce((s, v) => s + v.cantidad, 0);
      return { ...cliente, viandas, totalComidas };
    });

    set({
      miViandaTiposVianda: nextTipos,
      miViandaClientes: nextClientes,
      miViandaHydrated: true,
    });
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(nextTipos)),
      AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(nextClientes)),
    ]);
  },

  deleteMiViandaTipo: async (tipoId) => {
    const state = get();
    const nextTipos = state.miViandaTiposVianda.filter((t) => t.id !== tipoId);
    set({ miViandaTiposVianda: nextTipos, miViandaHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(nextTipos));
  },

  addMiViandaHoliday: async (fecha, motivo) => {
    const state = get();
    const nuevo: Holiday = {
      id: createId(),
      fecha,
      motivo: motivo?.trim() ? motivo.trim() : undefined,
    };

    const reconciled = reconcileMiViandaData({
      clientes: state.miViandaClientes,
      eventos: state.miViandaEventos,
      ciclos: state.miViandaCiclos,
      feriados: [...state.miViandaFeriados, nuevo],
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaFeriados: reconciled.feriados,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
    return nuevo;
  },

  deleteMiViandaHoliday: async (feriadoId) => {
    const state = get();
    const nextFeriados = state.miViandaFeriados.filter((f) => f.id !== feriadoId);

    const reconciled = reconcileMiViandaData({
      clientes: state.miViandaClientes,
      eventos: state.miViandaEventos,
      ciclos: state.miViandaCiclos,
      feriados: nextFeriados,
      tiposVianda: state.miViandaTiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaFeriados: reconciled.feriados,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  replaceMiViandaData: async (data) => {
    const reconciled = reconcileMiViandaData({
      clientes: data.clientes,
      eventos: data.eventosCliente,
      ciclos: data.ciclosPagos,
      feriados: data.feriados,
      tiposVianda: data.tiposVianda,
    });

    set({
      miViandaClientes: reconciled.clientes,
      miViandaEventos: reconciled.eventos,
      miViandaPeriodos: reconciled.periodos,
      miViandaCiclos: reconciled.ciclos,
      miViandaFeriados: reconciled.feriados,
      miViandaTiposVianda: reconciled.tiposVianda,
      miViandaHydrated: true,
    });
    await persistMiViandaAll(reconciled);
  },

  clearMiViandaData: async () => {
    set({
      miViandaClientes: [],
      miViandaEventos: [],
      miViandaPeriodos: [],
      miViandaCiclos: [],
      miViandaFeriados: [],
      miViandaTiposVianda: [],
      miViandaHydrated: true,
    });
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.CLIENTES),
      AsyncStorage.removeItem(STORAGE_KEYS.EVENTOS_CLIENTE),
      AsyncStorage.removeItem(STORAGE_KEYS.PERIODOS),
      AsyncStorage.removeItem(STORAGE_KEYS.CICLOS_PAGOS),
      AsyncStorage.removeItem(STORAGE_KEYS.FERIADOS),
      AsyncStorage.removeItem(STORAGE_KEYS.VIANDAS_TIPOS),
    ]);
  },
}));
