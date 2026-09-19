# Auditoría de órdenes de captura — definición futura

Fecha: 18 de septiembre de 2026
Estado: documentado, no implementado.

## Decisión de alcance

El drawer de detalle tiene un propósito operativo: presentar el estado actual de
una orden y la secuencia de transiciones que la llevaron a ese estado. No debe
incluir cambios de campos como expediente, fuente o unidad.

La auditoría es una capacidad distinta. Permitirá responder quién modificó qué,
cuándo, desde qué origen y con qué valores antes y después. Se implementará en
una vista dedicada, no dentro del drawer.

## Relación con el drawer actual

El drawer muestra únicamente estos eventos:

- Creación de la orden, como inicio del ciclo de vida.
- Cambio de estado: Registrada, En revisión, Con observación y Cerrada.
- Anulación, incluido su motivo.

Una anulación queda registrada en ambos contextos cuando exista auditoría: como
transición operacional en el drawer y como evento trazable con detalle completo
en la auditoría.

## Estructura de datos propuesta

Cada evento de auditoría debe conservarse de forma inmutable:

| Campo | Propósito |
| --- | --- |
| `id` | Identificador único del evento. |
| `captureOrderId` | Orden de captura relacionada. |
| `occurredAt` | Fecha y hora con zona horaria. |
| `actor` | Usuario, integración o proceso que ejecutó la acción. |
| `eventType` | Creación, edición, cambio de estado, anulación o reintento. |
| `field` | Campo afectado cuando el evento es una edición. |
| `previousValue` | Valor anterior, si aplica. |
| `newValue` | Valor resultante, si aplica. |
| `reason` | Motivo de observación, anulación o corrección, si aplica. |
| `source` | Origen técnico: web, integración o proceso automático. |
| `correlationId` | Identificador para diagnóstico y trazabilidad entre servicios. |

## Vista futura de auditoría

La auditoría debe abrirse como vista o ruta independiente con tabla, filtros y
paginación. Columnas iniciales:

| Fecha y hora | Actor | Evento | Campo | Valor anterior | Valor nuevo | Motivo |
| --- | --- | --- | --- | --- | --- | --- |

Filtros mínimos: rango de fechas, actor y tipo de evento. Para registros con
muchas modificaciones, la tabla consulta y pagina del lado del servidor; no
carga el historial completo al abrir el drawer.

## Reglas de producto pendientes

- Definir qué roles pueden consultar auditoría y durante cuánto tiempo.
- Acordar qué datos requieren enmascaramiento en valores anteriores y nuevos.
- Definir la fuente de identidad del actor y la zona horaria oficial.
- Confirmar si la auditoría se exporta y qué permisos exige esa exportación.
