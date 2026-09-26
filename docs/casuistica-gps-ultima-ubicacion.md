# Casuística GPS / Última ubicación — Capturas

Decisión de Producto registrada el 2026-09-25, a partir del pedido explícito
de mapear qué se muestra en las columnas "GPS" y "Última ubicación" de la
matriz de Capturas según cada combinación de contrato y frescura del reporte
de posición.

## Matriz completa

| Contrato | ¿Reportó posición alguna vez? | Antigüedad del último reporte | Columna GPS | Columna "Última ubicación" |
|---|---|---|---|---|
| Sin contrato | — (nunca tuvo GPS nuestro) | — | `Sin GPS` (secondary) | "Sin posición disponible" |
| Activo / No vigente | No | — | `Sin señal` (warn) | "Sin posición disponible" |
| Activo / No vigente | Sí | ≤ 30 días | `Con GPS` (success) | Fecha · dirección reales |
| Activo / No vigente | Sí | > 30 días | `Con GPS` (success) | "Sin ubicación en los últimos 30 días" |

## Decisiones explícitas (confirmadas con el usuario, no inferidas)

1. **La antigüedad del reporte NO cambia el estado de la columna GPS.** Una
   unidad que reportó hace 45 días sigue diciendo "Con GPS" — la columna GPS
   responde solo "¿la unidad tiene/tuvo GPS nuestro?", no "¿el dato de
   posición es confiable ahora?". Esa segunda pregunta la resuelve solo la
   columna "Última ubicación".
2. **Un reporte de más de 30 días se trata como no disponible, no como un
   dato viejo que se muestra igual.** Se reemplaza la fecha/dirección real
   por el aviso "Sin ubicación en los últimos 30 días" — mostrar una
   dirección de hace más de un mes como si fuera la posición actual induce a
   operar sobre un dato no confiable.

## Alcance de la regla de 30 días

Solo aplica a snapshots reales de carga masiva
(`CaptureOrder.lastPositionAt`, ver `docs/reconciliacion-cargas-masivas-capturas.md`
— es el timestamp que viene de cruzar placa+motor contra `FleetTelemetryService`
al momento de la carga). El fixture demo (`UNIT_OPTIONS` en
`capture-orders.service.ts`) no tiene una fecha propia rastreable por unidad
(son strings ya formados a mano) y no se marca como vencido — es dato de
demo heredado, no el camino real de "GPS" que valida esta regla.

## Implementación

- `CaptureOrdersService.locationIsStaleOf(unitCode)` — único punto que decide
  si un reporte está vencido (umbral `STALE_LOCATION_DAYS = 30`).
- `CaptureOrdersService.gpsStatusLabelOf`/`gpsStatusSeverityOf` — **no**
  llaman a `locationIsStaleOf`, a propósito (decisión 1).
- `capture-order-table.component.ts#lastLocationCell` — es el único lugar que
  sí llama a `locationIsStaleOf` para decidir qué texto mostrar.

## Filtros del toolbar (agregado 2026-09-25)

El filtro "Ubicación" se dividió en dos, con semántica distinta:

- **GPS** (`gpsFilter`/`matchesGpsFilter`) — "¿tiene GPS?", mismas tres
  categorías de la columna GPS (`Con GPS`/`Sin señal`/`Sin GPS`), sin
  importar si el reporte está vencido.
- **Ubicación** (`locationFilter`/`matchesLocationFilter`) — "¿el dato de
  posición sirve para operar ahora?": `with` (vigente), `stale` (vencida,
  >30 días), `none` (sin posición). No le importa la razón (sin GPS o con
  GPS pero sin reportar es lo mismo acá).

También se agregó el filtro **Documentos** (`documentsFilter`, multi-select
con checkbox vía `UnitTypeMultiSelectComponent`, reutilizado tal cual —
mismo componente que "Tipo de unidad" en Capturas/Recuperos): selección
vacía o completa = sin filtro; con selección parcial, la orden debe tener
marcados TODOS los tipos seleccionados (AND, no basta con uno — decisión
explícita del usuario).

## Mapa (`appearsOnMap`/`mapStatusReason`) — actualizado 2026-09-25

Se resolvió la pregunta que quedó pendiente arriba: una unidad con posición
vencida (>30 días) NO aparece en el mapa. Reglas completas, en orden de
evaluación (la primera que aplica es el motivo mostrado):

1. `order.status !== 'Pendiente'` → fuera del mapa (Observado, Capturado y
   Paralizado, sin excepción). Observado se agregó explícitamente — antes
   solo excluía Capturado/Paralizado; el pedido fue "observado tampoco se
   muestra" (normalmente se observa por falta de Requisitoria, pero se
   excluye por estado, no por conteo de documentos, para cubrir cualquier
   otro motivo de observación).
2. `hasRequiredMapDocuments(order)` — **revierte la decisión del 23 sep.**:
   ahora exige los 4 documentos (antes excluía la Requisitoria a propósito).
3. `locationOf(order.unitCode)` — tiene una posición conocida.
4. `!locationIsStaleOf(order.unitCode)` — esa posición no tiene más de 30
   días.

## Fuera de alcance de este cambio
