# Reconciliación de cargas masivas — Capturas

Fecha: 22 de septiembre de 2026.
Estado: **etapas 1, 2 y 3 implementadas** (Financiera real, reconciliación automática y resolución de conflictos). Pendiente: historial de cargas (ver abajo).

## Contexto de negocio

Cada carga masiva de capturas pertenece a un grupo de aseguradoras — hoy solo
Santander y Mapfre. Un archivo puede traer unidades de una sola financiera o
de ambas mezcladas; la financiera se identifica por fila (columna del
archivo), no por una elección previa al subir.

La información de la matriz **no es estática**: cada carga es una foto
completa de lo que esa aseguradora considera activo en ese momento. Cuando
llega una carga nueva:

- Lo que ya no aparece en la lista de su financiera, y que el sistema nunca
  tocó manualmente (sigue `Pendiente`), pasa solo a `Capturado` — sin pedir
  confirmación. Es el caso esperado: su ausencia se interpreta como "ya no
  la piden, probablemente se capturó".
- Lo que el sistema sí modificó manualmente y la carga contradice, **no se
  autocierra**: queda marcado para revisión humana. Dos escenarios posibles:
  - Estaba `Observado` (alguien lo tocó) y ya no aparece en la lista nueva.
  - Estaba `Capturado`/`Paralizado` (ya resuelto) pero la lista nueva lo
    sigue reportando activo.
- En ambos casos el conflicto es "¿qué dato conservamos: el que ya existe en
  el sistema, o el de la carga que se acaba de subir?" — decisión que le
  corresponde a una persona.

Con el tiempo esto deja bastante historial: cada carga puede cerrar decenas
de órdenes y marcar otras en conflicto, todo registrado en el `auditTrail`
de cada orden.

## Qué se implementó (etapas 1 y 2)

- **`Financiera` pasó de dato decorativo a dato real.** Antes se inventaba
  con un hash sobre `unitCode` (`financialEntityOf`, ya eliminado); ahora es
  un campo real de `CaptureOrderDraft`/`CaptureOrder`
  (`core/orders/mock-capture-orders.service.ts`), poblado desde la fila del
  archivo cargado. De paso, "MAF" se corrigió a "Mapfre" (nombre completo)
  en todo el código y el fixture.
- **Reconciliación automática** en `MockCaptureOrdersService.createBulk()`:
  recibe además de los borradores a crear (`drafts`) la lista completa de
  unidades subidas (`uploadedUnits: BulkReconciliationUnit[]` — incluye las
  rechazadas por duplicado, porque esas siguen "en la lista", solo no
  generan una orden nueva). Por cada financiera presente en la carga,
  recorre todas las órdenes existentes de esa financiera y aplica las
  cuatro reglas de arriba (auto-cierre, conflicto por ausencia, conflicto
  por presencia, limpieza de conflicto si vuelve a coincidir).
- **Campos nuevos en `CaptureOrder`:** `hasConflict?: boolean` y
  `conflictNote?: string`. La tabla (`capture-order-table.component.ts`)
  muestra un tag "Conflicto" (severidad `warn`) junto al tag de estado
  cuando `hasConflict` es `true`, con el motivo en el `title` nativo.
- **Fixture** (`public/mock-data/capture-orders.json`): se le agregó
  `financiera` a los 80 registros, calculado con el mismo hash que ya
  determinaba el valor visible antes del cambio, para que ningún registro
  existente cambiara de financiera visualmente.

## Qué se implementó (etapa 3 — resolución de conflictos)

- **`MockCaptureOrdersService.resolveConflict(id, choice)`**, con
  `choice: 'keep-system' | 'accept-upload'`. `keep-system` solo apaga
  `hasConflict`; `accept-upload` además cambia el estado — si la orden
  estaba `Observado` (conflicto por ausencia) pasa a `Capturado`, si estaba
  `Capturado`/`Paralizado` (conflicto por presencia) vuelve a `Pendiente`.
  Ambos casos quedan en el `auditTrail`.
- **`CaptureOrdersService`**: signals `conflictOrder`/`conflictOpen` +
  `openConflictResolution()`/`closeConflictResolution()`/`resolveConflict()`.
- **Diálogo nuevo** `dialogs/capture-order-conflict-dialog.component.ts`:
  muestra `conflictNote` y dos botones con la etiqueta del resultado exacto
  ("Conservar Observado" / "Actualizar a Capturado", calculados de forma
  reactiva), sin un tercer botón "Cancelar" — cerrar el diálogo sin elegir
  deja el conflicto tal como estaba.
- **Entrada punto único:** "Resolver conflicto" en el menú de acciones de la
  fila (`capture-order-table.component.ts`), visible solo cuando
  `order.hasConflict` es `true`.
- El menú de acciones por fila se ensanchó de 139px a 208px porque las
  etiquetas nuevas ("Marcar como capturado", "Resolver conflicto",
  "Paralizar captura") no entraban.

## Qué queda pendiente

- **Historial de cargas.** No existe todavía una vista que liste las cargas
  masivas realizadas (financiera, fecha, cuántas se crearon/cerraron/
  quedaron en conflicto) — hoy esa información solo vive repartida en el
  `auditTrail` de cada orden y en el toast de confirmación del momento.

## Contrato: de booleano a 3 estados

Relacionado pero independiente de la reconciliación: la columna "Contrato"
dejó de ser un booleano (`Con contrato`/`Sin contrato`, vía
`hasContractOf()`, ya eliminado) y pasa a 3 estados
(`CAPTURE_CONTRACT_STATUSES` en `mock-capture-orders.service.ts`):

- **Activo** — contrato vigente con nosotros.
- **Sin contrato** — nunca tuvo contrato con nosotros. Estas unidades nunca
  muestran última ubicación (`locationOf()` devuelve `null`): no hay GPS
  nuestro que pudiera haber reportado una posición.
- **No vigente** — tuvo contrato, hoy desactivado/vencido. Es la señal para
  investigar manualmente si el GPS de la unidad sigue activo y se puede
  recuperar su ubicación, distinta de una unidad que nunca fue nuestra.

Motivo: la validación real será contra una base de datos de SAP (no
integrada todavía), que puede revalidar unidades que sí tuvieron relación
con la empresa pero ya no la tienen vigente — ese matiz se pierde con un
simple sí/no. Sigue siendo demo determinística por unidad
(`contractStatusOf()`), no un dato real todavía; la integración con SAP
queda fuera de alcance de este cambio.
