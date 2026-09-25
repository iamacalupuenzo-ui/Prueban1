## Segundo refactor — service de transiciones {#service-de-transiciones}

Fecha: 22 de septiembre de 2026.
Estado: implementado.

**Problema:** el primer refactor de esta página (ver más abajo, "Refactor de
arquitectura") bajó `new-capture-order.page.ts` de 2700 a 230 líneas, pero
concentró todo el estado y toda la lógica de negocio en un solo
`capture-orders.service.ts`. Esa regla ("un service por feature") no decía
*qué* debía vivir dentro de ese service, así que volvió a crecer: llegó a
1374 líneas cuando se agregó la carga masiva real con SheetJS (detección de
formato, validación por chunks contra SAP/flota, reconciliación) en la misma
sesión en que se implementó la Bitácora del viaje. Mismo problema en
`recoveries.service.ts` (907 líneas), aunque sin un bloque tan dominante
como el de carga masiva.

**Decisión:** dividir cada service de pantalla en dos, con una regla
mecánica (no de tamaño): `<feature>.service.ts` nunca llama directo a un
método que muta datos del service de datos (`create`/`update`/`close`/
`annul`/`createBulk`/etc.) — esas llamadas y su validación de negocio se
mueven a `<feature>-transitions.service.ts`, un service nuevo sin signals
propios que recibe datos por parámetro y devuelve el resultado tal cual. El
service de pantalla lo inyecta (una sola dirección) y sigue siendo el único
punto de inyección para los componentes hijos — ningún componente cambió sus
imports ni sus bindings de template. El detalle completo de la regla y por
qué existe está en
`docs/lineamientos-estructura-componentes.md#service-de-pantalla-vs-transiciones`,
que es la referencia accionable para la próxima pantalla con mutaciones —
este párrafo es solo el registro de la decisión y su motivo.

**Ejecutado:**

- `capture-orders.service.ts` (1374 → 1210 líneas) delega a
  `capture-orders-transitions.service.ts` (257 líneas nuevas): registrar/
  editar, cerrar, revertir a pendiente, observar, paralizar, marcar
  documento, y la carga masiva completa (lectura/detección de formato,
  validación por chunks, reconciliación de conflictos, confirmación final).
  Esta última es el bloque que más pesaba (~250 líneas) y el que motivó la
  división en esta sesión.
- `recoveries.service.ts` (907 → 893 líneas) delega a
  `recoveries-transitions.service.ts` (52 líneas nuevas): registrar/editar,
  avanzar a gestión, marcar recuperado, cerrar, anular. La reducción es
  menor porque Recuperos no tiene carga masiva — se ejecutó igual, por
  consistencia de patrón entre ambas pantallas, no por tamaño.

**No verificado con `tsc`/`ng build`/`ng test`** — por acuerdo vigente con
Enzo (él corre esas verificaciones). Se revisó a mano que ningún componente
externo importe símbolos removidos de los dos services de pantalla (`grep`
confirmó que solo `CaptureOrdersService`/`RecoveriesService` y el tipo
`DraftField` se importan desde afuera de cada carpeta de feature) y que las
llamadas `this.api.*` que quedaron en cada service de pantalla son de solo
lectura. Pendiente: verificación visual en navegador de carga masiva
(Capturas) y de las transiciones de ciclo de vida (Recuperos).

## Capturas sin registro individual {#capturas-sin-registro-individual}

Fecha: 21 de septiembre de 2026.
Estado: implementado — comentado, no eliminado.

**Decisión de producto:** Capturas no tendrá registro individual de datos.
No se evalúa ni se agrega información orden por orden desde la matriz; la
única vía para dar de alta capturas es la carga masiva (`Carga masiva de
capturas`, ahora botón primario en el header — antes era secundario, junto
al botón de registro individual que existía en ese momento).

**Qué se comentó (no se borró: el sistema de diseño todavía no define cómo
se verá este flujo cuando vuelva, así que el código queda listo para
restaurar):**

- El botón "Registrar captura" del header — `new-capture-order.page.ts`.
- El `<app-capture-order-form-dialog />` (formulario de registro/edición) y
  su entrada en el arreglo `imports` — `new-capture-order.page.ts`.
- La opción "Editar" del menú de acciones por fila, tanto en `actionItems()`
  como en `runAction()` — `capture-order-table.component.ts`.

**Qué NO se tocó, porque no forma parte del registro/edición individual:**

- "Ver detalle" (drawer de solo lectura).
- Las transiciones de ciclo de vida por fila: Cerrar, Observar, Anular.
- `CaptureOrdersService`: `openForm`/`openEdit`/`draft`/`errors`/`validate`
  y el resto de la lógica de formulario siguen intactos, solo dejaron de
  tener un disparador en la UI. Se conservan porque no son "el componente"
  que se pidió comentar, sino el estado que ese componente consumía.

**Pendiente para cuando el sistema de diseño defina el flujo:** decidir si
el registro/edición individual vuelve tal cual estaba, o si el sistema de
diseño impone un patrón distinto (por ejemplo, un componente de formulario
propio en vez del `side-drawer` genérico actual).

# Refactor de arquitectura — `new-capture-order.page.ts`

Fecha: 20 de septiembre de 2026
Estado: **lista para integrar.** Compila (`tsc`/`ng build`), verificada en
navegador (los seis flujos) y `ng test` pasa completo — 9 pruebas, 5
archivos, 0 fallos, corrido por Enzo el 20 de septiembre de 2026 sobre el
worktree. Solo falta decidir cuándo y cómo integrarla a `main` (ver
"Ejecución", "Verificación funcional en navegador", "Reconciliación con el
árbol en vivo" y "Fixture de prueba corregido").

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

**Estado de `ng test`: pasa completo.** Corrido por Enzo el 20 de
septiembre de 2026 sobre `D:\Investigacion\Prueban1-refactor` — 5 archivos
de spec, 9 pruebas, 0 fallos (`app.spec.ts`, `auth.guard.spec.ts`,
`fleet-telemetry.service.spec.ts`, `mock-auth.service.spec.ts`,
`mock-capture-orders.service.spec.ts`). El primer intento se bloqueó por el
fixture desactualizado documentado en "Fixture de prueba corregido"; ya
resuelto.

**Único pendiente real: decidir cuándo y cómo integrar la rama.**

- Las violaciones de tokens listadas en `investigacion-componentes-capturas.md`
  siguen intactas a propósito; no se corrigen en esta rama.
- Falta decidir el mecanismo de integración a `main` (merge, rebase o
  cherry-pick) y reconciliar una última vez contra lo que haya cambiado en
  `D:\Investigacion\Prueban1` entre esta verificación y el momento de
  integrar, si el árbol en vivo se siguió moviendo.

## Fixture de prueba corregido (no relacionado al refactor)

`ng test` falló al primer intento con `TS2345` en
`src/app/core/orders/mock-capture-orders.service.spec.ts` (3 llamadas a
`service.create()` sin el campo `documents`). Se verificó que este archivo
es **idéntico** en `D:\Investigacion\Prueban1` y en este worktree — el
refactor nunca lo tocó. La causa es anterior a todo el trabajo de esta
sesión: `CaptureOrderDraft` ganó el campo obligatorio
`documents: CaptureOrderDocument[]` (para el flujo de documentos de
respaldo) en algún punto del trabajo en paralelo sobre el árbol en vivo,
pero este spec nunca se actualizó con ese campo. `MockCaptureOrdersService.create()`
no valida el contenido de `documents`, así que `documents: []` es un
fixture válido que no cambia el resultado de ninguna prueba. Corregido solo
en este worktree, no en `D:\Investigacion\Prueban1` (decisión de Enzo, para
no tocar el árbol en vivo que sigue en edición).

## Verificación funcional en navegador

Hecha el 20 de septiembre de 2026, sirviendo la rama en `localhost:4300`
(worktree aparte del árbol en vivo, que sigue en `localhost:4200`). Se
probaron los seis flujos a mano, con capturas y lectura del DOM:

- **Filtros** (búsqueda por texto, filtro de estado, rango de fechas) — OK.
- **Tabla** (orden por columna, gestor de columnas mostrando/ocultando,
  paginación) — OK.
- **Registrar captura** — el autocomplete de unidad trae el contexto de
  solo lectura (propietario, última ubicación) al seleccionar; el `Select`
  de fuente funciona; la validación bloqueó el envío sin los 4 documentos
  adjuntos (sin insertar fila nueva en la tabla), igual que el
  comportamiento documentado.
- **Cerrar / Observar / Anular** — cada uno abrió su diálogo, exigió el
  campo requerido cuando aplica (motivo), mostró el toast de confirmación y
  actualizó el estado de la orden en la tabla.
- **Ver detalle** (drawer) — muestra unidad, fuente, fecha, la observación
  recién registrada y la última ubicación.
- **Carga masiva** — el modal abre con la plantilla descargable, la zona de
  arrastre y la validación de formato/tamaño visibles; no se probó el envío
  con un archivo real (no había uno disponible en el entorno de prueba), el
  resto de la lógica de validación ya se confirmó en los otros diálogos.

No se encontró ningún comportamiento roto por la división en 9 archivos.

## Reconciliación con el árbol en vivo

Hecha el 20 de septiembre de 2026. Entre el momento en que arrancó el
refactor y este punto, el árbol en vivo (`D:\Investigacion\Prueban1`) siguió
cambiando en paralelo. Se tomó una snapshot no destructiva del estado actual
del árbol en vivo (`git stash create`, sin tocar su working tree) y se
comparó contra la snapshot original de la que partió esta rama
(`git diff <snapshot-inicial> <snapshot-actual>`). El delta real fue
pequeño — 2 archivos, 17 inserciones y 16 eliminaciones — y se reaplicó a
mano sobre los archivos ya divididos:

- Tamaño del ícono de copiar: `14` → `12` px, en
  `capture-order-table.component.ts`, `capture-order-detail-drawer.component.ts`
  y `dialogs/capture-order-bulk-upload-dialog.component.ts`.
- `CaptureOrdersService.showMessage()` ganó un parámetro `duration`
  (default `4000`); `copyBulkUnitCode()` y `copyLastLocation()` ahora
  muestran un toast de confirmación de 2000ms ("Código de unidad copiado" /
  "Ubicación copiada").
- En `src/styles.css`, la clase `.bulk-error-unit-copy` se renombró a
  `.copy-on-hover` (generalizada) — esto **resuelve** la inconsistencia que
  el registro de decisiones de más arriba había documentado como
  preexistente (los templates ya usaban `copy-on-hover` pero la regla CSS
  todavía se llamaba `.bulk-error-unit-copy`). Ya no aplica esa nota.

Verificado: `tsc --noEmit` y `ng build` limpios después de la reconciliación;
el árbol en vivo nunca fue tocado (confirmado con `git status` antes y
después). La lógica de copiado al portapapeles no se pudo verificar
visualmente en el navegador de prueba porque el permiso `clipboard-write`
está denegado en ese entorno (`NotAllowedError`, confirmado con
`navigator.permissions.query`) — es una limitación del navegador de
automatización, no del código; la revisión fue por lectura directa del
código reconciliado contra el diff original.
