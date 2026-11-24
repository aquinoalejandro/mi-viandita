import type {
  Client,
  ClientEvent,
  ExpenseCategory,
  ExpenseRecord,
  Holiday,
  MealSelection,
  PaymentCycle,
  Period,
  ViandaTipo,
} from "../types/types";
import { getTodayString, isValidIsoDateString } from "./date";

export type MiViandaBackupData = {
  version: number;
  exportadoEn: string;
  clientes: Client[];
  eventosCliente: ClientEvent[];
  periodos: Period[];
  feriados: Holiday[];
  tiposVianda: ViandaTipo[];
  ciclosPagos: PaymentCycle[];
};

export type MisGastosBackupData = {
  categorias: ExpenseCategory[];
  gastos: ExpenseRecord[];
};

export type DetectedBackup =
  | { kind: "mivianda"; data: MiViandaBackupData }
  | { kind: "misgastos"; data: MisGastosBackupData }
  | { kind: "invalid"; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeViandas = (raw: unknown): MealSelection[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((item, idx) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `v-${idx}-${Date.now()}`,
      tipo: typeof item.tipo === "string" ? item.tipo.trim() : "",
      cantidad:
        typeof item.cantidad === "number" && Number.isFinite(item.cantidad) && item.cantidad > 0
          ? Math.floor(item.cantidad)
          : 1,
    }))
    .filter((item) => item.tipo.length > 0);
};

const sanitizeClient = (raw: unknown): Client | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.nombre !== "string" || !raw.nombre.trim()) return null;

  return {
    id: raw.id,
    nombre: raw.nombre.trim(),
    viandas: sanitizeViandas(raw.viandas),
    detalleEspecifico:
      typeof raw.detalleEspecifico === "string" && raw.detalleEspecifico.trim()
        ? raw.detalleEspecifico.trim()
        : undefined,
    direccion:
      typeof raw.direccion === "string" && raw.direccion.trim() ? raw.direccion.trim() : undefined,
    telefono:
      typeof raw.telefono === "string" && raw.telefono.trim() ? raw.telefono.trim() : undefined,
    creadoEn:
      typeof raw.creadoEn === "string" && raw.creadoEn.trim()
        ? raw.creadoEn
        : getTodayString(),
    diasPagadosAcumulados:
      typeof raw.diasPagadosAcumulados === "number" && Number.isFinite(raw.diasPagadosAcumulados)
        ? raw.diasPagadosAcumulados
        : undefined,
    diasConsumidosEnPeriodo:
      typeof raw.diasConsumidosEnPeriodo === "number" &&
      Number.isFinite(raw.diasConsumidosEnPeriodo)
        ? raw.diasConsumidosEnPeriodo
        : 0,
    diasReponer:
      typeof raw.diasReponer === "number" && Number.isFinite(raw.diasReponer)
        ? raw.diasReponer
        : undefined,
    ajusteDiasPeriodo:
      typeof raw.ajusteDiasPeriodo === "number" && Number.isFinite(raw.ajusteDiasPeriodo)
        ? raw.ajusteDiasPeriodo
        : 0,
    ultimoPago:
      typeof raw.ultimoPago === "string" && isValidIsoDateString(raw.ultimoPago)
        ? raw.ultimoPago
        : undefined,
    fechaInicioCiclo:
      typeof raw.fechaInicioCiclo === "string" && isValidIsoDateString(raw.fechaInicioCiclo)
        ? raw.fechaInicioCiclo
        : undefined,
    totalComidas:
      typeof raw.totalComidas === "number" && Number.isFinite(raw.totalComidas)
        ? raw.totalComidas
        : undefined,
    comidasReponer:
      typeof raw.comidasReponer === "number" && Number.isFinite(raw.comidasReponer)
        ? raw.comidasReponer
        : 0,
  };
};

const sanitizeClientEvent = (raw: unknown): ClientEvent | null => {
  if (!isRecord(raw)) return null;
  if (raw.tipo !== "pago") return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.clienteId !== "string" || !raw.clienteId.trim()) return null;
  if (typeof raw.fecha !== "string" || !isValidIsoDateString(raw.fecha)) return null;

  return {
    id: raw.id,
    clienteId: raw.clienteId,
    tipo: "pago",
    fecha: raw.fecha,
    detalle:
      typeof raw.detalle === "string" && raw.detalle.trim() ? raw.detalle.trim() : undefined,
  };
};

const sanitizeHoliday = (raw: unknown): Holiday | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.fecha !== "string" || !isValidIsoDateString(raw.fecha)) return null;

  return {
    id: raw.id,
    fecha: raw.fecha,
    motivo: typeof raw.motivo === "string" && raw.motivo.trim() ? raw.motivo.trim() : undefined,
  };
};

const sanitizeViandaTipo = (raw: unknown): ViandaTipo | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.nombre !== "string" || !raw.nombre.trim()) return null;

  return {
    id: raw.id,
    nombre: raw.nombre.trim(),
  };
};

const sanitizeExpenseCategory = (raw: unknown): ExpenseCategory | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.nombre !== "string" || !raw.nombre.trim()) return null;

  return {
    id: raw.id,
    nombre: raw.nombre.trim(),
    icono: typeof raw.icono === "string" && raw.icono.trim() ? raw.icono : undefined,
    color: typeof raw.color === "string" && raw.color.trim() ? raw.color : undefined,
    creadoEn:
      typeof raw.creadoEn === "string" && raw.creadoEn.trim()
        ? raw.creadoEn
        : new Date().toISOString(),
  };
};

const sanitizeExpenseRecord = (raw: unknown): ExpenseRecord | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.categoriaId !== "string" || !raw.categoriaId.trim()) return null;
  if (typeof raw.monto !== "number" || !Number.isFinite(raw.monto) || raw.monto <= 0) return null;
  if (typeof raw.fecha !== "string" || Number.isNaN(new Date(raw.fecha).getTime())) return null;

  const nowIso = new Date().toISOString();
  return {
    id: raw.id,
    categoriaId: raw.categoriaId,
    monto: Math.round(raw.monto * 100) / 100,
    fecha: new Date(raw.fecha).toISOString(),
    referencia:
      typeof raw.referencia === "string" && raw.referencia.trim()
        ? raw.referencia.trim()
        : undefined,
    creadoEn:
      typeof raw.creadoEn === "string" && raw.creadoEn.trim() ? raw.creadoEn : nowIso,
    actualizadoEn:
      typeof raw.actualizadoEn === "string" && raw.actualizadoEn.trim()
        ? raw.actualizadoEn
        : nowIso,
  };
};

export const parseMiViandaBackup = (rawContent: string): MiViandaBackupData => {
  const parsed: unknown = JSON.parse(rawContent);
  if (!isRecord(parsed)) {
    throw new Error("El archivo no tiene un formato JSON de respaldo válido.");
  }

  const hasMiViandaKeys =
    Array.isArray(parsed.clientes) ||
    Array.isArray(parsed.eventosCliente) ||
    Array.isArray(parsed.tiposVianda) ||
    Array.isArray(parsed.feriados);

  if (!hasMiViandaKeys) {
    throw new Error("El archivo no corresponde a un respaldo de MiVianda.");
  }

  const clientes = Array.isArray(parsed.clientes)
    ? parsed.clientes.map(sanitizeClient).filter((c): c is Client => c !== null)
    : [];
  const eventosCliente = Array.isArray(parsed.eventosCliente)
    ? parsed.eventosCliente
        .map(sanitizeClientEvent)
        .filter((ev): ev is ClientEvent => ev !== null)
    : [];
  const feriados = Array.isArray(parsed.feriados)
    ? parsed.feriados.map(sanitizeHoliday).filter((f): f is Holiday => f !== null)
    : [];
  const tiposVianda = Array.isArray(parsed.tiposVianda)
    ? parsed.tiposVianda.map(sanitizeViandaTipo).filter((t): t is ViandaTipo => t !== null)
    : [];

  return {
    version: typeof parsed.version === "number" ? parsed.version : 2,
    exportadoEn:
      typeof parsed.exportadoEn === "string" ? parsed.exportadoEn : new Date().toISOString(),
    clientes,
    eventosCliente,
    periodos: Array.isArray(parsed.periodos) ? (parsed.periodos as Period[]) : [],
    feriados,
    tiposVianda,
    ciclosPagos: Array.isArray(parsed.ciclosPagos) ? (parsed.ciclosPagos as PaymentCycle[]) : [],
  };
};

export const parseMisGastosBackup = (rawContent: string): MisGastosBackupData => {
  const parsed: unknown = JSON.parse(rawContent);
  if (!isRecord(parsed)) {
    throw new Error("El archivo no tiene un formato JSON de respaldo válido.");
  }

  if (!Array.isArray(parsed.categorias) || !Array.isArray(parsed.gastos)) {
    throw new Error("El archivo no corresponde a un respaldo de MisGastos.");
  }

  const categorias = parsed.categorias
    .map(sanitizeExpenseCategory)
    .filter((c): c is ExpenseCategory => c !== null);
  const gastos = parsed.gastos
    .map(sanitizeExpenseRecord)
    .filter((g): g is ExpenseRecord => g !== null);

  return { categorias, gastos };
};

export const detectSharedBackup = (rawContent: string): DetectedBackup => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return { kind: "invalid", reason: "El archivo compartido no es un JSON válido." };
  }

  if (!isRecord(parsed)) {
    return { kind: "invalid", reason: "El archivo compartido no contiene un objeto de respaldo." };
  }

  if (Array.isArray(parsed.categorias) && Array.isArray(parsed.gastos)) {
    return { kind: "misgastos", data: parseMisGastosBackup(rawContent) };
  }

  if (
    Array.isArray(parsed.clientes) ||
    Array.isArray(parsed.eventosCliente) ||
    Array.isArray(parsed.tiposVianda) ||
    Array.isArray(parsed.feriados)
  ) {
    return { kind: "mivianda", data: parseMiViandaBackup(rawContent) };
  }

  return {
    kind: "invalid",
    reason: "El archivo no coincide con un respaldo de MiVianda ni de MisGastos.",
  };
};
