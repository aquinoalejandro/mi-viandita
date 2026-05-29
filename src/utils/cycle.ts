/**
 * Gestión de ciclos de pago de 20 días hábiles
 * 
 * Responsabilidades:
 * - Crear ciclos cuando hay un pago
 * - Recuperar ciclos persistidos
 * - Agrupar ciclos por estado (pasado, activo, futuro)
 * - Acumular días disponibles de múltiples ciclos
 */

import { Holiday, PaymentCycle, ClientEvent } from "../types/types";
import { buildMealCalendar, isBeforeToday } from "./calendar";
import { getTodayString, formatLocalDate } from "./date";

const COMIDAS_POR_CICLO = 20;
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Crea un nuevo ciclo a partir de un evento de pago
 */
export const createPaymentCycle = (
  pagoId: string,
  clienteId: string,
  fechaDesde: string,
  feriados: Holiday[] = []
): PaymentCycle => {
  const diasHabiles = buildMealCalendar(fechaDesde, COMIDAS_POR_CICLO, feriados);
  const fechaHasta = diasHabiles[diasHabiles.length - 1] || fechaDesde;

  return {
    id: createId(),
    clienteId,
    pagoId,
    fechaDesde,
    fechaHasta,
    diasHabiles,
    diasConsumidos: 0,
    estado: 'futuro',
    creadoEn: new Date().toISOString(),
  };
};

/**
 * Determina el estado de un ciclo relativo a hoy
 */
export const determineCycleStatus = (
  ciclo: PaymentCycle,
  today = getTodayString()
): 'completado' | 'activo' | 'futuro' => {
  if (ciclo.fechaHasta < today) {
    return 'completado';
  }
  if (ciclo.fechaDesde <= today && today <= ciclo.fechaHasta) {
    return 'activo';
  }
  return 'futuro';
};

/**
 * Filtra y agrupa ciclos por estado
 */
export const groupCyclesByStatus = (ciclos: PaymentCycle[], today = getTodayString()) => {
  const actualizado = ciclos.map((c) => ({
    ...c,
    estado: determineCycleStatus(c, today),
  }));

  return {
    completados: actualizado.filter((c) => c.estado === 'completado'),
    activos: actualizado.filter((c) => c.estado === 'activo'),
    futuros: actualizado.filter((c) => c.estado === 'futuro'),
  };
};

/**
 * Obtiene todos los días hábiles disponibles (no utilizados) de múltiples ciclos
 */
export const getAvailableDaysFromCycles = (ciclos: PaymentCycle[], today = getTodayString()): string[] => {
  const resultado: string[] = [];
  const conjunto = new Set<string>();

  // Procesar ciclos en orden cronológico
  const ciclosOrdenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  for (const ciclo of ciclosOrdenados) {
    for (let i = ciclo.diasConsumidos; i < ciclo.diasHabiles.length; i++) {
      const dia = ciclo.diasHabiles[i];

      // Solo añadir si es hoy o después
      if (dia >= today && !conjunto.has(dia)) {
        resultado.push(dia);
        conjunto.add(dia);
      }
    }
  }

  return resultado.sort();
};

/**
 * Obtiene todos los días hábiles de ciclos para renderizar en calendario
 * Incluye: días pasados, presentes y futuros
 * Cada día incluye metadatos sobre su estado
 */
export const getCalendarDayStates = (ciclos: PaymentCycle[], today = getTodayString()) => {
  const mapa = new Map<string, {
    fecha: string;
    estado: 'vencido' | 'disponible' | 'consumido' | 'futuro';
    cicloId: string;
    indicePorConsumir: number;
  }>();

  // Procesar ciclos ordenados por fecha
  const ciclosOrdenados = [...ciclos].sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));

  for (const ciclo of ciclosOrdenados) {
    for (let idx = 0; idx < ciclo.diasHabiles.length; idx++) {
      const dia = ciclo.diasHabiles[idx];
      const yaExiste = mapa.has(dia);

      if (!yaExiste) {
        let estado: 'vencido' | 'disponible' | 'consumido' | 'futuro';

        if (idx < ciclo.diasConsumidos) {
          // Día ya utilizado
          estado = 'consumido';
        } else if (dia < today) {
          // Día pasado pero no utilizado (vencido)
          estado = 'vencido';
        } else if (dia === today || dia > today) {
          // Día actual o futuro, aún disponible
          estado = 'disponible';
        } else {
          estado = 'vencido';
        }

        mapa.set(dia, {
          fecha: dia,
          estado,
          cicloId: ciclo.id,
          indicePorConsumir: idx,
        });
      }
    }
  }

  return mapa;
};

/**
 * Cuenta los días hábiles disponibles (no consumidos, no pasados)
 */
export const countAvailableDays = (ciclos: PaymentCycle[], today = getTodayString()): number => {
  return getAvailableDaysFromCycles(ciclos, today).length;
};

/**
 * Cuenta los días hábiles consumidos de todos los ciclos
 */
export const countConsumedDays = (ciclos: PaymentCycle[]): number => {
  return ciclos.reduce((sum, c) => sum + c.diasConsumidos, 0);
};

/**
 * Marca días como consumidos en un ciclo
 * Retorna el ciclo actualizado
 */
export const consumeDaysFromCycle = (
  ciclo: PaymentCycle,
  cantidadDias: number
): PaymentCycle => {
  const diasDisponibles = ciclo.diasHabiles.length - ciclo.diasConsumidos;
  const nuevosConsumidos = Math.min(cantidadDias, diasDisponibles);

  return {
    ...ciclo,
    diasConsumidos: ciclo.diasConsumidos + nuevosConsumidos,
  };
};

/**
 * Obtiene el resumen total de días de un cliente considerando todos sus ciclos
 */
export type CyclesSummary = {
  totalCiclos: number;
  ciclosCompletados: number;
  ciclosActivos: number;
  ciclosFuturos: number;
  diasTotalHabiles: number;
  diasTotalConsumidos: number;
  diasTotalDisponibles: number;
  proximoVencimiento: string | null;
};

export const summarizeCycles = (ciclos: PaymentCycle[], today = getTodayString()): CyclesSummary => {
  const grouped = groupCyclesByStatus(ciclos, today);
  const disponibles = getAvailableDaysFromCycles(ciclos, today);
  const consumidos = countConsumedDays(ciclos);

  // Encontrar próximo vencimiento
  let proximoVencimiento: string | null = null;
  for (const ciclo of ciclos) {
    if (ciclo.estado !== 'completado') {
      if (!proximoVencimiento || ciclo.fechaHasta < proximoVencimiento) {
        proximoVencimiento = ciclo.fechaHasta;
      }
    }
  }

  return {
    totalCiclos: ciclos.length,
    ciclosCompletados: grouped.completados.length,
    ciclosActivos: grouped.activos.length,
    ciclosFuturos: grouped.futuros.length,
    diasTotalHabiles: ciclos.reduce((sum, c) => sum + c.diasHabiles.length, 0),
    diasTotalConsumidos: consumidos,
    diasTotalDisponibles: disponibles.length,
    proximoVencimiento,
  };
};

/**
 * Genera ciclos para todos los pagos de un cliente
 * Sincroniza ciclos con eventos de pago
 */
export const syncCyclesWithPayments = (
  clienteId: string,
  pagos: ClientEvent[],
  ciclosExistentes: PaymentCycle[],
  feriados: Holiday[] = []
): PaymentCycle[] => {
  // Extraer IDs de pagos que ya tienen ciclos
  const pagoIdsConCiclo = new Set(ciclosExistentes.map((c) => c.pagoId));

  // Crear ciclos para pagos nuevos
  const ciclosNuevos = pagos
    .filter((pago) => !pagoIdsConCiclo.has(pago.id))
    .map((pago) => createPaymentCycle(pago.id, clienteId, pago.fecha, feriados));

  // Combinar y retornar
  return [...ciclosExistentes, ...ciclosNuevos];
};

/**
 * Valida que los ciclos sean coherentes (sin solapamientos problemáticos)
 * Retorna errores si los encuentra
 */
export const validateCycles = (ciclos: PaymentCycle[]): string[] => {
  const errores: string[] = [];

  if (ciclos.length === 0) return errores;

  // Verificar que cada ciclo tenga exactamente 20 días hábiles
  for (const ciclo of ciclos) {
    if (ciclo.diasHabiles.length !== COMIDAS_POR_CICLO) {
      errores.push(`Ciclo ${ciclo.id} tiene ${ciclo.diasHabiles.length} días, esperaba ${COMIDAS_POR_CICLO}`);
    }

    // Verificar que diasConsumidos no exceda el total
    if (ciclo.diasConsumidos > ciclo.diasHabiles.length) {
      errores.push(`Ciclo ${ciclo.id}: diasConsumidos (${ciclo.diasConsumidos}) excede el total`);
    }

    // Verificar que fechaDesde y fechaHasta sean consistentes
    if (ciclo.diasHabiles[0] !== ciclo.fechaDesde) {
      errores.push(`Ciclo ${ciclo.id}: fechaDesde inconsistente`);
    }
    if (ciclo.diasHabiles[ciclo.diasHabiles.length - 1] !== ciclo.fechaHasta) {
      errores.push(`Ciclo ${ciclo.id}: fechaHasta inconsistente`);
    }
  }

  return errores;
};
