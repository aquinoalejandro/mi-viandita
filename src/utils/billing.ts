import { Client, ClientEvent, Holiday, PaymentCycle } from "../types/types";
import { buildMealCalendar, countBusinessDaysBetween } from "./calendar";
import { getTodayString, isValidIsoDateString } from "./date";
import {
  getAvailableDaysFromCycles,
  summarizeCycles,
  groupCyclesByStatus,
  syncCyclesWithPayments,
} from "./cycle";

const COMIDAS_POR_CICLO = 20; // 1 ciclo base = 20 días hábiles
const PROXIMO_COBRO_UMBRAL_DIAS = 2;

export type BillingStatus = {
  estado: "sin-pagos" | "al-dia" | "proximo-cobro" | "deuda";
  restante: number;
  ciclosDeuda: number;
  diasAtraso: number;
};

export type PaymentBalanceSummary = {
  fechaUltimoPago: string;
  fechaPagoAnterior: string | null;
  diasArrastradosDelPagoAnterior: number;
  diasRestantesPagoAnterior: number;
  diasDelPagoActual: number;
  diasRestantesPagoActual: number;
  diasTotalesRestantes: number;
  calendarioDisponible: string[];
  proximoPago: string | null;
};

export type ClientChargeTiming = {
  fechaVencimiento: string | null;
  diasPendientes: number;
  diasAtraso: number;
};

export type ClientBillingSnapshot = {
  status: BillingStatus;
  timing: ClientChargeTiming | null;
  activeCycle: PaymentCycle | null;
  lastCycle: PaymentCycle | null;
  futureCyclesCount: number;
  diasConsumidosCicloActual: number;
  diasTotalesCicloActual: number;
  diasDisponiblesTotales: number;
};

export const getComidasPorCiclo = () => COMIDAS_POR_CICLO;

export const getClientExtraDays = (cliente: Client) => {
  const diasReponer = cliente.diasReponer ?? cliente.comidasReponer ?? 0;
  const ajustePeriodo = cliente.ajusteDiasPeriodo ?? 0;
  return diasReponer + ajustePeriodo;
};

export const getClientCycleStart = (cliente: Client) =>
  cliente.fechaInicioCiclo ?? cliente.ultimoPago ?? null;

export const getClientCycleDays = (cliente: Client) => {
  const diasPagadosAcumulados = cliente.diasPagadosAcumulados ?? COMIDAS_POR_CICLO;
  return Math.max(1, diasPagadosAcumulados + getClientExtraDays(cliente));
};

/**
 * Fuente única de verdad para el estado de cobro y timing de un cliente a partir de sus ciclos.
 */
export const getClientBillingSnapshot = (
  cliente: Client,
  ciclosCliente: PaymentCycle[],
  feriados: Holiday[] = [],
  today = getTodayString()
): ClientBillingSnapshot => {
  const ordenados = [...ciclosCliente]
    .filter((c) => c.clienteId === cliente.id && c.diasHabiles.length > 0)
    .sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  if (ordenados.length === 0) {
    return {
      status: {
        estado: "sin-pagos",
        restante: 0,
        ciclosDeuda: 0,
        diasAtraso: 0,
      },
      timing: null,
      activeCycle: null,
      lastCycle: null,
      futureCyclesCount: 0,
      diasConsumidosCicloActual: 0,
      diasTotalesCicloActual: 0,
      diasDisponiblesTotales: 0,
    };
  }

  const grouped = groupCyclesByStatus(ordenados, today);
  const activeCycle = grouped.activos[0] ?? null;
  const lastCycle = ordenados[ordenados.length - 1];
  const futureCyclesCount = grouped.futuros.length;

  if (today > lastCycle.fechaHasta) {
    const diasAtraso = countBusinessDaysBetween(lastCycle.fechaHasta, today, feriados);
    const ciclosDeuda = Math.max(1, Math.ceil(diasAtraso / COMIDAS_POR_CICLO));
    const diasTotalesCicloActual = lastCycle.diasHabiles.length;

    return {
      status: {
        estado: "deuda",
        restante: 0,
        ciclosDeuda,
        diasAtraso,
      },
      timing: {
        fechaVencimiento: lastCycle.fechaHasta,
        diasPendientes: 0,
        diasAtraso,
      },
      activeCycle: null,
      lastCycle,
      futureCyclesCount: 0,
      diasConsumidosCicloActual: diasTotalesCicloActual + diasAtraso,
      diasTotalesCicloActual,
      diasDisponiblesTotales: 0,
    };
  }

  const diasDisponiblesTotales = getAvailableDaysFromCycles(ordenados, today).length;
  const estado: BillingStatus["estado"] =
    diasDisponiblesTotales <= PROXIMO_COBRO_UMBRAL_DIAS ? "proximo-cobro" : "al-dia";

  const cycleForProgress = activeCycle ?? grouped.futuros[0] ?? lastCycle;
  const diasConsumidosCicloActual = cycleForProgress.diasHabiles.filter((d) => d <= today).length;
  const diasTotalesCicloActual = cycleForProgress.diasHabiles.length;

  return {
    status: {
      estado,
      restante: diasDisponiblesTotales,
      ciclosDeuda: 0,
      diasAtraso: 0,
    },
    timing: {
      fechaVencimiento: lastCycle.fechaHasta,
      diasPendientes: diasDisponiblesTotales,
      diasAtraso: 0,
    },
    activeCycle,
    lastCycle,
    futureCyclesCount,
    diasConsumidosCicloActual,
    diasTotalesCicloActual,
    diasDisponiblesTotales,
  };
};

export const getPaymentBalanceSummary = (
  cliente: Client,
  pagos: ClientEvent[],
  feriados: Holiday[],
  today = getTodayString()
): PaymentBalanceSummary | null => {
  const pagosOrdenados = pagos
    .filter((ev) => ev.tipo === "pago" && isValidIsoDateString(ev.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (pagosOrdenados.length === 0) return null;

  const ultimoPago = pagosOrdenados[pagosOrdenados.length - 1].fecha;
  const pagoAnterior =
    pagosOrdenados.length > 1 ? pagosOrdenados[pagosOrdenados.length - 2].fecha : null;

  const ciclos = syncCyclesWithPayments(
    cliente.id,
    pagosOrdenados,
    [],
    feriados,
    today,
    getClientExtraDays(cliente)
  );
  const snapshot = getClientBillingSnapshot(cliente, ciclos, feriados, today);
  const calendarioDisponible = getAvailableDaysFromCycles(ciclos, today);
  const diasDelPagoActual = snapshot.diasTotalesCicloActual || getClientCycleDays(cliente);
  const diasRestantesPagoActual = snapshot.diasDisponiblesTotales;

  return {
    fechaUltimoPago: ultimoPago,
    fechaPagoAnterior: pagoAnterior,
    diasArrastradosDelPagoAnterior: 0,
    diasRestantesPagoAnterior: 0,
    diasDelPagoActual,
    diasRestantesPagoActual,
    diasTotalesRestantes: diasRestantesPagoActual,
    calendarioDisponible,
    proximoPago: snapshot.timing?.fechaVencimiento ?? null,
  };
};

export const getClientChargeTiming = (
  cliente: Client,
  feriados: Holiday[],
  today = getTodayString(),
  ciclosCliente?: PaymentCycle[]
): ClientChargeTiming | null => {
  if (ciclosCliente) {
    return getClientBillingSnapshot(cliente, ciclosCliente, feriados, today).timing;
  }

  const fechaInicioCiclo = getClientCycleStart(cliente);
  if (!fechaInicioCiclo || !isValidIsoDateString(fechaInicioCiclo)) return null;

  const totalCiclo = getClientCycleDays(cliente);
  const calendario = buildMealCalendar(fechaInicioCiclo, totalCiclo, feriados);
  const fechaVencimiento =
    calendario.length > 0 ? calendario[calendario.length - 1] : null;

  if (!fechaVencimiento) {
    return { fechaVencimiento: null, diasPendientes: 0, diasAtraso: 0 };
  }

  return {
    fechaVencimiento,
    diasPendientes:
      fechaVencimiento >= today ? countBusinessDaysBetween(today, fechaVencimiento, feriados) : 0,
    diasAtraso:
      fechaVencimiento < today ? countBusinessDaysBetween(fechaVencimiento, today, feriados) : 0,
  };
};

export const getBillingStatus = (
  cliente: Client,
  ciclosCliente?: PaymentCycle[],
  feriados: Holiday[] = [],
  today = getTodayString()
): BillingStatus => {
  if (ciclosCliente) {
    return getClientBillingSnapshot(cliente, ciclosCliente, feriados, today).status;
  }

  if (!cliente.ultimoPago) {
    return {
      estado: "sin-pagos",
      restante: 0,
      ciclosDeuda: 0,
      diasAtraso: 0,
    };
  }

  const diasConsumidos = cliente.diasConsumidosEnPeriodo;
  const diasPorCiclo = getClientCycleDays(cliente);

  if (diasConsumidos > diasPorCiclo) {
    const diasAtraso = diasConsumidos - diasPorCiclo;
    const ciclosDeuda = Math.max(1, Math.ceil(diasAtraso / COMIDAS_POR_CICLO));
    return {
      estado: "deuda",
      restante: 0,
      ciclosDeuda,
      diasAtraso,
    };
  }

  const restante = Math.max(0, diasPorCiclo - diasConsumidos);
  if (restante <= PROXIMO_COBRO_UMBRAL_DIAS) {
    return { estado: "proximo-cobro", restante, ciclosDeuda: 0, diasAtraso: 0 };
  }

  return { estado: "al-dia", restante, ciclosDeuda: 0, diasAtraso: 0 };
};

export const recalcularEstadoCliente = (
  cliente: Client,
  eventos: ClientEvent[],
  feriados: Holiday[] = [],
  today = getTodayString(),
  ciclosCliente?: PaymentCycle[]
): Client => {
  const pagosCliente = eventos
    .filter(
      (ev) =>
        ev.clienteId === cliente.id &&
        ev.tipo === "pago" &&
        isValidIsoDateString(ev.fecha)
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const ultimoPago = pagosCliente.length > 0 ? pagosCliente[pagosCliente.length - 1].fecha : undefined;
  const totalComidas = (cliente.viandas ?? []).reduce((s, v) => s + (v.cantidad ?? 0), 0);
  const extraDays = getClientExtraDays(cliente);

  const ciclos =
    ciclosCliente ??
    syncCyclesWithPayments(cliente.id, pagosCliente, [], feriados, today, extraDays);

  if (ciclos.length === 0) {
    return {
      ...cliente,
      ultimoPago: undefined,
      fechaInicioCiclo: undefined,
      totalComidas,
      diasConsumidosEnPeriodo: 0,
      comidasReponer: cliente.comidasReponer ?? 0,
      diasPagadosAcumulados: COMIDAS_POR_CICLO,
    };
  }

  const snapshot = getClientBillingSnapshot(cliente, ciclos, feriados, today);
  const grouped = groupCyclesByStatus(ciclos, today);

  let fechaInicioCiclo: string;
  let diasPagadosAcumulados: number;
  let diasConsumidosEnPeriodo: number;

  if (snapshot.status.estado === "deuda" && snapshot.lastCycle) {
    fechaInicioCiclo = snapshot.lastCycle.fechaDesde;
    diasPagadosAcumulados = Math.max(1, snapshot.lastCycle.diasHabiles.length - extraDays);
    diasConsumidosEnPeriodo = snapshot.lastCycle.diasHabiles.length + snapshot.status.diasAtraso;
  } else {
    const ciclosVigentes =
      grouped.activos.length > 0
        ? [...grouped.activos, ...grouped.futuros]
        : grouped.futuros;
    const primerVigente = ciclosVigentes[0] ?? snapshot.lastCycle!;
    const totalDiasVigentes = ciclosVigentes.reduce((sum, c) => sum + c.diasHabiles.length, 0);

    fechaInicioCiclo = primerVigente.fechaDesde;
    diasPagadosAcumulados = Math.max(1, totalDiasVigentes - extraDays);
    diasConsumidosEnPeriodo = Math.max(0, totalDiasVigentes - snapshot.diasDisponiblesTotales);
  }

  return {
    ...cliente,
    ultimoPago,
    fechaInicioCiclo,
    totalComidas,
    diasConsumidosEnPeriodo,
    comidasReponer: cliente.comidasReponer ?? 0,
    diasPagadosAcumulados,
  };
};

export const compareClientsByUpcomingCharge = (
  a: Client,
  b: Client,
  ciclosByClient?: Map<string, PaymentCycle[]>,
  feriados: Holiday[] = [],
  today = getTodayString()
): number => {
  const statusA = getBillingStatus(a, ciclosByClient?.get(a.id), feriados, today);
  const statusB = getBillingStatus(b, ciclosByClient?.get(b.id), feriados, today);

  const getPriority = (status: BillingStatus) => {
    if (status.estado === "deuda") return 0;
    if (status.estado === "proximo-cobro") return 1;
    if (status.estado === "al-dia") return 2;
    return 3; // sin-pagos
  };

  const priorityDiff = getPriority(statusA) - getPriority(statusB);
  if (priorityDiff !== 0) return priorityDiff;

  if (statusA.estado === "deuda" && statusB.estado === "deuda") {
    if (statusA.diasAtraso !== statusB.diasAtraso) {
      return statusB.diasAtraso - statusA.diasAtraso;
    }
    if (statusA.ciclosDeuda !== statusB.ciclosDeuda) {
      return statusB.ciclosDeuda - statusA.ciclosDeuda;
    }
  }

  if (
    (statusA.estado === "proximo-cobro" || statusA.estado === "al-dia") &&
    statusA.restante !== statusB.restante
  ) {
    return statusA.restante - statusB.restante;
  }

  return a.nombre.localeCompare(b.nombre);
};

export const formatBillingMessage = (
  cliente: Client,
  ciclosCliente?: PaymentCycle[],
  feriados: Holiday[] = [],
  today = getTodayString()
): string => {
  const status = getBillingStatus(cliente, ciclosCliente, feriados, today);

  if (status.estado === "sin-pagos") {
    return "Sin pagos registrados. El ciclo comienza con el primer pago.";
  }

  if (status.estado === "deuda") {
    return `Deuda de ${status.ciclosDeuda} ciclo(s) (${status.diasAtraso} día(s) hábiles de atraso).`;
  }

  if (status.estado === "proximo-cobro") {
    if (status.restante === 0) {
      return "Vence hoy: corresponde el próximo cobro.";
    }
    return `Próximo cobro: quedan ${status.restante} día(s) hábiles.`;
  }

  return `Al día. Quedan ${status.restante} día(s) hábiles disponibles.`;
};

// ============================================================================
// FUNCIONES BASADAS EN ARQUITECTURA DE CICLOS PERSISTIDOS
// ============================================================================

export type PaymentBalanceSummaryWithCycles = {
  clienteId: string;
  fechaActual: string;
  ciclosSummary: ReturnType<typeof summarizeCycles>;
  diasDisponibles: string[];
  diasDisponiblesTotal: number;
  proximoVencimiento: string | null;
  estado: "sin-pagos" | "al-dia" | "proximo-vencimiento" | "vencido";
};

export const getPaymentBalanceSummaryWithCycles = (
  clienteId: string,
  ciclos: PaymentCycle[],
  today = getTodayString(),
  feriados: Holiday[] = []
): PaymentBalanceSummaryWithCycles | null => {
  if (ciclos.length === 0) return null;

  const summary = summarizeCycles(ciclos, today);
  const diasDisponibles = getAvailableDaysFromCycles(ciclos, today);
  const status = getBillingStatusFromCycles(ciclos, today, feriados);

  let estado: PaymentBalanceSummaryWithCycles["estado"] = "al-dia";
  if (status.estado === "sin-pagos") {
    estado = "sin-pagos";
  } else if (status.estado === "deuda") {
    estado = "vencido";
  } else if (status.estado === "proximo-cobro") {
    estado = "proximo-vencimiento";
  }

  return {
    clienteId,
    fechaActual: today,
    ciclosSummary: summary,
    diasDisponibles,
    diasDisponiblesTotal: diasDisponibles.length,
    proximoVencimiento: summary.proximoVencimiento,
    estado,
  };
};

export const synchronizeClientCycles = (
  clienteId: string,
  pagos: ClientEvent[],
  ciclosExistentes: PaymentCycle[],
  feriados: Holiday[] = [],
  today = getTodayString(),
  extraDaysLastCycle = 0
): PaymentCycle[] =>
  syncCyclesWithPayments(
    clienteId,
    pagos,
    ciclosExistentes,
    feriados,
    today,
    extraDaysLastCycle
  );

export const getClientChargeTimingFromCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString(),
  feriados: Holiday[] = []
): ClientChargeTiming | null => {
  if (ciclos.length === 0) return null;

  const ordenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));
  const ultimoCiclo = ordenados[ordenados.length - 1];

  if (today > ultimoCiclo.fechaHasta) {
    return {
      fechaVencimiento: ultimoCiclo.fechaHasta,
      diasPendientes: 0,
      diasAtraso: countBusinessDaysBetween(ultimoCiclo.fechaHasta, today, feriados),
    };
  }

  return {
    fechaVencimiento: ultimoCiclo.fechaHasta,
    diasPendientes: getAvailableDaysFromCycles(ordenados, today).length,
    diasAtraso: 0,
  };
};

export const getBillingStatusFromCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString(),
  feriados: Holiday[] = []
): BillingStatus => {
  if (ciclos.length === 0) {
    return {
      estado: "sin-pagos",
      restante: 0,
      ciclosDeuda: 0,
      diasAtraso: 0,
    };
  }

  const ordenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));
  const ultimoCiclo = ordenados[ordenados.length - 1];

  if (today > ultimoCiclo.fechaHasta) {
    const diasAtraso = countBusinessDaysBetween(ultimoCiclo.fechaHasta, today, feriados);
    return {
      estado: "deuda",
      restante: 0,
      ciclosDeuda: Math.max(1, Math.ceil(diasAtraso / COMIDAS_POR_CICLO)),
      diasAtraso,
    };
  }

  const diasRestantes = getAvailableDaysFromCycles(ordenados, today).length;
  return {
    estado: diasRestantes <= PROXIMO_COBRO_UMBRAL_DIAS ? "proximo-cobro" : "al-dia",
    restante: diasRestantes,
    ciclosDeuda: 0,
    diasAtraso: 0,
  };
};

export const formatBillingMessageFromCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString(),
  feriados: Holiday[] = []
): string => {
  const status = getBillingStatusFromCycles(ciclos, today, feriados);

  if (status.estado === "sin-pagos") {
    return "Sin ciclos activos.";
  }

  if (status.estado === "deuda") {
    return `Deuda de ${status.ciclosDeuda} ciclo(s) (${status.diasAtraso} día(s) de atraso).`;
  }

  if (status.estado === "proximo-cobro") {
    if (status.restante === 0) {
      return "Vence hoy: corresponde el próximo cobro.";
    }
    return `Próximo cobro: quedan ${status.restante} día(s) hábiles.`;
  }

  return `Al día. Quedan ${status.restante} día(s) hábiles.`;
};
