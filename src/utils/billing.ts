import { Client, ClientEvent, Holiday, PaymentCycle } from "../types/types";
import { buildMealCalendar, countBusinessDaysBetween } from "./calendar";
import { getTodayString } from "./date";
import {
  getAvailableDaysFromCycles,
  summarizeCycles,
  groupCyclesByStatus,
  syncCyclesWithPayments,
} from "./cycle";

const COMIDAS_POR_CICLO = 20; // 1 mes = 20 días

export type BillingStatus = {
  estado: "al-dia" | "proximo-cobro" | "deuda";
  restante: number;
  ciclosDeuda: number;
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

export const getComidasPorCiclo = () => COMIDAS_POR_CICLO;

export const getClientCycleStart = (cliente: Client) => {
  return cliente.fechaInicioCiclo ?? cliente.ultimoPago ?? null;
};

export const getClientCycleDays = (cliente: Client) => {
  const diasPagadosAcumulados = cliente.diasPagadosAcumulados ?? COMIDAS_POR_CICLO;
  const ajustePeriodo = cliente.ajusteDiasPeriodo ?? 0;
  return Math.max(1, diasPagadosAcumulados + (cliente.diasReponer ?? 0) + ajustePeriodo);
};

export const getPaymentBalanceSummary = (
  cliente: Client,
  pagos: ClientEvent[],
  feriados: Holiday[],
  today = getTodayString()
): PaymentBalanceSummary | null => {
  // Solo consideramos pagos
  const pagosOrdenados = pagos
    .filter((ev) => ev.tipo === "pago")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (pagosOrdenados.length === 0) return null;

  const ultimoPago = pagosOrdenados[pagosOrdenados.length - 1].fecha;
  const pagoAnterior =
    pagosOrdenados.length > 1 ? pagosOrdenados[pagosOrdenados.length - 2].fecha : null;

  const fechaInicioCiclo = getClientCycleStart(cliente) ?? ultimoPago;
  const diasDelPagoActual = getClientCycleDays(cliente);
  const calendarioDisponible = buildMealCalendar(fechaInicioCiclo, diasDelPagoActual, feriados);

  // Contamos los días del calendario que ya pasaron (incluyendo hoy si está en el calendario)
  // En lugar de comidasDesdePago, ahora usamos diasConsumidosEnPeriodo
  const diasConsumidosHastaHoy = Math.max(
    0,
    Math.min(
      cliente.diasConsumidosEnPeriodo,
      calendarioDisponible.filter((d) => d <= today).length,
      diasDelPagoActual
    )
  );

  const diasRestantesPagoActual = Math.max(0, diasDelPagoActual - diasConsumidosHastaHoy);

  return {
    fechaUltimoPago: ultimoPago,
    fechaPagoAnterior: pagoAnterior,
    diasArrastradosDelPagoAnterior: 0, // Ya no se usan
    diasRestantesPagoAnterior: 0,     // Ya no se usan
    diasDelPagoActual,
    diasRestantesPagoActual,
    diasTotalesRestantes: diasRestantesPagoActual,
    calendarioDisponible,
    proximoPago:
      calendarioDisponible.length > 0 ? calendarioDisponible[calendarioDisponible.length - 1] : null,
  };
};

export const getClientChargeTiming = (
  cliente: Client,
  feriados: Holiday[],
  today = getTodayString()
): ClientChargeTiming | null => {
  const fechaInicioCiclo = getClientCycleStart(cliente);
  if (!fechaInicioCiclo) return null;

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

export const getBillingStatus = (cliente: Client): BillingStatus => {
  // Ahora comparamos diasConsumidosEnPeriodo con el ciclo
  const diasConsumidos = cliente.diasConsumidosEnPeriodo;
  const diasPorCiclo = getClientCycleDays(cliente);

  if (diasConsumidos > diasPorCiclo) {
    return {
      estado: "deuda",
      restante: 0,
      ciclosDeuda: Math.floor(diasConsumidos / diasPorCiclo),
    };
  }

  if (diasConsumidos === diasPorCiclo) {
    return { estado: "proximo-cobro", restante: 0, ciclosDeuda: 0 };
  }

  return { estado: "al-dia", restante: diasPorCiclo - diasConsumidos, ciclosDeuda: 0 };
};

export const compareClientsByUpcomingCharge = (a: Client, b: Client): number => {
  const statusA = getBillingStatus(a);
  const statusB = getBillingStatus(b);

  const getPriority = (status: BillingStatus) => {
    if (status.estado === "deuda") return 0;
    if (status.estado === "proximo-cobro") return 1;
    return 2;
  };

  const priorityDiff = getPriority(statusA) - getPriority(statusB);
  if (priorityDiff !== 0) return priorityDiff;

  if (statusA.estado === "deuda" && statusB.estado === "deuda") {
    if (statusA.ciclosDeuda !== statusB.ciclosDeuda) {
      return statusB.ciclosDeuda - statusA.ciclosDeuda;
    }

    const diasExcedidosA = a.diasConsumidosEnPeriodo - getClientCycleDays(a);
    const diasExcedidosB = b.diasConsumidosEnPeriodo - getClientCycleDays(b);
    if (diasExcedidosA !== diasExcedidosB) {
      return diasExcedidosB - diasExcedidosA;
    }
  }

  if (statusA.estado === "al-dia" && statusB.estado === "al-dia") {
    if (statusA.restante !== statusB.restante) {
      return statusA.restante - statusB.restante;
    }
  }

  return a.nombre.localeCompare(b.nombre);
};

export const formatBillingMessage = (cliente: Client): string => {
  const status = getBillingStatus(cliente);
  if (status.estado === "deuda") {
    const diasPorCiclo = getClientCycleDays(cliente);
    const diasExcedidos = cliente.diasConsumidosEnPeriodo - diasPorCiclo;
    return `Deuda de ${status.ciclosDeuda} ciclo(s). ${diasExcedidos} día(s) excedidos.`;
  }

  if (status.estado === "proximo-cobro") {
    return `Próximo cobro: se completaron ${getClientCycleDays(cliente)} días.`;
  }

  return `Al día. Faltan ${status.restante} día(s) para el próximo cobro.`;
};

// ============================================================================
// NUEVAS FUNCIONES: Basadas en arquitectura de ciclos persistidos
// ============================================================================

/**
 * Tipo extendido para resumen de balance con ciclos
 */
export type PaymentBalanceSummaryWithCycles = {
  // Datos básicos
  clienteId: string;
  fechaActual: string;

  // Resumen de ciclos
  ciclosSummary: ReturnType<typeof summarizeCycles>;

  // Días disponibles acumulados
  diasDisponibles: string[];

  // Metadatos para render
  diasDisponiblesTotal: number;
  proximoVencimiento: string | null;
  estado: 'al-dia' | 'proximo-vencimiento' | 'vencido';
};

/**
 * Genera resumen completo de balance usando ciclos persistidos
 * 
 * Esta es la función principal para reemplazar getPaymentBalanceSummary()
 * cuando se migre a la arquitectura de ciclos.
 */
export const getPaymentBalanceSummaryWithCycles = (
  clienteId: string,
  ciclos: PaymentCycle[],
  today = getTodayString()
): PaymentBalanceSummaryWithCycles | null => {
  if (ciclos.length === 0) return null;

  const summary = summarizeCycles(ciclos, today);
  const diasDisponibles = getAvailableDaysFromCycles(ciclos, today);
  const grouped = groupCyclesByStatus(ciclos, today);

  // Determinar estado general
  let estado: 'al-dia' | 'proximo-vencimiento' | 'vencido' = 'al-dia';
  if (grouped.activos.length > 0) {
    const ciclosActivos = grouped.activos.filter(
      (c) => (c.diasHabiles.length - c.diasConsumidos) <= 5
    );
    if (ciclosActivos.length > 0) {
      estado = 'proximo-vencimiento';
    }
  }
  if (diasDisponibles.length === 0 && grouped.activos.length > 0) {
    estado = 'vencido';
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

/**
 * Sincroniza ciclos con pagos: crea ciclos faltantes y retorna el conjunto actualizado
 */
export const synchronizeClientCycles = (
  clienteId: string,
  pagos: ClientEvent[],
  ciclosExistentes: PaymentCycle[],
  feriados: Holiday[] = []
): PaymentCycle[] => {
  return syncCyclesWithPayments(clienteId, pagos, ciclosExistentes, feriados);
};

/**
 * Obtiene información de vencimiento basada en ciclos
 */
export const getClientChargeTimingFromCycles = (
  ciclos: PaymentCycle[],
  today = getTodayString()
): ClientChargeTiming | null => {
  if (ciclos.length === 0) return null;

  const grouped = groupCyclesByStatus(ciclos, today);

  // El vencimiento es el fin del ciclo activo más cercano
  if (grouped.activos.length > 0) {
    const cicloActivo = grouped.activos[0];
    const diasHastaVencimiento = cicloActivo.diasHabiles.filter((d) => d >= today).length;

    return {
      fechaVencimiento: cicloActivo.fechaHasta,
      diasPendientes: diasHastaVencimiento,
      diasAtraso: 0,
    };
  }

  // Si no hay ciclo activo pero hay futuros
  if (grouped.futuros.length > 0) {
    return {
      fechaVencimiento: grouped.futuros[0].fechaHasta,
      diasPendientes: 0,
      diasAtraso: 0,
    };
  }

  // Solo ciclos completados
  if (grouped.completados.length > 0) {
    const ultimoCompletado = grouped.completados[grouped.completados.length - 1];
    const diasAtraso = countBusinessDaysBetween(ultimoCompletado.fechaHasta, today, []);

    return {
      fechaVencimiento: ultimoCompletado.fechaHasta,
      diasPendientes: 0,
      diasAtraso,
    };
  }

  return null;
};

/**
 * Calcula estado de facturación basado en ciclos
 */
export const getBillingStatusFromCycles = (ciclos: PaymentCycle[], today = getTodayString()): BillingStatus => {
  const summary = summarizeCycles(ciclos, today);

  if (summary.diasTotalDisponibles === 0 && summary.ciclosActivos > 0) {
    return {
      estado: 'proximo-cobro',
      restante: 0,
      ciclosDeuda: 0,
    };
  }

  if (summary.diasTotalDisponibles > 0) {
    return {
      estado: 'al-dia',
      restante: summary.diasTotalDisponibles,
      ciclosDeuda: 0,
    };
  }

  return {
    estado: 'al-dia',
    restante: 0,
    ciclosDeuda: 0,
  };
};

/**
 * Formatea mensaje de estado basado en ciclos
 */
export const formatBillingMessageFromCycles = (ciclos: PaymentCycle[]): string => {
  const status = getBillingStatusFromCycles(ciclos);

  if (status.estado === 'proximo-cobro') {
    return 'Próximo cobro: se completaron los días disponibles.';
  }

  if (status.estado === 'al-dia') {
    if (status.restante > 0) {
      return `Al día. Faltan ${status.restante} día(s).`;
    }
    return 'Sin ciclos activos.';
  }

  return 'Estado desconocido.';
};

