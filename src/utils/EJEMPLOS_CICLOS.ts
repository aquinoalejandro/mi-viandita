/**
 * EJEMPLOS PRÁCTICOS - Sistema de Ciclos de Pago
 * 
 * Este archivo contiene ejemplos reales para copiar y adaptar
 */

// ============================================================================
// EJEMPLO 1: Crear ciclo desde evento de pago
// ============================================================================

import { createPaymentCycle } from './cycle';
import { synchronizeClientCycles } from './billing';
import { ClientEvent, PaymentCycle, Holiday } from '../types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storage';

// Scenario: Usuario hace un pago el 15/02/2026
export const ejemplo1_crearCicloDesdePago = async () => {
  const pagoNuevo: ClientEvent = {
    id: 'pago-456',
    clienteId: 'cliente-1',
    tipo: 'pago',
    fecha: '2026-02-15',
    detalle: 'Pago de cliente',
  };

  const clienteId = 'cliente-1';
  const feriados: Holiday[] = [
    { id: '1', fecha: '2026-02-16', motivo: 'Feriado Provincial' },
  ];

  // 1. Cargar ciclos existentes
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclosExistentes = ciclosJson ? JSON.parse(ciclosJson) : [];

  // 2. Filtrar ciclos del cliente
  const ciclosDelCliente = ciclosExistentes.filter(
    (c: PaymentCycle) => c.clienteId === clienteId
  );

  // 3. Cargar todos los pagos del cliente
  const eventosJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE);
  const eventos = eventosJson ? JSON.parse(eventosJson) : [];
  const pagosDelCliente = eventos.filter(
    (e: ClientEvent) => e.clienteId === clienteId && e.tipo === 'pago'
  );

  // 4. Sincronizar: crea ciclo nuevo si el pago es nuevo
  const ciclosSincronizados = synchronizeClientCycles(
    clienteId,
    pagosDelCliente,
    ciclosDelCliente,
    feriados
  );

  // 5. Actualizar storage
  const ciclosActualizados = [
    ...ciclosExistentes.filter((c: PaymentCycle) => c.clienteId !== clienteId),
    ...ciclosSincronizados,
  ];
  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(ciclosActualizados)
  );

  console.log(`✅ Ciclo creado: ${ciclosSincronizados[ciclosSincronizados.length - 1].id}`);
  return ciclosSincronizados[ciclosSincronizados.length - 1];
};

// ============================================================================
// EJEMPLO 2: Mostrar resumen de ciclos en un componente
// ============================================================================

import { getPaymentBalanceSummaryWithCycles } from './billing';
import { getTodayString } from './date';

export const ejemplo2_mostrarResumen = (
  clienteId: string,
  ciclos: PaymentCycle[]
) => {
  const hoy = getTodayString();
  const balance = getPaymentBalanceSummaryWithCycles(clienteId, ciclos, hoy);

  if (!balance) {
    console.log('📭 Sin ciclos registrados');
    return;
  }

  console.log('📊 === RESUMEN DE CICLOS ===');
  console.log(`Fecha actual: ${hoy}`);
  console.log(`Total ciclos: ${balance.ciclosSummary.totalCiclos}`);
  console.log(`  ✅ Completados: ${balance.ciclosSummary.ciclosCompletados}`);
  console.log(`  🔄 Activos: ${balance.ciclosSummary.ciclosActivos}`);
  console.log(`  ⏳ Futuros: ${balance.ciclosSummary.ciclosFuturos}`);

  console.log(`\n📈 Días totales:`);
  console.log(`  Hábiles: ${balance.ciclosSummary.diasTotalHabiles}`);
  console.log(`  Consumidos: ${balance.ciclosSummary.diasTotalConsumidos}`);
  console.log(`  Disponibles: ${balance.diasDisponiblesTotal}`);

  if (balance.proximoVencimiento) {
    console.log(`⏰ Próximo vencimiento: ${balance.proximoVencimiento}`);
  }

  console.log(`Estado: ${balance.estado}`);
};

// Salida esperada:
// 📊 === RESUMEN DE CICLOS ===
// Fecha actual: 2026-01-15
// Total ciclos: 2
//   ✅ Completados: 0
//   🔄 Activos: 1
//   ⏳ Futuros: 1
//
// 📈 Días totales:
//   Hábiles: 40
//   Consumidos: 8
//   Disponibles: 32
//
// ⏰ Próximo vencimiento: 2026-02-02
// Estado: al-dia

// ============================================================================
// EJEMPLO 3: Renderizar calendario con estados de ciclos
// ============================================================================

import { getCalendarDayStates } from './cycle';
import { buildMonthGrid } from './calendar';

export const ejemplo3_renderizarCalendario = (
  ciclos: PaymentCycle[],
  year: number,
  month: number // 0-indexed
) => {
  const hoy = getTodayString();
  const dayStates = getCalendarDayStates(ciclos, hoy);
  const weeks = buildMonthGrid(year, month);

  console.log('📅 === CALENDARIO ===');

  weeks.forEach((week, weekIndex) => {
    let linea = '';
    week.forEach((day) => {
      const estado = dayStates.get(day.fecha);

      const emojis: Record<string, string> = {
        disponible: '🟢',
        vencido: '⚪',
        consumido: '🔵',
        futuro: '🟡',
      };

      const emoji = estado ? emojis[estado.estado] || '⚫' : '  ';
      const num = day.fecha.split('-')[2];
      const mark = hoy === day.fecha ? '★' : ' ';

      linea += `${emoji}${num}${mark} `;
    });
    console.log(linea);
  });
};

// Salida esperada (enero 2026):
// 📅 === CALENDARIO ===
//   1  🟢2  🟢3  🟢4  🟢5  ⚪6  
// 🟢7  🟢8  🟢9  🟢10 🟢11★🟢12 
// 🟢13 🟢14 🟢15 🟢16 🟢17 🟢18 🟢19
// ...

// ============================================================================
// EJEMPLO 4: Filtrar días por estado
// ============================================================================

import { groupCyclesByStatus, getAvailableDaysFromCycles } from './cycle';

export const ejemplo4_filtrarPorEstado = (ciclos: PaymentCycle[]) => {
  const hoy = getTodayString();
  const grouped = groupCyclesByStatus(ciclos, hoy);
  const disponibles = getAvailableDaysFromCycles(ciclos, hoy);

  console.log('🔍 === FILTRADO POR ESTADO ===');

  console.log(`\n📋 Ciclos Completados (${grouped.completados.length}):`);
  grouped.completados.forEach((c) => {
    console.log(`  ${c.fechaDesde} → ${c.fechaHasta}`);
  });

  console.log(`\n🔄 Ciclos Activos (${grouped.activos.length}):`);
  grouped.activos.forEach((c) => {
    const disponiblesDelCiclo = c.diasHabiles.length - c.diasConsumidos;
    console.log(`  ${c.fechaDesde} → ${c.fechaHasta} (${disponiblesDelCiclo} días)`);
  });

  console.log(`\n⏳ Ciclos Futuros (${grouped.futuros.length}):`);
  grouped.futuros.forEach((c) => {
    console.log(`  ${c.fechaDesde} → ${c.fechaHasta}`);
  });

  console.log(`\n✅ Días Disponibles Totales (${disponibles.length}):`);
  console.log(`  ${disponibles.slice(0, 5).join(', ')}...`);
};

// ============================================================================
// EJEMPLO 5: Marcar días como consumidos
// ============================================================================

import { consumeDaysFromCycle } from './cycle';

export const ejemplo5_consumirDias = async (
  cicloId: string,
  cantidadDias: number,
  ciclos: PaymentCycle[]
) => {
  const cicloAActualizar = ciclos.find((c) => c.id === cicloId);
  if (!cicloAActualizar) {
    console.error('Ciclo no encontrado');
    return;
  }

  // Marcar días como consumidos
  const cicloActualizado = consumeDaysFromCycle(cicloAActualizar, cantidadDias);

  console.log(`✏️ Ciclo ${cicloId} actualizado:`);
  console.log(`  Antes: ${cicloAActualizar.diasConsumidos} días consumidos`);
  console.log(`  Después: ${cicloActualizado.diasConsumidos} días consumidos`);

  // Guardar cambios
  const ciclosActualizados = ciclos.map((c) =>
    c.id === cicloId ? cicloActualizado : c
  );

  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(ciclosActualizados)
  );

  return ciclosActualizados;
};

// ============================================================================
// EJEMPLO 6: Validar integridad de ciclos
// ============================================================================

import { validateCycles } from './cycle';

export const ejemplo6_validarIntegridad = (ciclos: PaymentCycle[]) => {
  const errores = validateCycles(ciclos);

  if (errores.length === 0) {
    console.log('✅ Todos los ciclos son válidos');
    return true;
  }

  console.error(`❌ Se encontraron ${errores.length} errores:`);
  errores.forEach((error) => {
    console.error(`  ⚠️ ${error}`);
  });

  return false;
};

// Salida esperada (error):
// ❌ Se encontraron 1 errores:
//   ⚠️ Ciclo abc123 tiene 18 días, esperaba 20

// ============================================================================
// EJEMPLO 7: Estadísticas agregadas
// ============================================================================

import { summarizeCycles } from './cycle';

export const ejemplo7_estadisticas = (ciclos: PaymentCycle[]) => {
  const hoy = getTodayString();
  const summary = summarizeCycles(ciclos, hoy);

  console.log('📈 === ESTADÍSTICAS ===');
  console.log(`Total ciclos: ${summary.totalCiclos}`);
  console.log(`  Completados: ${summary.ciclosCompletados}`);
  console.log(`  Activos: ${summary.ciclosActivos}`);
  console.log(`  Futuros: ${summary.ciclosFuturos}`);

  console.log(`\n📊 Días:`);
  console.log(`  Total hábiles: ${summary.diasTotalHabiles} (${summary.totalCiclos} × 20)`);
  console.log(`  Consumidos: ${summary.diasTotalConsumidos}`);
  console.log(`  Disponibles: ${summary.diasTotalDisponibles}`);

  const porcentajeConsumido = (
    ((summary.diasTotalConsumidos / summary.diasTotalHabiles) * 100) || 0
  ).toFixed(1);
  console.log(`  Porcentaje: ${porcentajeConsumido}% consumido`);

  if (summary.proximoVencimiento) {
    console.log(`\n⏰ Próximo vencimiento: ${summary.proximoVencimiento}`);
  }
};

// Salida esperada:
// 📈 === ESTADÍSTICAS ===
// Total ciclos: 2
//   Completados: 0
//   Activos: 1
//   Futuros: 1
//
// 📊 Días:
//   Total hábiles: 40 (2 × 20)
//   Consumidos: 8
//   Disponibles: 32
//   Porcentaje: 20.0% consumido
//
// ⏰ Próximo vencimiento: 2026-02-02

// ============================================================================
// EJEMPLO 8: Cargar y mostrar todos los ciclos de un cliente
// ============================================================================

export const ejemplo8_cargarCiclosDelCliente = async (clienteId: string) => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const todosCiclos = ciclosJson ? JSON.parse(ciclosJson) : [];

  const ciclosDelCliente = todosCiclos.filter(
    (c: PaymentCycle) => c.clienteId === clienteId
  );

  console.log(`📦 Cliente ${clienteId} tiene ${ciclosDelCliente.length} ciclo(s):`);
  ciclosDelCliente.forEach((ciclo: PaymentCycle, idx: number) => {
    console.log(`\n  Ciclo ${idx + 1}:`);
    console.log(`    ID: ${ciclo.id}`);
    console.log(`    Periodo: ${ciclo.fechaDesde} → ${ciclo.fechaHasta}`);
    console.log(`    Estado: ${ciclo.estado}`);
    console.log(`    Progreso: ${ciclo.diasConsumidos}/${ciclo.diasHabiles.length} días`);
    console.log(`    Creado: ${ciclo.creadoEn}`);
  });

  return ciclosDelCliente;
};

// ============================================================================
// EJEMPLO 9: Migración de datos antiguos (si es necesario)
// ============================================================================

export const ejemplo9_migracionDatos = async () => {
  // Si tenías ciclos calculados bajo demanda, puedes migrar a persistidos:

  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos: PaymentCycle[] = ciclosJson ? JSON.parse(ciclosJson) : [];

  if (ciclos.length === 0) {
    console.log('ℹ️ No hay ciclos para migrar. Iniciando con sistema nuevo.');
    return;
  }

  // Validar ciclos migrados
  const errores = validateCycles(ciclos);
  if (errores.length > 0) {
    console.error('❌ Errores en migración:', errores);
  } else {
    console.log('✅ Migración completada exitosamente');
  }
};

// ============================================================================
// EJEMPLO 10: Caso completo: Pantalla con ciclos
// ============================================================================

export const ejemplo10_pantallaCompleta = async (clienteId: string) => {
  console.log('='.repeat(60));
  console.log('📱 PANTALLA DE CALENDARIO COMPLETA');
  console.log('='.repeat(60));

  // 1. Cargar datos
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos = ciclosJson ? JSON.parse(ciclosJson) : [];
  const ciclosDelCliente = ciclos.filter(
    (c: PaymentCycle) => c.clienteId === clienteId
  );

  if (ciclosDelCliente.length === 0) {
    console.log('ℹ️ Sin ciclos para este cliente. Primero debe hacer un pago.');
    return;
  }

  // 2. Mostrar resumen
  ejemplo2_mostrarResumen(clienteId, ciclosDelCliente);

  // 3. Mostrar ciclos agrupados
  ejemplo4_filtrarPorEstado(ciclosDelCliente);

  // 4. Mostrar estadísticas
  ejemplo7_estadisticas(ciclosDelCliente);

  // 5. Validar integridad
  console.log('\n🔍 Validando integridad...');
  ejemplo6_validarIntegridad(ciclosDelCliente);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Pantalla renderizada correctamente');
  console.log('='.repeat(60));
};

// ============================================================================
// EXPORTAR PARA TESTING
// ============================================================================

export const ejemplos = {
  crearCicloDesdePago: ejemplo1_crearCicloDesdePago,
  mostrarResumen: ejemplo2_mostrarResumen,
  renderizarCalendario: ejemplo3_renderizarCalendario,
  filtrarPorEstado: ejemplo4_filtrarPorEstado,
  consumirDias: ejemplo5_consumirDias,
  validarIntegridad: ejemplo6_validarIntegridad,
  estadisticas: ejemplo7_estadisticas,
  cargarCiclosDelCliente: ejemplo8_cargarCiclosDelCliente,
  migracionDatos: ejemplo9_migracionDatos,
  pantallaCompleta: ejemplo10_pantallaCompleta,
};
