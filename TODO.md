# TODO - Refactor: sacar “entregas/no-entregas” y manejar por periodos + feriados

## Paso 1 (Plan técnico)
- [ ] Identificar todas las dependencias del sistema de “entregas”:
  - tipos/variables/mecánicas en `src/screens/MiVianda/CobrosScreen.tsx`
  - cualquier uso de `tipo === "entrega" | "entrega-deuda" | "no-entrega"`
  - cualquier cálculo de `comidasDesdePago` dependiente de eventos de entrega
  - cualquier UI que permita marcar entregas/no-entregas
- [ ] Definir la nueva fuente de verdad:
  - `comidasDesdePago` calculado por tiempo (días hábiles entre `fechaInicioCiclo` y hoy, excluyendo fines de semana y feriados)
  - compensación de feriados ya existente vía `comidasReponer`/`getClientCycleDays()`

## Paso 2 (Código principal)
- [ ] Refactor de `src/screens/MiVianda/CobrosScreen.tsx`:
  - [ ] Eliminar helpers y acciones de “Entregas” (marcar entregado/no-entregado, pendientes, deudas, etc.)
  - [ ] Eliminar modal y secciones “Entregas” de la UI
  - [ ] Modificar `recalcularEstadoCliente()` para calcular `comidasDesdePago` SOLO por calendario/periodo (no por eventos de entrega)
  - [ ] Modificar `procesarPago()` para que:
    - [ ] deje de auto-generar eventos de entrega
    - [ ] actualice únicamente lo relacionado a pago/periodo

## Paso 3 (Compatibilidad de datos)
- [ ] Dejar el storage existente con eventos “entrega/no-entrega” pero que NO afecte el cálculo (o migrarlos/borrarlos si hace falta para evitar inconsistencias visuales).
- [ ] Actualizar filtros/contadores para que “Entregas” deje de impactar el resumen.

## Paso 4 (Feriados)
- [ ] Confirmar que la regla nueva queda cubierta:
  - [ ] Ferias se “preguntan” como ahora en `FeriadosScreen.tsx`
  - [ ] si un feriado no se entrega, se agrega 1 día extra al final del ciclo de clientes vigentes
  - [ ] el calendario del periodo continúa excluyendo feriados como hoy

## Paso 5 (Tests / Validación)
- [ ] Ejecutar checks:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
- [ ] Validación manual:
  - [ ] Cliente con ciclo inicial 20 (viandas por semana siguen iguales por el conteo de días del ciclo).
  - [ ] Registrar un pago y verificar que el sistema avanza en función de días hábiles + compensación por feriados.
  - [ ] Confirmar que ya no existe interacción de “entregas/no-entregas”.
