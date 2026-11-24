/**
 * Gestión de ciclos de pago de 20 días hábiles
 */

import { ClientEvent, Holiday, PaymentCycle, Period } from "../types/types";
import {
  buildMealCalendar,
  getNextBusinessDay,
  listBusinessDaysBetween,
  normalizeBusinessDay,
} from "./calendar";
import { getTodayString, isValidIsoDateString } from "./date";

const COMIDAS_POR_CICLO = 20;
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type CalendarDayState = {
  fecha: string;
  estado: "vencido" | "disponible" | "consumido" | "futuro";
  cicloId: string;
  indicePorConsumir: number;
};

/**
 * Crea un nuevo ciclo a partir de un evento de pago.
 */
export const createPaymentCycle = (
  pagoId: string,
  clienteId: string,
  fechaDesde: string,
  feriados: Holiday[] = [],
  diasCantidad = COMIDAS_POR_CICLO
): PaymentCycle => {
  const diasHabiles = buildMealCalendar(fechaDesde, Math.max(1, diasCantidad), feriados);
  const fechaHasta = diasHabiles[diasHabiles.length - 1] || fechaDesde;

  return {
    id: createId(),
    clienteId,
    pagoId,
    fechaDesde,
    fechaHasta,
    diasHabiles,
    diasConsumidos: 0,
    estado: "futuro",
    creadoEn: new Date().toISOString(),
  };
};

/**
 * Determina el estado de un ciclo relativo a hoy.
 */
export const determineCycleStatus = (
  ciclo: Pick<PaymentCycle, "fechaDesde" | "fechaHasta">,
  today = getTodayString()
): "completado" | "activo" | "futuro" => {
  if (ciclo.fechaHasta < today) {
    return "completado";
  }
  if (ciclo.fechaDesde <= today && today <= ciclo.fechaHasta) {
    return "activo";
  }
  return "futuro";
};

/**
 * Filtra y agrupa ciclos por estado relativo a hoy.
 */
export const groupCyclesByStatus = (ciclos: PaymentCycle[], today = getTodayString()) => {
  const ordenados = [...ciclos]
    .sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde))
    .map((c) => ({
      ...c,
      estado: determineCycleStatus(c, today),
    }));

  return {
    completados: ordenados.filter((c) => c.estado === "completado"),
    activos: ordenados.filter((c) => c.estado === "activo"),
    futuros: ordenados.filter((c) => c.estado === "futuro"),
  };
};

/**
 * Obtiene los días hábiles pendientes (estrictamente posteriores a hoy) de todos los ciclos.
 * Coherente con diasConsumidos (que cuenta los días <= hoy).
 */
export const getAvailableDaysFromCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString()
): string[] => {
  const conjunto = new Set<string>();

  const ciclosOrdenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));
  for (const ciclo of ciclosOrdenados) {
    for (const dia of ciclo.diasHabiles) {
      if (dia > today) {
        conjunto.add(dia);
      }
    }
  }

  return Array.from(conjunto).sort();
};

/**
 * Obtiene los días hábiles cubiertos desde hoy inclusive (hoy + futuros).
 */
export const getCoveredDaysFromToday = (
  ciclos: PaymentCycle[],
  today = getTodayString()
): string[] => {
  const conjunto = new Set<string>();
  const ciclosOrdenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  for (const ciclo of ciclosOrdenados) {
    for (const dia of ciclo.diasHabiles) {
      if (dia >= today) {
        conjunto.add(dia);
      }
    }
  }

  return Array.from(conjunto).sort();
};

/**
 * Obtiene todos los días hábiles de ciclos para renderizar en calendario,
 * incluyendo días hábiles vencidos sin cubrir después del último ciclo.
 */
export const getCalendarDayStates = (
  ciclos: PaymentCycle[],
  today = getTodayString(),
  feriados: Holiday[] = []
): Map<string, CalendarDayState> => {
  const mapa = new Map<string, CalendarDayState>();

  const ciclosOrdenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  for (const ciclo of ciclosOrdenados) {
    const cycleStatus = determineCycleStatus(ciclo, today);

    for (let idx = 0; idx < ciclo.diasHabiles.length; idx++) {
      const dia = ciclo.diasHabiles[idx];
      if (mapa.has(dia)) continue;

      let estado: CalendarDayState["estado"];
      if (cycleStatus === "completado") {
        estado = "consumido";
      } else if (cycleStatus === "futuro") {
        estado = "futuro";
      } else {
        estado = dia < today ? "consumido" : "disponible";
      }

      mapa.set(dia, {
        fecha: dia,
        estado,
        cicloId: ciclo.id,
        indicePorConsumir: idx,
      });
    }
  }

  if (ciclosOrdenados.length > 0) {
    const ultimoCiclo = ciclosOrdenados[ciclosOrdenados.length - 1];
    if (ultimoCiclo.fechaHasta < today) {
      const diasVencidos = listBusinessDaysBetween(ultimoCiclo.fechaHasta, today, feriados);
      diasVencidos.forEach((dia, idx) => {
        if (!mapa.has(dia)) {
          mapa.set(dia, {
            fecha: dia,
            estado: "vencido",
            cicloId: ultimoCiclo.id,
            indicePorConsumir: idx,
          });
        }
      });
    }
  }

  return mapa;
};

/**
 * Cuenta los días hábiles disponibles (posteriores a hoy).
 */
export const countAvailableDays = (ciclos: PaymentCycle[], today = getTodayString()): number =>
  getAvailableDaysFromCycles(ciclos, today).length;

/**
 * Cuenta los días hábiles consumidos de todos los ciclos (calculado relativo a today).
 */
export const countConsumedDays = (ciclos: PaymentCycle[], today = getTodayString()): number =>
  ciclos.reduce(
    (sum, c) => sum + c.diasHabiles.filter((d) => d <= today).length,
    0
  );

/**
 * Marca días como consumidos en un ciclo.
 */
export const consumeDaysFromCycle = (
  ciclo: PaymentCycle,
  cantidadDias: number
): PaymentCycle => {
  const diasDisponibles = Math.max(0, ciclo.diasHabiles.length - ciclo.diasConsumidos);
  const nuevosConsumidos = Math.min(Math.max(0, cantidadDias), diasDisponibles);

  return {
    ...ciclo,
    diasConsumidos: ciclo.diasConsumidos + nuevosConsumidos,
  };
};

export type CyclesSummary = {
  totalCiclos: number;
  ciclosCompletados: number;
  ciclosActivos: number;
  ciclosFuturos: number;
  diasTotalHabiles: number;
  diasTotalConsumidos: number;
  diasTotalDisponibles: number;
  finCicloActivo: string | null;
  proximoVencimiento: string | null;
};

export const summarizeCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString()
): CyclesSummary => {
  const grouped = groupCyclesByStatus(ciclos, today);
  const disponibles = getAvailableDaysFromCycles(ciclos, today);
  const consumidos = countConsumedDays(ciclos, today);

  const finCicloActivo =
    grouped.activos.length > 0 ? grouped.activos[0].fechaHasta : null;

  const vigentesOFuturos = [...grouped.activos, ...grouped.futuros].sort((a, b) =>
    a.fechaHasta.localeCompare(b.fechaHasta)
  );
  const proximoVencimiento =
    vigentesOFuturos.length > 0
      ? vigentesOFuturos[vigentesOFuturos.length - 1].fechaHasta
      : null;

  return {
    totalCiclos: ciclos.length,
    ciclosCompletados: grouped.completados.length,
    ciclosActivos: grouped.activos.length,
    ciclosFuturos: grouped.futuros.length,
    diasTotalHabiles: ciclos.reduce((sum, c) => sum + c.diasHabiles.length, 0),
    diasTotalConsumidos: consumidos,
    diasTotalDisponibles: disponibles.length,
    finCicloActivo,
    proximoVencimiento,
  };
};

/**
 * Genera y sincroniza ciclos para todos los pagos de un cliente
 * de forma ordenada y encadenada, aplicando ajustes extra al último ciclo.
 */
export const syncCyclesWithPayments = (
  clienteId: string,
  pagos: ClientEvent[],
  ciclosExistentes: PaymentCycle[],
  feriados: Holiday[] = [],
  today = getTodayString(),
  extraDaysLastCycle = 0
): PaymentCycle[] => {
  const pagosCliente = pagos
    .filter(
      (pago) =>
        pago.clienteId === clienteId &&
        pago.tipo === "pago" &&
        isValidIsoDateString(pago.fecha)
    )
    .sort((a, b) => {
      const dateDiff = a.fecha.localeCompare(b.fecha);
      return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
    });

  if (pagosCliente.length === 0) {
    return [];
  }

  const ciclosMap = new Map(
    ciclosExistentes
      .filter((c) => c.clienteId === clienteId)
      .map((c) => [c.pagoId, c])
  );

  const ciclosGenerados: PaymentCycle[] = [];

  for (let i = 0; i < pagosCliente.length; i++) {
    const pago = pagosCliente[i];
    const cicloPrevio = i > 0 ? ciclosGenerados[i - 1] : null;
    const isLast = i === pagosCliente.length - 1;
    const cycleLength = isLast
      ? Math.max(1, COMIDAS_POR_CICLO + extraDaysLastCycle)
      : COMIDAS_POR_CICLO;

    let fechaDesde: string;
    if (cicloPrevio && pago.fecha <= cicloPrevio.fechaHasta) {
      fechaDesde = getNextBusinessDay(cicloPrevio.fechaHasta, feriados);
    } else {
      fechaDesde = normalizeBusinessDay(pago.fecha, feriados);
    }

    const diasHabiles = buildMealCalendar(fechaDesde, cycleLength, feriados);
    const fechaHasta = diasHabiles[diasHabiles.length - 1] || fechaDesde;

    let diasConsumidos = 0;
    if (fechaHasta < today) {
      diasConsumidos = diasHabiles.length;
    } else if (fechaDesde <= today && today <= fechaHasta) {
      diasConsumidos = diasHabiles.filter((d) => d <= today).length;
    }

    const estado = determineCycleStatus({ fechaDesde, fechaHasta }, today);
    const cicloExistente = ciclosMap.get(pago.id);

    ciclosGenerados.push({
      id: cicloExistente?.id || createId(),
      clienteId,
      pagoId: pago.id,
      fechaDesde,
      fechaHasta,
      diasHabiles,
      diasConsumidos,
      estado,
      creadoEn: cicloExistente?.creadoEn || new Date().toISOString(),
    });
  }

  return ciclosGenerados;
};

/**
 * Construye los períodos persistidos a partir de los ciclos encadenados para que
 * Estadísticas, Cobros y Respaldo nunca diverjan.
 */
export const buildPeriodsFromCycles = (
  clienteId: string,
  ciclos: PaymentCycle[],
  feriados: Holiday[] = []
): Period[] => {
  const ordenados = [...ciclos]
    .filter((c) => c.clienteId === clienteId)
    .sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  if (ordenados.length === 0) return [];

  const periodos: Period[] = ordenados.map((ciclo) => ({
    id: `period-${ciclo.id}`,
    clienteId,
    tipo: "periodo",
    estado: "pagado",
    inicio: ciclo.fechaDesde,
    fin: ciclo.fechaHasta,
    pagoId: ciclo.pagoId,
    detalle: "Período pagado",
  }));

  const ultimo = ordenados[ordenados.length - 1];
  const siguienteInicio = getNextBusinessDay(ultimo.fechaHasta, feriados);
  const diasProyectados = buildMealCalendar(siguienteInicio, COMIDAS_POR_CICLO, feriados);
  const siguienteFin = diasProyectados[diasProyectados.length - 1] ?? siguienteInicio;

  periodos.push({
    id: `period-next-${ultimo.id}`,
    clienteId,
    tipo: "periodo",
    estado: "impago",
    inicio: siguienteInicio,
    fin: siguienteFin,
    detalle: "Período pendiente",
  });

  return periodos;
};

/**
 * Valida que los ciclos sean coherentes.
 */
export const validateCycles = (ciclos: PaymentCycle[]): string[] => {
  const errores: string[] = [];
  if (ciclos.length === 0) return errores;

  for (const ciclo of ciclos) {
    if (ciclo.diasHabiles.length < 1) {
      errores.push(`Ciclo ${ciclo.id} no tiene días hábiles`);
    }
    if (ciclo.diasConsumidos > ciclo.diasHabiles.length) {
      errores.push(`Ciclo ${ciclo.id}: diasConsumidos (${ciclo.diasConsumidos}) excede el total`);
    }
    if (ciclo.diasHabiles[0] !== ciclo.fechaDesde) {
      errores.push(`Ciclo ${ciclo.id}: fechaDesde inconsistente`);
    }
    if (ciclo.diasHabiles[ciclo.diasHabiles.length - 1] !== ciclo.fechaHasta) {
      errores.push(`Ciclo ${ciclo.id}: fechaHasta inconsistente`);
    }
  }

  return errores;
};
