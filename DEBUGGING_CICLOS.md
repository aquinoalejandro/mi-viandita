# 🐛 DEBUGGING & TROUBLESHOOTING - Sistema de Ciclos

> Soluciones rápidas para los problemas más comunes.

---

## ⚠️ PROBLEMA 1: "Ciclos no se cargan en CalendarioScreen"

### Síntomas
- Pantalla muestra "Sin ciclos" aunque hay pagos registrados
- Calendario vacío
- No se crea el ciclo automáticamente

### Debug paso a paso

```typescript
// Paso 1: ¿Se están cargando los ciclos del storage?
const debugCargarCiclos = async () => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  console.log("Ciclos JSON:", ciclosJson);
  
  if (!ciclosJson) {
    console.error("❌ No hay ciclos en storage. Necesitas crear el primer ciclo.");
    return;
  }
  
  const ciclos = JSON.parse(ciclosJson);
  console.log("✅ Ciclos cargados:", ciclos.length);
};

// Paso 2: ¿Se están filtrando por cliente?
const debugFiltroCliente = async (clienteId: string) => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos = JSON.parse(ciclosJson || '[]');
  
  const delCliente = ciclos.filter((c: PaymentCycle) => c.clienteId === clienteId);
  console.log(`Cliente ${clienteId}: ${delCliente.length} ciclos`);
  
  if (delCliente.length === 0) {
    console.error("❌ El cliente no tiene ciclos asignados");
  }
};

// Paso 3: ¿Se sincronizó correctamente?
const debugSincronizacion = async (clienteId: string) => {
  const eventosJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE);
  const eventos = JSON.parse(eventosJson || '[]');
  const pagos = eventos.filter(
    (e: ClientEvent) => e.clienteId === clienteId && e.tipo === 'pago'
  );
  
  console.log(`Pagos registrados: ${pagos.length}`);
  pagos.forEach((p: ClientEvent) => console.log(`  - ${p.fecha}`));
  
  if (pagos.length === 0) {
    console.error("❌ El cliente no tiene pagos. Crea uno primero.");
  }
};
```

### Solución
```typescript
// Fuerza sincronización manual
const forceSync = async (clienteId: string) => {
  const eventosJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE);
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  
  const eventos = JSON.parse(eventosJson || '[]');
  const ciclos = JSON.parse(ciclosJson || '[]');
  
  const pagos = eventos.filter((e: ClientEvent) => e.clienteId === clienteId);
  const ciclosDelCliente = ciclos.filter((c: PaymentCycle) => c.clienteId === clienteId);
  
  const ciclosSincronizados = synchronizeClientCycles(
    clienteId,
    pagos,
    ciclosDelCliente,
    feriados
  );
  
  const nuevoCiclos = [
    ...ciclos.filter((c: PaymentCycle) => c.clienteId !== clienteId),
    ...ciclosSincronizados,
  ];
  
  await AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(nuevoCiclos));
  console.log("✅ Ciclos sincronizados:", ciclosSincronizados.length);
};
```

---

## ⚠️ PROBLEMA 2: "Ciclo tiene solo 18 días en lugar de 20"

### Síntomas
- Error: "Ciclo ABC tiene 18 días, esperaba 20"
- `validateCycles()` retorna errores
- Días faltando

### Debug

```typescript
const debugDiasFaltantes = (ciclo: PaymentCycle) => {
  console.log(`Ciclo: ${ciclo.id}`);
  console.log(`Desde: ${ciclo.fechaDesde}`);
  console.log(`Hasta: ${ciclo.fechaHasta}`);
  console.log(`Días en array: ${ciclo.diasHabiles.length}`);
  
  // Mostrar los días
  console.log("Días incluidos:");
  ciclo.diasHabiles.forEach((día, idx) => {
    console.log(`  ${idx + 1}. ${día}`);
  });
  
  // Recalcular manualmente
  const diasRecalculados = buildMealCalendar(
    ciclo.fechaDesde,
    20,
    feriados
  );
  
  console.log(`\nRecalculados: ${diasRecalculados.length}`);
  
  if (diasRecalculados.length !== ciclo.diasHabiles.length) {
    console.error("❌ Mismatch en cantidad de días");
    console.log("Diferencia:", diasRecalculados.filter(
      (d) => !ciclo.diasHabiles.includes(d)
    ));
  }
};
```

### Causas comunes

1. **Feriados no sincronizados**
   ```typescript
   // ❌ MAL: Sin feriados
   createPaymentCycle(pagoId, clienteId, fecha); // Por defecto []
   
   // ✅ BIEN: Con feriados
   createPaymentCycle(pagoId, clienteId, fecha, feriados);
   ```

2. **Ciclo creado sin sincronización**
   ```typescript
   // ❌ MAL: Crea directamente
   const cicloManual = createPaymentCycle(...);
   
   // ✅ BIEN: Usa sincronización
   const ciclos = synchronizeClientCycles(clienteId, pagos, existentes, feriados);
   ```

---

## ⚠️ PROBLEMA 3: "Días disponibles no se acumulan"

### Síntomas
- Debería haber 35 días (ciclo 1: 15 + ciclo 2: 20)
- Muestra solo 20 días
- O menos

### Debug

```typescript
const debugDisponibilidad = async (clienteId: string) => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos: PaymentCycle[] = JSON.parse(ciclosJson || '[]');
  
  const clienteCiclos = ciclos.filter((c) => c.clienteId === clienteId);
  const today = getTodayString();
  
  console.log(`=== DISPONIBILIDAD para ${clienteId} ===`);
  console.log(`Hoy: ${today}`);
  console.log(`Ciclos: ${clienteCiclos.length}`);
  
  // Por cada ciclo
  clienteCiclos.forEach((ciclo, idx) => {
    console.log(`\nCiclo ${idx + 1}: ${ciclo.id}`);
    console.log(`  Rango: ${ciclo.fechaDesde} → ${ciclo.fechaHasta}`);
    console.log(`  Total: ${ciclo.diasHabiles.length} días`);
    console.log(`  Consumidos: ${ciclo.diasConsumidos}`);
    
    const disponiblesDelCiclo = ciclo.diasHabiles.length - ciclo.diasConsumidos;
    console.log(`  Disponibles: ${disponiblesDelCiclo}`);
    
    // Verifica que estén en rango
    const diasEnRango = ciclo.diasHabiles.filter((d) => d >= today).length;
    console.log(`  En rango (>= hoy): ${diasEnRango}`);
  });
  
  // Total acumulado
  const disponibles = getAvailableDaysFromCycles(clienteCiclos, today);
  console.log(`\n✅ TOTAL DISPONIBLES: ${disponibles.length}`);
  console.log("Días:", disponibles.slice(0, 5), "...");
};
```

### Solución

```typescript
// Verificar que syncCycles se llamó para todos los pagos
const forceResync = async (clienteId: string) => {
  const eventosJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE);
  const eventos = JSON.parse(eventosJson || '[]');
  
  const pagosDelCliente = eventos.filter(
    (e: ClientEvent) => e.clienteId === clienteId && e.tipo === 'pago'
  );
  
  console.log(`Pagos del cliente: ${pagosDelCliente.length}`);
  pagosDelCliente.forEach((p) => console.log(`  - ${p.fecha}`));
  
  // Sincronizar de nuevo
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos = JSON.parse(ciclosJson || '[]');
  
  const ciclosDelCliente = ciclos.filter((c: PaymentCycle) => c.clienteId === clienteId);
  
  const sincronizados = synchronizeClientCycles(
    clienteId,
    pagosDelCliente,
    ciclosDelCliente,
    feriados
  );
  
  console.log(`Ciclos después de sync: ${sincronizados.length}`);
  
  // Guardar
  const todosCiclos = [
    ...ciclos.filter((c: PaymentCycle) => c.clienteId !== clienteId),
    ...sincronizados,
  ];
  
  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(todosCiclos)
  );
};
```

---

## ⚠️ PROBLEMA 4: "Calendario no muestra los colores correctos"

### Síntomas
- Días no tienen color
- Todos son grises o blancos
- No se diferencia disponible/vencido/etc

### Debug

```typescript
const debugColores = (ciclos: PaymentCycle[], year: number, month: number) => {
  const today = getTodayString();
  const dayStates = getCalendarDayStates(ciclos, today);
  const weeks = buildMonthGrid(year, month);
  
  console.log(`=== COLORES CALENDARIO ${year}-${month} ===`);
  console.log(`Hoy: ${today}`);
  console.log(`Total días con estado: ${dayStates.size}`);
  
  // Por día visible
  weeks.forEach((week, semana) => {
    let linea = `Semana ${semana + 1}: `;
    week.forEach((day) => {
      const state = dayStates.get(day.fecha);
      const símbolo = {
        'disponible': '🟢',
        'vencido': '⚪',
        'consumido': '🔵',
        'futuro': '🟡',
        undefined: '⚫'
      }[state?.estado];
      
      linea += `${símbolo}${day.fecha.split('-')[2]} `;
    });
    console.log(linea);
  });
  
  // Contar por estado
  const conteo: Record<string, number> = {};
  dayStates.forEach((state) => {
    conteo[state.estado] = (conteo[state.estado] || 0) + 1;
  });
  
  console.log("\nConteo por estado:");
  Object.entries(conteo).forEach(([estado, cantidad]) => {
    console.log(`  ${estado}: ${cantidad}`);
  });
};
```

### Causas comunes

1. **cicloSet vacío en CalendarioScreen**
   ```typescript
   // ❌ Esto está mal en CalendarioScreen
   const cicloSet = useMemo(() => new Set(calendarioCliente), [calendarioCliente]);
   // ↑ Usa variable antigua
   
   // ✅ Usar la nueva:
   const calendarDayStates = useMemo(() => {
     if (!resumenCiclos) return new Map();
     return getCalendarDayStates(ciclosCliente, today);
   }, [ciclosCliente, resumenCiclos, today]);
   ```

2. **getCalendarDayStates no se ejecutó**
   ```typescript
   // Verificar que se calcula
   const states = getCalendarDayStates(ciclosCliente, today);
   console.log("Estados calculados:", states.size);
   ```

---

## ⚠️ PROBLEMA 5: "diasConsumidos no se actualiza"

### Síntomas
- Cliente consume 3 viandas
- diasConsumidos sigue siendo 0
- Progress bar no avanza

### Debug

```typescript
const debugConsumo = (ciclo: PaymentCycle) => {
  console.log(`Ciclo: ${ciclo.id}`);
  console.log(`Días consumidos: ${ciclo.diasConsumidos}`);
  console.log(`Total: ${ciclo.diasHabiles.length}`);
  console.log(`Disponibles: ${ciclo.diasHabiles.length - ciclo.diasConsumidos}`);
  
  // Verificar límite
  if (ciclo.diasConsumidos > ciclo.diasHabiles.length) {
    console.error("❌ diasConsumidos EXCEDE el total");
  }
};

const debugActualizacion = async (cicloId: string, cantidadNueva: number) => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos: PaymentCycle[] = JSON.parse(ciclosJson || '[]');
  
  const ciclo = ciclos.find((c) => c.id === cicloId);
  if (!ciclo) {
    console.error("❌ Ciclo no encontrado");
    return;
  }
  
  console.log(`Antes: ${ciclo.diasConsumidos}`);
  
  // Consumir
  const actualizado = consumeDaysFromCycle(ciclo, cantidadNueva);
  console.log(`Después: ${actualizado.diasConsumidos}`);
  
  // ¿Se guardó?
  const ciclosActualizados = ciclos.map((c) =>
    c.id === cicloId ? actualizado : c
  );
  
  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(ciclosActualizados)
  );
  
  // Verificar guardado
  const ciclosVerificacion = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const cicloVerificado = JSON.parse(ciclosVerificacion || '[]').find(
    (c: PaymentCycle) => c.id === cicloId
  );
  
  console.log(`Guardado en storage: ${cicloVerificado.diasConsumidos}`);
};
```

### Solución

```typescript
// Asegúrate que consumeDaysFromCycle se ejecute correctamente
const actualizarConsumo = async (cicloId: string, cantidad: number) => {
  // 1. Cargar
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  let ciclos: PaymentCycle[] = JSON.parse(ciclosJson || '[]');
  
  // 2. Encontrar
  const índice = ciclos.findIndex((c) => c.id === cicloId);
  if (índice === -1) {
    console.error("Ciclo no encontrado");
    return;
  }
  
  // 3. Actualizar (IMPORTANTE: no mutar)
  const ciclosActualizados = [
    ...ciclos.slice(0, índice),
    consumeDaysFromCycle(ciclos[índice], cantidad),
    ...ciclos.slice(índice + 1),
  ];
  
  // 4. Guardar
  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(ciclosActualizados)
  );
  
  // 5. Verificar
  const guardado = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  console.log("✅ Guardado:", JSON.parse(guardado || '[]')[índice].diasConsumidos);
};
```

---

## ⚠️ PROBLEMA 6: "Error: diasHabiles[0] !== fechaDesde"

### Debug

```typescript
const debugFechasInconsistentes = (ciclo: PaymentCycle) => {
  const desde = ciclo.diasHabiles[0];
  const hasta = ciclo.diasHabiles[ciclo.diasHabiles.length - 1];
  
  console.log(`Ciclo: ${ciclo.id}`);
  console.log(`fechaDesde en ciclo: ${ciclo.fechaDesde}`);
  console.log(`diasHabiles[0]: ${desde}`);
  console.log(`¿Coinciden?: ${ciclo.fechaDesde === desde}`);
  
  console.log(`\nfechaHasta en ciclo: ${ciclo.fechaHasta}`);
  console.log(`diasHabiles[último]: ${hasta}`);
  console.log(`¿Coinciden?: ${ciclo.fechaHasta === hasta}`);
  
  if (ciclo.fechaDesde !== desde) {
    console.error("❌ fechaDesde es inconsistente");
    console.error(`   Esperado: ${desde}, Actual: ${ciclo.fechaDesde}`);
  }
};
```

### Solución

```typescript
// Reparar ciclos inconsistentes
const repararCiclo = (ciclo: PaymentCycle): PaymentCycle => {
  return {
    ...ciclo,
    fechaDesde: ciclo.diasHabiles[0],
    fechaHasta: ciclo.diasHabiles[ciclo.diasHabiles.length - 1],
  };
};

const repararTodosCiclos = async () => {
  const ciclosJson = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
  const ciclos: PaymentCycle[] = JSON.parse(ciclosJson || '[]');
  
  const ciclosReparados = ciclos.map((c) => {
    const reparado = repararCiclo(c);
    if (JSON.stringify(c) !== JSON.stringify(reparado)) {
      console.log(`🔧 Reparado ciclo ${c.id}`);
    }
    return reparado;
  });
  
  await AsyncStorage.setItem(
    STORAGE_KEYS.CICLOS_PAGOS,
    JSON.stringify(ciclosReparados)
  );
  
  console.log("✅ Reparación completada");
};
```

---

## 🛠️ HERRAMIENTAS DE DEBUG

### Monitoreo en tiempo real

```typescript
// Agregar a un componente debug (solo dev)
import { __DEV__ } from 'react-native';

if (__DEV__) {
  window.debugCiclos = {
    cargarCiclos: () => AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS)
      .then(d => JSON.parse(d || '[]')),
    
    validar: () => {
      AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS)
        .then(d => {
          const ciclos = JSON.parse(d || '[]');
          const errores = validateCycles(ciclos);
          console.table(errores);
        });
    },
    
    estadisticas: () => {
      AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS)
        .then(d => {
          const ciclos = JSON.parse(d || '[]');
          console.table({
            total: ciclos.length,
            diasTotales: ciclos.reduce((sum: number, c: PaymentCycle) => 
              sum + c.diasHabiles.length, 0),
            diasConsumidos: ciclos.reduce((sum: number, c: PaymentCycle) => 
              sum + c.diasConsumidos, 0),
          });
        });
    }
  };
}

// Uso: En consola del simulador
// debugCiclos.cargarCiclos()
// debugCiclos.validar()
// debugCiclos.estadisticas()
```

---

## 📋 CHECKLIST DE DEBUGGING

Cuando algo no funciona:

- [ ] ¿Se cargan los ciclos de AsyncStorage?
- [ ] ¿Se filtraron por `clienteId` correcto?
- [ ] ¿Se ejecutó `synchronizeClientCycles()`?
- [ ] ¿Los ciclos tienen exactamente 20 `diasHabiles`?
- [ ] ¿`fechaDesde` == `diasHabiles[0]`?
- [ ] ¿`fechaHasta` == `diasHabiles[última]`?
- [ ] ¿`diasConsumidos <= diasHabiles.length`?
- [ ] ¿Se guardó el cambio en AsyncStorage?
- [ ] ¿El componente se re-renderizó?
- [ ] ¿Corriste `validateCycles()` sin errores?

---

## 🎯 CONCLUSIÓN

La mayoría de problemas vienen de:
1. **No sincronizar ciclos** → Usa `synchronizeClientCycles()`
2. **Persistencia olvidada** → Siempre guardar en AsyncStorage
3. **Mutación de estado** → Crear nuevos arrays, no modificar
4. **Feriados faltantes** → Pasarlos a todas las funciones

¡Usa estos scripts y resuelve cualquier problema! 🎉
