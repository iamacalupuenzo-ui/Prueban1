# Refactor de arquitectura — `new-capture-order.page.ts`

Fecha: 20 de septiembre de 2026
Estado: documentado, ejecución en curso en una rama aislada (ver "Ejecución").

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

## Ejecución

Ejecutado por un agente dedicado (ver commits de la rama de refactor para el
detalle línea por línea). Este documento se actualiza con el resultado final
una vez que la rama esté lista para revisión.
