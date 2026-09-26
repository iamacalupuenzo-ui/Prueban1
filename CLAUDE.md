# FleetOperations — instrucciones del proyecto

Consumidor Angular 22 de `@iamacalupuenzo-ui/comsatel-ds` (Comsatel Design
System). Antes de tocar cualquier pantalla, lee este archivo completo — es
corto a propósito. Los documentos que enlaza tienen el detalle; este archivo
existe para que no haga falta descubrirlos por casualidad.

## Reglas que no se negocian

1. **Nunca corras `ng test`, `npm test`, `ng build` ni `tsc` sin que Enzo lo
   pida explícitamente.** Él las corre para ahorrar tokens. Verifica tu
   trabajo leyendo el código con cuidado y, si el cambio es visible en UI,
   con el navegador (`preview_start` + `ng serve` ya corriendo en
   `localhost:4200`).
2. **Solo el contrato público de `@iamacalupuenzo-ui/comsatel-ds`.** Nunca
   importes nada de `node_modules/@iamacalupuenzo-ui/comsatel-ds/` que no
   sea el paquete público, nunca copies sus estilos internos, nunca uses
   `::ng-deep`. Antes de usar una variable CSS del DS, verifica que existe
   de verdad en `node_modules/@iamacalupuenzo-ui/comsatel-ds/tokens.css` —
   ya se encontraron tokens que el propio DS usa en su código compilado sin
   que existan en ese archivo (ver `docs/investigacion-componentes-capturas.md`).
3. **Todo componente usa `template`/`styles` inline dentro del `.ts`.** Nunca
   crear archivos `.html`/`.css` separados — es una desviación consciente
   del default de Angular, no un descuido. Ver el porqué en
   `docs/lineamientos-estructura-componentes.md`.
4. **Ninguna pantalla nueva con filtros + tabla + formulario + diálogos va en
   un solo archivo.** Se divide desde el diseño inicial siguiendo la
   estructura de `docs/lineamientos-estructura-componentes.md` — es la regla
   que evita que un archivo llegue a 2700 líneas (ya pasó una vez, ver
   `docs/arquitectura-new-capture-order.md`).
5. **El service de pantalla nunca llama directo a un método que muta datos.**
   Esas llamadas van en `<feature>-transitions.service.ts`. Regla exacta y
   por qué existe:
   `docs/lineamientos-estructura-componentes.md#service-de-pantalla-vs-transiciones`.

## Orden de lectura en `docs/`

No hay un orden fijo para todo, pero antes de construir una pantalla nueva
o tocar una existente, en este orden:

1. `docs/lineamientos-estructura-componentes.md` — la regla accionable de
   estructura (páginas, services, diálogos). Léelo siempre primero.
2. `docs/arquitectura-new-capture-order.md` — el detalle completo, línea por
   línea, de por qué existen esas reglas y el registro de cada decisión de
   ejecución tomada sobre Capturas. Consúltalo cuando necesites el "por qué"
   detrás de una regla del documento anterior.
3. `docs/investigacion-componentes-capturas.md` — registro vivo de brechas y
   bugs reales encontrados en el Comsatel DS (tokens que no existen, alturas
   que no coinciden con el componente real, etc.) y las correcciones locales
   aplicadas mientras el DS no las resuelve. Agrégale una entrada cada vez
   que encuentres una brecha nueva del DS — no la corrijas en el DS mismo,
   este proyecto es solo consumidor.
4. `docs/plan-construccion-recuperos.md` y
   `docs/epica-a-plan-desarrollo-fleet-operations-bitacora-v1-2026-09-21.md`
   — planes de features específicas (Recuperos, Bitácora). Úsalos como
   fuente de alcance cuando trabajes esas pantallas puntuales.
5. `docs/reconciliacion-cargas-masivas-capturas.md` — arquitectura de la
   carga masiva real de Capturas (detección de proveedor, validación contra
   SAP mock, reconciliación de conflictos).
6. `docs/auditoria-capturas-futuro.md` — pendientes conocidos de Capturas que
   todavía no tienen decisión de Producto.
7. `docs/casuistica-gps-ultima-ubicacion.md` — matriz completa de qué muestran
   las columnas "GPS" y "Última ubicación" según contrato y antigüedad del
   reporte de posición (incluye el umbral de 30 días), y las reglas
   completas de `appearsOnMap`/`mapStatusReason`.
8. `docs/soporte-multi-financiera-carga-masiva.md` — consulta ABIERTA (sin
   decisión de Producto) sobre soportar más de dos financieras/procesos en
   la carga masiva (incluye el caso "IPJ - MAF"). No implementar sin
   retomarlo con Enzo primero.
9. `docs/prueba-dispositivo-movil-geolocalizacion.md` — plan a futuro para
   probar la lógica de GPS con un celular real (requiere backend/relay que
   hoy no existe). No implementar sin retomarlo con Enzo primero.

Si vas a tomar una decisión de estructura que no está cubierta por ninguno
de estos documentos, regístrala en el documento que corresponda (o crea uno
nuevo si es un tema nuevo) en vez de decidir en silencio — el problema que
resuelve este archivo es justo que la próxima sesión, agente o modelo
encuentre el criterio ya escrito en vez de tener que inventarlo de nuevo.

## Patrón de pantalla (resumen — el detalle vive en los docs de arriba)

```
features/<feature>/
├── <feature>.page.ts                    ← shell: orquesta, sin lógica de negocio
├── <feature>.service.ts                 ← estado de pantalla: filtros, orden, paginación,
│                                            helpers de lectura, toast, qué diálogo está abierto
├── <feature>-transitions.service.ts     ← toda mutación de datos (create/update/close/annul/…)
├── <feature>-toolbar.component.ts
├── <feature>-table.component.ts
├── <feature>-detail-drawer.component.ts
└── dialogs/
    └── <feature>-<accion>-dialog.component.ts
```

Los componentes hijos inyectan `<feature>.service.ts` directo con `inject()`
— nunca `@Input`/`@Output` para el estado compartido de la pantalla, y nunca
inyectan `<feature>-transitions.service.ts` directamente (eso solo lo inyecta
el service de pantalla).

Datos de fixture/mock por dominio viven en `core/<dominio>/mock-*.service.ts`
(signals `orders`/`fixtureOrders`/`fixturesLoading`/`fixturesError`, métodos
`create`/`update`/etc. con resultados `{kind:'success'|...}`). Ese service es
la única fuente de verdad de datos — ni el service de pantalla ni el de
transiciones guardan una copia propia del estado de negocio.
