# 📅 Guía de Ciclos de Pago - Sistema de Viandas

## 🎯 Visión General

El nuevo sistema de **ciclos de pago** permite gestionar múltiples ciclos de 20 días hábiles de forma independiente e histórica.

### Problema que resuelve:
- ❌ **Antes**: Un ciclo único que se recalculaba y perdía información histórica
- ✅ **Ahora**: Ciclos persistidos que se acumulan y pueden consultarse en cualquier momento

---

## 📊 Estructura de Datos

### PaymentCycle (nuevo tipo)
```typescript
{
  id: string;                    // ID único del ciclo
  clienteId: string;             // Cliente propietario
  pagoId: string;                // Referencia al pago que inicia este ciclo
  fechaDesde: string;            // Primer día hábil (YYYY-MM-DD)
  fechaHasta: string;            // Último día hábil (YYYY-MM-DD)
  diasHabiles: string[];         // Array de 20 días hábiles exactamente
  diasConsumidos: number;        // Cuántos días se utilizaron
  estado: 'completado' | 'activo' | 'futuro';
  creadoEn: string;              // Timestamp ISO de creación
}
```

### Ejemplo Real:
```typescript
const ciclo1: PaymentCycle = {
  id: "1726234567890-abc123",
  clienteId: "cliente-1",
  pagoId: "pago-1",
  fechaDesde: "2026-01-02",      // Viernes (después de feriado)
  fechaHasta: "2026-02-02",      // Lunes (20 días hábiles después)
  diasHabiles: [
    "2026-01-02", "2026-01-05", "2026-01-06", ... // Solo L-V, sin feriados
  ],
  diasConsumidos: 8,             // Cliente ya usó 8 días
  estado: 'activo',              // Ciclo en curso
  creadoEn: "2025-12-15T10:30:00Z"
};

const ciclo2: PaymentCycle = {
  id: "1726334567890-def456",
  clienteId: "cliente-1",
  pagoId: "pago-2",
  fechaDesde: "2026-02-03",      // Día siguiente al ciclo anterior
  fechaHasta: "2026-03-05",      // 20 días hábiles después
  diasHabiles: [
    "2026-02-03", "2026-02-04", "2026-02-05", ... // L-V, sin feriados
  ],
  diasConsumidos: 0,             // Sin usar todavía
  estado: 'futuro',              // Próximo ciclo
  creadoEn: "2025-12-20T14:20:00Z"
};
```

---

## 🔄 Flujo de Operaciones

### 1️⃣ Crear un Ciclo (cuando hay un nuevo pago)

```typescript
import { createPaymentCycle } from './utils/cycle';
import { Holiday } from './types/types';

const feriados: Holiday[] = [
  { id: '1', fecha: '2026-01-01', motivo: 'Año Nuevo' }
];

const nuevoCiclo = createPaymentCycle(
  pagoId: "pago-2",
  clienteId: "cliente-1",
  fechaDesde: "2026-02-03",
  feriados
);

// Resultado: ciclo con diasHabiles lleno automáticamente
console.log(nuevoCiclo.diasHabiles); // 20 días exactamente
```

### 2️⃣ Sincronizar Ciclos con Pagos

```typescript
import { synchronizeClientCycles } from './utils/billing';

const pagos = eventos.filter(e => e.clienteId === cliente.id && e.tipo === 'pago');
const ciclosExistentes = ciclos.filter(c => c.clienteId === cliente.id);

// Crea ciclos nuevos automáticamente
const ciclosSincronizados = synchronizeClientCycles(
  cliente.id,
  pagos,
  ciclosExistentes,
  feriados
);

// Los ciclos se guardan en persistencia
await AsyncStorage.setItem(
  STORAGE_KEYS.CICLOS_PAGOS,
  JSON.stringify(ciclosSincronizados)
);
```

### 3️⃣ Obtener Información Agregada

```typescript
import { 
  getPaymentBalanceSummaryWithCycles,
  getCalendarDayStates,
  summarizeCycles
} from './utils/cycle';

// Resumen completo del cliente
const balance = getPaymentBalanceSummaryWithCycles(
  clienteId,
  ciclos,
  hoy
);

// Resultado:
{
  clienteId: "cliente-1",
  fechaActual: "2026-01-15",
  ciclosSummary: {
    totalCiclos: 2,
    ciclosCompletados: 0,
    ciclosActivos: 1,
    ciclosFuturos: 1,
    diasTotalHabiles: 40,           // 2 ciclos × 20 días
    diasTotalConsumidos: 8,
    diasTotalDisponibles: 32,       // 40 - 8
    proximoVencimiento: "2026-02-02"
  },
  diasDisponibles: ["2026-01-15", "2026-01-16", ... ], // 32 días
  diasDisponiblesTotal: 32,
  proximoVencimiento: "2026-02-02",
  estado: 'al-dia'
}

// Mapa con metadatos de cada día
const dayStates = getCalendarDayStates(ciclos, hoy);
dayStates.get("2026-01-15"); // → { fecha, estado: 'disponible', cicloId, ... }
dayStates.get("2025-12-01"); // → { fecha, estado: 'vencido', cicloId, ... }
```

### 4️⃣ Diferenciar Estados de Días

```typescript
import { getCalendarDayStates } from './utils/cycle';

const states = getCalendarDayStates(ciclos, "2026-01-15");

// Estados posibles:
// - 'disponible': hoy o futuro, no consumido
// - 'futuro':   próximo ciclo, después de hoy
// - 'consumido': ya utilizado
// - 'vencido':   pasado, no utilizado

// Ejemplo: día 15/01 (hoy)
states.get("2026-01-15")
// → { estado: 'disponible', cicloId: 'ciclo-1', indicePorConsumir: 8 }

// Ejemplo: día 10/01 (pasado, no usado)
states.get("2026-01-10")
// → { estado: 'vencido', cicloId: 'ciclo-1', indicePorConsumir: 5 }

// Ejemplo: día 03/02 (próximo ciclo)
states.get("2026-02-03")
// → { estado: 'futuro', cicloId: 'ciclo-2', indicePorConsumir: 0 }
```

---

## 🎨 Rendering en Calendario

### Colores por Estado (CalendarioScreen.tsx)

```typescript
const colorMap = {
  'disponible': '#dcfce7',   // Verde suave
  'futuro':    '#fef3c7',   // Amarillo claro
  'consumido': '#e0e7ff',   // Índigo suave
  'vencido':   '#d1d5db',   // Gris
  'pago':      '#dbeafe',   // Azul claro (evento especial)
  'feriado':   '#ffe3e3',   // Rojo suave
  'hoy':       '#dcfce7' + bordeVerde // Destacado
};
```

### Ejemplo Visual (Enero 2026):

```
Su = 10 | Lun = 12 | Mar = 13 | Mié = 14 | Jue = 15 | Vie = 16 | Sáb = 17
Su = 17 | Lun = 19 | Mar = 20 | Mié = 21 | Jue = 22 | Vie = 23 | Sáb = 24

Leyenda:
🟢 Verde   = Días disponibles (ciclo activo, sin usar)
🟡 Amarillo = Días futuros (próximo ciclo)
🔵 Índigo  = Días consumidos (ya se entregó vianda)
⚪ Gris    = Días vencidos (pasados, sin usar)
🔵 Azul    = Día de pago (evento)
```

---

## 📋 Casos de Uso Reales

### Caso 1: Cliente con 2 pagos superpuestos

```typescript
// Pagos:
// - Pago 1: 01/01/2026 → Ciclo 1: 01/01 a 02/02 (20 hábiles)
// - Pago 2: 15/02/2026 → Ciclo 2: 15/02 a 12/03 (20 hábiles)

// ¿Qué ve el cliente en el calendario?
// - Enero: días 01-31 marcados (ciclo 1)
// - Febrero: días 01-14 (ciclo 1 restante) + 15-29 (ciclo 2 nuevo)
// - Marzo: días 01-12 (ciclo 2)

// Días disponibles totales:
// Ciclo 1: 20 - diasConsumidos
// Ciclo 2: 20 - diasConsumidos
// Total acumulado: suma de ambos

const balance = getPaymentBalanceSummaryWithCycles(cliente.id, ciclos);
console.log(balance.diasTotalDisponibles); // ej: 35 días
```

### Caso 2: Ver ciclos históricos

```typescript
import { groupCyclesByStatus } from './utils/cycle';

const ciclos = [...]; // Todos los ciclos del cliente
const grouped = groupCyclesByStatus(ciclos, "2026-01-15");

console.log("Ciclos pasados (completados):");
grouped.completados.forEach(c => {
  console.log(`  ${c.fechaDesde} → ${c.fechaHasta}`);
});

console.log("Ciclos actuales:");
grouped.activos.forEach(c => {
  console.log(`  ${c.fechaDesde} → ${c.fechaHasta} (${c.diasConsumidos}/${c.diasHabiles.length})`);
});

console.log("Ciclos próximos:");
grouped.futuros.forEach(c => {
  console.log(`  ${c.fechaDesde} → ${c.fechaHasta}`);
});
```

### Caso 3: Marcar días como consumidos

```typescript
import { consumeDaysFromCycle } from './utils/cycle';

const ciclo = ciclos.find(c => c.id === 'ciclo-1');

// Cliente consumió 3 viandas hoy
const cicloActualizado = consumeDaysFromCycle(ciclo, 3);

console.log(cicloActualizado.diasConsumidos); // 11 (era 8, ahora +3)

// Guardar cambio
const ciclosActualizados = ciclos.map(c => 
  c.id === ciclo.id ? cicloActualizado : c
);
await AsyncStorage.setItem(
  STORAGE_KEYS.CICLOS_PAGOS,
  JSON.stringify(ciclosActualizados)
);
```

---

## 🔍 Validaciones y Edge Cases

### Validar integridad de ciclos

```typescript
import { validateCycles } from './utils/cycle';

const errores = validateCycles(ciclos);

if (errores.length > 0) {
  console.error("Ciclos con problemas:");
  errores.forEach(e => console.error(`  ⚠️ ${e}`));
} else {
  console.log("✅ Todos los ciclos son válidos");
}

// Posibles errores:
// - "Ciclo ABC tiene 18 días, esperaba 20"
// - "Ciclo XYZ: diasConsumidos (25) excede el total"
// - "Ciclo DEF: fechaDesde inconsistente"
```

### Manejar feriados

```typescript
// Los feriados se respetan automáticamente en buildMealCalendar()
const feriados = [
  { id: '1', fecha: '2026-01-01', motivo: 'Año Nuevo' },
  { id: '2', fecha: '2026-02-16', motivo: 'Feriado Provincial' }
];

// Al crear ciclo: saltará automáticamente estos días
const ciclo = createPaymentCycle(
  pagoId,
  clienteId,
  "2026-01-01",  // Si es feriado, se salta
  feriados
);

// diasHabiles contendrá 20 días hábiles reales
```

### Evitar recálculos destructivos

```typescript
// ❌ MAL: Pierde información
const ciclosNuevos = pagos.map(pago => 
  createPaymentCycle(pago.id, cliente.id, pago.fecha, feriados)
);
// Ciclos históricos se pierden

// ✅ BIEN: Sincroniza sin perder información
const ciclosSincronizados = synchronizeClientCycles(
  cliente.id,
  pagos,
  ciclosExistentes,  // Usa los que ya existen
  feriados
);
// Solo crea ciclos nuevos, mantiene los anteriores
```

---

## 🚀 Integración Paso a Paso

### 1. Importar tipos y funciones

```typescript
import { PaymentCycle } from './types/types';
import {
  createPaymentCycle,
  synchronizeClientCycles,
  getPaymentBalanceSummaryWithCycles,
  getCalendarDayStates,
  groupCyclesByStatus,
  getAvailableDaysFromCycles,
} from './utils/cycle';

import {
  synchronizeClientCycles,
  getPaymentBalanceSummaryWithCycles,
} from './utils/billing';
```

### 2. Cargar ciclos en pantalla

```typescript
const [ciclos, setCiclos] = useState<PaymentCycle[]>([]);

useFocusEffect(() => {
  const load = async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS);
    setCiclos(data ? JSON.parse(data) : []);
  };
  load();
});
```

### 3. Sincronizar con pagos

```typescript
const ciclosCliente = useMemo(() => {
  if (!cliente) return [];
  
  const delCliente = ciclos.filter(c => c.clienteId === cliente.id);
  return synchronizeClientCycles(
    cliente.id,
    pagos,
    delCliente,
    feriados
  );
}, [cliente, pagos, ciclos, feriados]);
```

### 4. Renderizar calendario

```typescript
const dayStates = getCalendarDayStates(ciclosCliente);

const estado = dayStates.get(fecha);
// → { estado: 'disponible' | 'vencido' | 'futuro' | 'consumido' }

// Aplicar color según estado
const backgroundColor = {
  'disponible': '#dcfce7',
  'vencido': '#d1d5db',
  // ...
}[estado?.estado || 'none'];
```

---

## 🐛 Debugging

### Ver estructura de ciclo

```typescript
console.log(JSON.stringify(ciclo, null, 2));

// Salida esperada:
{
  "id": "1726234567890-abc123",
  "clienteId": "cliente-1",
  "pagoId": "pago-1",
  "fechaDesde": "2026-01-02",
  "fechaHasta": "2026-02-02",
  "diasHabiles": [
    "2026-01-02", "2026-01-05", ... // Exactamente 20
  ],
  "diasConsumidos": 8,
  "estado": "activo",
  "creadoEn": "2025-12-15T10:30:00Z"
}
```

### Contar días por estado

```typescript
const today = getTodayString();
const dayStates = getCalendarDayStates(ciclos, today);
const estados = { disponible: 0, vencido: 0, consumido: 0, futuro: 0 };

dayStates.forEach(state => {
  estados[state.estado]++;
});

console.log("Estados:");
console.log(`  ✅ Disponibles: ${estados.disponible}`);
console.log(`  ⏰ Futuros: ${estados.futuro}`);
console.log(`  ✔️ Consumidos: ${estados.consumido}`);
console.log(`  ❌ Vencidos: ${estados.vencido}`);
```

---

## 💡 Notas Importantes

1. **Persistencia**: Siempre guardar cambios en `STORAGE_KEYS.CICLOS_PAGOS`
2. **Sincronización**: Llamar a `synchronizeClientCycles` después de cada nuevo pago
3. **Feriados**: Pasarlos en todas las funciones de cálculo
4. **Estados**: Automáticamente actualizados según `today`
5. **Performance**: `getCalendarDayStates()` devuelve un Map, más rápido que arrays

---

## 📚 Referencia Rápida

| Función | Propósito | Retorna |
|---------|----------|---------|
| `createPaymentCycle()` | Crea nuevo ciclo desde pago | `PaymentCycle` |
| `synchronizeClientCycles()` | Sincroniza ciclos con pagos | `PaymentCycle[]` |
| `getPaymentBalanceSummaryWithCycles()` | Resumen completo | `PaymentBalanceSummaryWithCycles` |
| `getCalendarDayStates()` | Estados por día | `Map<string, DayState>` |
| `groupCyclesByStatus()` | Agrupa ciclos | `{ completados, activos, futuros }` |
| `getAvailableDaysFromCycles()` | Días disponibles | `string[]` |
| `summarizeCycles()` | Estadísticas | `CyclesSummary` |
| `validateCycles()` | Valida integridad | `string[]` (errores) |

---

## 🎓 Conclusión

Este sistema permite:
- ✅ Mantener historial completo de ciclos
- ✅ Visualizar múltiples ciclos simultáneamente
- ✅ Diferenciar estados visuales claramente
- ✅ Acumular días disponibles correctamente
- ✅ Evitar recálculos destructivos
- ✅ Manejar edge cases (feriados, pagos superpuestos, etc.)

**Próximo paso**: Migra todas tus funciones de billing para usar esta arquitectura.
