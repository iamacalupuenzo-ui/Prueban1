# Refactor de arquitectura — `new-capture-order.page.ts`

Fecha: 20 de septiembre de 2026
Estado: ejecución completada en una rama aislada, pendiente de revisión
humana antes de integrar (ver "Ejecución").

## Problema

`src/app/features/capture-orders/new-capture-order.page.ts` concentra en un
solo archivo standalone: filtros de la matriz (búsqueda, estado, rango de
fechas con popover propio), la tabla con gestor de columnas y exportación,
el formulario de registro/edición, el diálogo de observación, el de
anulación, el de cierre, la carga masiva por archivo, y el template y los
estilos completos inline. Al momento de este documento tiene más de 2700
líneas y ~194 miembros `protected`/`private` (signals, computed, métodos)
en una sola clase.

## Evidencia de que esto rompe estándares reales del ecosistema, no solo estética

Se investigó la guía oficial de Angular, reglas de lint del ecosistema y un
repositorio Angular real de referencia. Verificado por fuente directa (no
solo la palabra de la investigación inicial):

- La guía oficial vigente ([angular.dev/style-guide](https://angular.dev/style-guide))
  **no fija un número de líneas**; delega el criterio de división al equipo.
  Cualquier cifra "oficial" de Angular sobre líneas máximas que circule por
  ahí corresponde a la guía de estilo antigua (John Papa/angular.io), ya no
  vigente — no se cita aquí como regla actual.
- `@angular-eslint/component-max-inline-declarations` sí es una regla real y
  vigente del plugin oficial de lint para Angular: el default es **3 líneas**
  para template y estilos inline dentro del `.ts`. Este archivo tiene ambos
  con cientos/miles de líneas inline — viola esta regla por un margen enorme,
  no marginal. [Fuente](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/component-max-inline-declarations.md)
- La regla genérica `max-lines` de ESLint tiene default **300 líneas** por
  archivo. Este archivo tiene 2703 — 9 veces ese umbral.
  [Fuente](https://eslint.org/docs/latest/rules/max-lines)
- [ngx-admin](https://github.com/akveo/ngx-admin) (25.7k estrellas, dashboard
  Angular de referencia) separa cada diálogo/modal en su propia carpeta con
  `.ts`/`.html`/`.scss` independientes — verificado directamente en su
  repositorio, no solo citado de memoria.
- El patrón smart/dumb component (contenedor con estado vs. componentes de
  presentación) es el estándar más citado en la comunidad Angular para este
  tipo de pantalla. [Angular University](https://blog.angular-university.io/angular-2-smart-components-vs-presentation-components-whats-the-difference-when-to-use-each-and-why/)

## Estructura objetivo

```
capture-orders/
├── new-capture-order.page.ts          ← shell: orquesta, inyecta el servicio, decide qué diálogo está abierto
├── capture-orders.service.ts          ← signals de estado, validación, orquesta mock-capture-orders.service.ts
├── capture-order-toolbar.component.ts ← búsqueda, filtro de estado, rango de fechas (con su popover)
├── capture-order-table.component.ts   ← tabla + gestor de columnas + menú de descarga
├── capture-order-detail-drawer.component.ts ← detalle de una orden (usa shared/side-drawer.component.ts)
└── dialogs/
    ├── capture-order-form-dialog.component.ts       (registro/edición)
    ├── capture-order-observation-dialog.component.ts
    ├── capture-order-close-dialog.component.ts
    ├── capture-order-annul-dialog.component.ts
    └── capture-order-bulk-upload-dialog.component.ts
```

**Corrección de criterio:** se verificó que ningún componente existente del
proyecto (`unit-autocomplete.component.ts`, `unit-type-multi-select.component.ts`,
`side-drawer.component.ts`, `operations-layout.component.ts`, etc.) separa
template/estilos en archivos `.html`/`.css` — todos usan `template`/`styles`
inline dentro del `.ts`, sin excepción. La regla `component-max-inline-declarations`
(default 3 líneas) es real, pero adoptarla ahora rompería la consistencia
con el resto de la aplicación, que el usuario pidió explícitamente preservar
("mantener el mismo estilo y estándar"). Se prioriza la consistencia interna
del proyecto: los componentes nuevos mantienen `template`/`styles` inline,
igual que todo lo demás. Cada uno queda de todas formas muchísimo más chico
(decenas a un par de cientos de líneas, no miles), que es el problema real
que se está resolviendo. Esto queda registrado como una desviación
consciente frente a la regla de lint del ecosistema, no como un
desconocimiento de ella.

## Alcance explícito — qué NO hace este refactor

- **No es un rediseño.** Es una extracción estructural: el comportamiento,
  el markup renderizado, las clases CSS y los valores de estilo se preservan
  exactamente como están hoy, incluyendo las violaciones de tokens ya
  registradas en `investigacion-componentes-capturas.md` (esas se corrigen
  aparte, no se mezclan con este cambio para no complicar la revisión).
- **No cambia contratos públicos observables**: mismas rutas, mismo
  comportamiento de filtros/tabla/diálogos, misma validación, mismos
  mensajes al operador.
- **No ejecuta `ng test`.** Por acuerdo con Enzo, las pruebas las corre él
  para no gastar tokens en eso. Sí se verifica que el proyecto compile
  (`ng build` o `tsc --noEmit`) como piso mínimo de sanidad — no es una
  prueba funcional, es solo confirmar que no queda código roto.

## Por qué se ejecuta en una rama/worktree aislado

El archivo original sigue cambiando en vivo por otra persona/proceso durante
esta misma sesión (creció de 2245 a 2703 líneas sin ninguna acción de este
lado). Mover 2700 líneas a 10 archivos nuevos directamente sobre el árbol de
trabajo activo arriesga pisar esos cambios en paralelo. Por eso la ejecución
ocurre en un worktree Git separado; el resultado queda como una rama que se
revisa y se integra cuando Enzo lo decida, sin tocar el working tree en uso
mientras tanto.

## Registro de decisiones de ejecución

Fecha: 20 de septiembre de 2026.

- **Los componentes hijos inyectan `CaptureOrdersService` directo con
  `inject()`, en vez de recibir el estado por `@Input`/`@Output`.** La
  estructura objetivo listaba servicio + seis componentes coordinados sobre
  una sola pantalla (filtros que afectan la tabla, tabla que abre el
  detalle, detalle que abre otros tres diálogos). Prop-drilling de ese
  volumen de estado a través de decenas de `@Input`/`@Output` habría sido
  más código, más superficie de error al mover 2700 líneas, y no habría
  reducido acoplamiento real — solo lo habría movido de la clase de la
  página a los bindings de plantilla del shell. El servicio expone signals
  públicos (`readonly`, pero escribibles vía `.set()`/`.update()`, igual que
  ya hacía la página original con sus propios signals `protected readonly`)
  y cada componente hijo lee/escribe solo lo que le corresponde.
- **`CaptureOrdersService` concentra casi todo el estado de negocio**:
  filtros, orden, paginación, borrador/validación del formulario, mensaje de
  retroalimentación (toast), retroalimentación de "copiado" al portapapeles,
  y las cinco transiciones de ciclo de vida (registrar/editar, cerrar,
  observar, anular, carga masiva). Lo que se dejó fuera del servicio es
  deliberado: cada pieza excluida es UI que un único componente consume y
  que no participa del pipeline de datos compartido.
- **La visibilidad/orden de columnas, el menú de acciones por fila, el menú
  de descarga y la sombra de scroll de "Acciones" quedaron como estado local
  de `CaptureOrderTableComponent`.** Solo la tabla los usa; moverlos al
  servicio habría inflado su superficie pública sin ningún otro consumidor.
  Lo mismo aplica al popover de rango de fechas (`dateRangeOpen` y la lógica
  de selección de dos clics) en `CaptureOrderToolbarComponent`: opera sobre
  `dateFrom`/`dateTo` del servicio (esos sí afectan el filtrado de la
  tabla), pero el estado de "¿está abierto el popover?" es puramente local.
- **Las listas de opciones estáticas (`sourceOptions`, `statusOptions`,
  `documentDefinitions`, `pageSizeOptions`, `exportOptions`,
  `bulkErrorColumns`) se movieron cada una al componente que las consume**,
  no al servicio. Ninguna se comparte entre dos componentes; centralizarlas
  en el servicio solo habría agregado indirección.
- **El formulario de registro/edición y su modal de confirmación quedaron en
  un solo componente** (`dialogs/capture-order-form-dialog.component.ts`)
  en vez de dos. Son dos pasos del mismo flujo (`requestSubmission` abre la
  confirmación; `closeConfirmation` regresa al formulario) y ya comparten
  `draft`/`errors`/`editingOrder` en el servicio — separarlos no habría
  reducido acoplamiento, solo agregado un archivo más para coordinar la
  misma transición.
- **La retroalimentación de "copiado al portapapeles" (`copiedLocation`,
  `copiedBulkUnitCode`) se mantuvo centralizada en el servicio**, compartida
  entre la celda de última ubicación de la tabla, el detalle de la orden y
  la carga masiva. El comportamiento original usaba una sola señal por tipo
  de dato copiado, de forma que copiar en un lugar apagaba el aviso
  "copiado" de cualquier otro; repartir esa señal por componente habría
  cambiado ese comportamiento observable, algo fuera de alcance de este
  refactor.
- **`CaptureOrderTableComponent` y `CaptureOrderDetailDrawerComponent` usan
  `:host { display: contents; }`.** `.matrix-section` en el shell es un CSS
  grid con cuatro filas explícitas (`grid-template-rows: auto auto auto
  minmax(min-content, 1fr)`) que antes coincidían con cuatro hijos directos
  (encabezado, toolbar, utilidades de tabla, área de tabla). Con la tabla
  ahora envuelta en un componente propio que renderiza dos bloques raíz
  (`.table-utilities` y `.table-area`), `display: contents` hace que el host
  del componente no genere su propia caja y sus hijos pasen a ser los
  elementos de grid directos de `.matrix-section`, preservando el layout
  original sin tocar sus reglas CSS. El drawer de detalle recibió el mismo
  tratamiento por consistencia, aunque su único hijo (`app-side-drawer`) se
  porta a `document.body` de todas formas y no participa del grid.
  `CaptureOrderToolbarComponent` no lo necesitó: envuelve un único
  `<div class="matrix-toolbar">`, así que su host en modo bloque ocupa el
  mismo lugar que antes ocupaba ese div directamente.
- **Las reglas CSS pequeñas compartidas por más de un diálogo
  (`.dialog-content`, `.dialog-content--reason`, `.confirmation-content`,
  `.form-field`, `.required-marker`, `.field-error`, `.dialog-copy p`,
  `.visually-hidden`) se duplicaron en cada componente que las usa**, en vez
  de crear una hoja de estilos compartida nueva. Angular encapsula los
  estilos por componente (`ViewEncapsulation.Emulated`, el default del
  proyecto) y ningún componente existente del proyecto importa una hoja de
  estilos compartida entre componentes — `unit-autocomplete.component.ts` y
  `unit-type-multi-select.component.ts` ya duplicaban patrones similares
  (`.field-error`, estilos de `label`) en vez de compartirlos. Introducir un
  archivo de estilos compartido habría sido una desviación de ese patrón
  existente, no una extracción. Las reglas que ya vivían en `src/styles.css`
  como selectores globales (`.selected-unit-summary`, `.document-section*`,
  `.detail-*`, `.bulk-*`, `.capture-surface-modal`, etc.) no se tocaron ni
  se duplicaron: siguen aplicando porque los nuevos componentes conservan
  exactamente los mismos nombres de clase en el markup.
- **Se preservó la clase `copy-on-hover` tal como estaba, sin la regla CSS
  que le correspondería** (el proyecto original la usa en tres lugares —
  celda de última ubicación, código de unidad rechazado en carga masiva y
  dirección en el detalle — pero nunca definió `.copy-on-hover` ni en el
  archivo ni en `styles.css`; la clase real `.bulk-error-unit-copy` de
  `styles.css` quedó sin uso). Es una inconsistencia preexistente, ya
  señalada indirectamente por la auditoría de conformidad de
  `investigacion-componentes-capturas.md`; corregirla es un cambio visual
  fuera del alcance de este refactor estructural, así que se mantiene
  intacta para que la corrección (cuando se haga) sea un diff limpio.
- **No se tocó `src/styles.css` ni `docs/investigacion-componentes-capturas.md`**,
  conforme al alcance explícito del refactor.

## Ejecución

Completado el 20 de septiembre de 2026, en la rama `refactor/split-new-capture-order`
del worktree `D:\Investigacion\Prueban1-refactor`.

**Archivos creados:**

- `src/app/features/capture-orders/capture-orders.service.ts` — estado,
  validación y orquestación de `MockCaptureOrdersService`.
- `src/app/features/capture-orders/capture-order-toolbar.component.ts`
- `src/app/features/capture-orders/capture-order-table.component.ts`
- `src/app/features/capture-orders/capture-order-detail-drawer.component.ts`
- `src/app/features/capture-orders/dialogs/capture-order-form-dialog.component.ts`
- `src/app/features/capture-orders/dialogs/capture-order-observation-dialog.component.ts`
- `src/app/features/capture-orders/dialogs/capture-order-close-dialog.component.ts`
- `src/app/features/capture-orders/dialogs/capture-order-annul-dialog.component.ts`
- `src/app/features/capture-orders/dialogs/capture-order-bulk-upload-dialog.component.ts`

**Archivo reescrito:** `src/app/features/capture-orders/new-capture-order.page.ts`,
de ~2750 líneas a un shell delgado (~230 líneas) que inyecta el servicio y
compone los componentes de arriba.

**Estado final de compilación:** `npx tsc --noEmit -p tsconfig.app.json` y
`npm run build` (`ng build`) terminan sin errores ni advertencias, incluido
el presupuesto de estilos por componente. No se ejecutó `ng test` por
acuerdo explícito con Enzo.

**Pendiente de revisión humana antes de integrar la rama:**

- Verificación visual/manual en navegador de los seis flujos (filtros,
  tabla con columnas/orden/paginación, registro y edición, cierre,
  observación, anulación, carga masiva) — este refactor solo verificó
  compilación, no comportamiento en tiempo de ejecución ni `ng test`.
- Confirmar que el archivo original no siguió cambiando en el working tree
  activo (`D:\Investigacion\Prueban1`) de forma que genere conflictos no
  triviales al integrar esta rama.
- Las violaciones de tokens y la inconsistencia de `copy-on-hover` listadas
  en `investigacion-componentes-capturas.md` siguen intactas a propósito;
  no se corrigen en esta rama.
