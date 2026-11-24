# TODO - Refactor: sacar “entregas/no-entregas” y manejar por periodos + feriados

## Paso 1 (Plan técnico)
- [x] Identificar todas las dependencias del sistema de “entregas”:
  - tipos/variables/mecánicas en `src/screens/MiVianda/CobrosScreen.tsx`
  - cualquier uso de `tipo === "entrega" | "entrega-deuda" | "no-entrega"`
  - cualquier cálculo de `comidasDesdePago` dependiente de eventos de entrega
  - cualquier UI que permita marcar entregas/no-entregas
- [x] Definir la nueva fuente de verdad:
  - `comidasDesdePago` calculado por tiempo (días hábiles entre `fechaInicioCiclo` y hoy, excluyendo fines de semana y feriados)
  - compensación de feriados ya existente vía `comidasReponer`/`getClientCycleDays()`

## Paso 2 (Código principal)
- [x] Refactor de `src/screens/MiVianda/CobrosScreen.tsx`:
  - [x] Eliminar helpers y acciones de “Entregas” (marcar entregado/no-entregado, pendientes, deudas, etc.)
  - [x] Eliminar modal y secciones “Entregas” de la UI
  - [x] Modificar `recalcularEstadoCliente()` para calcular `comidasDesdePago` SOLO por calendario/periodo (no por eventos de entrega)
  - [x] Modificar `procesarPago()` para que:
    - [x] deje de auto-generar eventos de entrega
    - [x] actualice únicamente lo relacionado a pago/periodo
    - [x] sincronice los ciclos persistidos en `STORAGE_KEYS.CICLOS_PAGOS`

## Paso 3 (Compatibilidad de datos)
- [x] Dejar el storage existente con eventos “entrega/no-entrega” pero que NO afecte el cálculo (o migrarlos/borrarlos si hace falta para evitar inconsistencias visuales).
- [x] Actualizar filtros/contadores para que “Entregas” deje de impactar el resumen.

## Paso 4 (Feriados)
- [x] Confirmar que la regla nueva queda cubierta:
  - [x] Ferias se “preguntan” como ahora en `FeriadosScreen.tsx`
  - [x] si un feriado no se entrega, se agrega 1 día extra al final del ciclo de clientes vigentes
  - [x] el calendario del periodo continúa excluyendo feriados como hoy

## Paso 5 (Tests / Validación)
- [x] Ejecutar checks:
  - [x] `npm run typecheck` (`npx tsc --noEmit` exitoso)
- [x] Validación:
  - [x] Ciclos encadenados de forma continua para pagos múltiples.
  - [x] Sincronización completa entre Cobros, Calendario y Clientes.
