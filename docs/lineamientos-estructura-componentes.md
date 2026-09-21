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
- [ ] ¿Compila (`npx tsc --noEmit` y/o `ng build`) sin errores?

Para el detalle completo (por qué cada decisión, qué se descartó y por qué),
ver `docs/arquitectura-new-capture-order.md`.
