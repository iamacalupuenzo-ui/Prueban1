# Lineamientos de estructura para páginas y componentes — FleetOperations

Fecha: 20 de septiembre de 2026
Contexto: extraído del refactor de `new-capture-order.page.ts` (ver
`docs/arquitectura-new-capture-order.md` para la evidencia completa, el
detalle línea por línea y el registro de decisiones). Este documento es el
resumen accionable para empezar a construir con el mismo criterio, no repite
la investigación.

## Por qué existe esta regla

Un componente de página que llegó a 2700+ líneas mezclando filtros, tabla,
formulario y cinco diálogos en un solo archivo. Rompe reglas reales del
ecosistema Angular (no solo "se ve feo"):

- `@angular-eslint/component-max-inline-declarations` — default 3 líneas
  para template/estilos inline.
- `max-lines` de ESLint — default 300 líneas por archivo.

Referencia real: [ngx-admin](https://github.com/akveo/ngx-admin), un
dashboard Angular con 25.7k estrellas, separa cada diálogo/modal en su
propio componente. Nosotros seguimos ese mismo criterio de fondo — un
archivo, una responsabilidad — con un ajuste de estilo propio (ver abajo).

## Cuándo dividir

Si una pantalla necesita más de una de estas piezas a la vez — filtros +
tabla + formulario de alta/edición + algún diálogo de acción — **no va en
un solo componente de página**. Se divide desde el diseño inicial, no
después de que crezca.

## Estructura por feature

```
<feature>/
├── <feature>.page.ts                    ← shell: orquesta, inyecta el service, decide qué diálogo está abierto
├── <feature>.service.ts                 ← estado compartido (signals), validación, llamadas a los servicios de datos
├── <feature>-toolbar.component.ts       ← filtros/búsqueda de esa pantalla, si aplica
├── <feature>-table.component.ts         ← tabla + sus utilidades (columnas, exportar, orden), si aplica
├── <feature>-detail-drawer.component.ts ← detalle de un registro, si aplica
└── dialogs/
    ├── <feature>-<accion>-dialog.component.ts   ← uno por cada acción con su propio diálogo/modal
    └── ...
```

Nombres en kebab-case, un componente por archivo. El shell (`<feature>.page.ts`)
queda delgado: arma el layout, compone los hijos, decide visibilidad de
diálogos. No contiene lógica de negocio ni el detalle de cada formulario.

## Estilo: template y estilos inline, SIEMPRE dentro del `.ts`

**No crear archivos `.html`/`.css` separados**, aunque esa sea la
recomendación por defecto del lint de Angular. Todo componente existente en
este proyecto (`unit-autocomplete.component.ts`, `side-drawer.component.ts`,
`operations-layout.component.ts`, etc.) usa `template`/`styles` inline
dentro del `.ts`, sin excepción — es una decisión consciente de
consistencia interna, no un descuido. Dividir en componentes más chicos ya
resuelve el problema real (ningún archivo nuevo debería acercarse a las
cientos de líneas, mucho menos miles); no hace falta además separar
template/estilos a archivos aparte para lograrlo.

## Estado: un service por feature, no prop-drilling

- El estado que más de un componente hijo necesita leer o escribir (datos,
  filtros, selección activa, mensajes de feedback) vive en
  `<feature>.service.ts` como signals.
- Los componentes hijos **inyectan el service directo con `inject()`**, no
  lo reciben por `@Input`/`@Output`. Prop-drilling de un volumen grande de
  estado a través de varios niveles agrega código y superficie de error sin
  reducir acoplamiento real.
- Estado que **un solo componente** usa (¿está abierto este popover
  puntual?, ¿qué fila tiene el menú de acciones abierto?) se queda local en
  ese componente — no se sube al service "por las dudas".

## Service de pantalla vs. service de transiciones {#service-de-pantalla-vs-transiciones}

Regla mecánica, sin criterio de tamaño de por medio — aplica desde el primer
día de una pantalla, no cuando "ya se sintió grande":

- **`<feature>.service.ts` (service de pantalla) nunca llama directo a un
  método que muta datos** del service de datos (`core/<dominio>/mock-*.service.ts`)
  — nada de `create`, `update`, `close`, `annul`, `createBulk`, etc. Sí puede
  leer libremente (`orders()`, `fixturesLoading`, `loadFixtureOrders()`,
  `hasActiveXOrder()`): las lecturas no son el problema, las mutaciones con
  su validación de negocio sí.
- **Toda mutación y su validación de negocio vive en
  `<feature>-transitions.service.ts`** — un service `@Injectable({providedIn:'root'})`
  nuevo, sin signals propios (o casi ninguno): recibe datos por parámetro,
  llama al service de datos, devuelve el resultado tal cual (`{kind:'success'|...}`).
  No conoce diálogos, ni toasts, ni qué está abierto en pantalla.
- **El service de pantalla sigue siendo el único punto de inyección para los
  componentes hijos** — toolbar, tabla, drawer y diálogos jamás inyectan el
  service de transiciones directamente. El de pantalla lo inyecta a él
  (dependencia en una sola dirección, nunca al revés) y sus métodos existentes
  (`confirmClose()`, `register()`, etc.) pasan a ser un wrapper: llaman al de
  transiciones, y con el resultado actualizan sus propios signals (toast,
  cerrar diálogo, refrescar selección). Esto significa que **ningún componente
  cambia sus imports ni sus bindings de template** cuando se hace esta
  división — es un cambio interno del service de pantalla.
- Ejecutado en `capture-orders.service.ts` → `capture-orders-transitions.service.ts`
  (se llevó la carga masiva completa: lectura/detección de formato,
  validación por chunks contra SAP/flota, y la confirmación final) y en
  `recoveries.service.ts` → `recoveries-transitions.service.ts` (registrar,
  avanzar a gestión, marcar recuperado, cerrar, anular). Usar esos dos pares
  de archivos como plantilla exacta para la próxima pantalla con mutaciones
  (`fleet-map.service.ts` el día que las tenga).

### Por qué existe esta regla

No es una regla de "el archivo se puso grande" — es la que evita que vuelva
a pasar. `new-capture-order.page.ts` se dividió una vez (ver
`docs/arquitectura-new-capture-order.md`) y el service resultante
(`capture-orders.service.ts`) igual volvió a crecer a 1374 líneas cuando se
agregó la carga masiva real, porque la única regla que existía entonces
("un service por feature") no decía *qué* va dentro de ese service. Esta
regla sí lo dice: filtros/orden/paginación/helpers de lectura/toast/qué
diálogo está abierto van en el de pantalla; todo lo que llama a
`create`/`update`/`close`/`annul`/`createBulk` va en el de transiciones. Es
la instrucción que cualquier agente — humano o modelo — debe seguir *antes*
de escribir la primera línea de una pantalla nueva con mutaciones, no algo
que se descubre después de que el archivo ya es ilegible.

## Diálogos

- Un componente por diálogo/modal, bajo `dialogs/`.
- Si dos pasos son la misma transición de un flujo (por ejemplo, un
  formulario y su modal de confirmación), van en el mismo componente — no
  se separan artificialmente solo por ser dos pantallas visuales distintas.
- Las acciones destructivas (anular, eliminar) usan la variante visual de
  peligro del diálogo; las reversibles no.

## Checklist rápido antes de dar una pantalla por terminada

- [ ] ¿Ningún archivo nuevo se acerca a las 300+ líneas?
- [ ] ¿El shell de la página no tiene lógica de negocio, solo composición?
- [ ] ¿El estado compartido vive en el service, no repetido en cada componente?
- [ ] ¿Template y estilos siguen inline en el `.ts` (no `.html`/`.css` sueltos)?
- [ ] ¿Cada diálogo es su propio componente en `dialogs/`?
- [ ] ¿El service de pantalla (`<feature>.service.ts`) tiene cero llamadas
      directas a métodos que mutan datos del service de datos — todas esas
      llamadas están en `<feature>-transitions.service.ts`? (ver
      [Service de pantalla vs. service de transiciones](#service-de-pantalla-vs-transiciones))
- [ ] ¿Compila (`npx tsc --noEmit` y/o `ng build`) sin errores?

Para el detalle completo (por qué cada decisión, qué se descartó y por qué),
ver `docs/arquitectura-new-capture-order.md`.
