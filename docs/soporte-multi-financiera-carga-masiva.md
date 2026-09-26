# Soporte multi-financiera en la carga masiva — consulta pendiente

Estado: **consulta abierta, sin decisión de Producto.** Registrado el
2026-09-25 a pedido explícito de Enzo ("lo llevo como consulta, no olvides
recordármelo") — no implementar nada de esto sin retomarlo con él primero.

## Contexto

Actualización 2026-09-25: el sistema ya no está limitado a dos formatos
cerrados (ver más abajo, "Ya implementado"). Lo que sigue sin decisión es
puntualmente el caso IPJ-MAF.

Hasta el cambio de hoy, el sistema solo reconocía dos formatos (Santander y
MAF — nombre correcto de la entidad, antes escrito por error "Mapfre"),
detectados por firma de columnas (`capture-order-formats.ts`, ver
`docs/reconciliacion-cargas-masivas-capturas.md`). Enzo adelantó que en la
operación real van a existir más de dos financieras/entidades/procesos, cada
una con su propia estructura de columnas.

## Ya implementado (2026-09-25)

- `CaptureFinanciera` pasó de unión cerrada (`'Santander' | 'Mapfre'`) a
  `string` abierto — agregar una entidad nueva es agregar UN objeto a
  `CAPTURE_FORMAT_SIGNATURES` (`capture-order-formats.ts`), sin tocar
  ningún otro archivo ni el sistema de tipos.
- Los mensajes al usuario ("no reconocemos este formato...", intro del
  diálogo de carga) se generan dinámicamente desde
  `CAPTURE_FORMAT_FINANCIERA_NAMES`, derivado de las firmas registradas —
  no quedan hardcodeados a "Santander ni Mapfre" en varios archivos.
- Esto resuelve la propuesta 1 de abajo en espíritu (agregar una entidad ya
  no requiere tocar el sistema de tipos), aunque no exactamente como se
  planteó (columna "Financiera" explícita en cada archivo) — sigue siendo
  detección por firma de columnas, que ya venía funcionando bien para los
  dos formatos reales compartidos.

## Propuesta que trajo Enzo (sin decidir todavía)

1. **Agregar una columna "Financiera" al estándar de cada archivo.** En vez
   de depender solo de la firma de columnas para inferir el proveedor, cada
   entidad agregaría una columna propia con ese dato explícito — el resto de
   su estructura no cambia, "cada entidad tiene su estructura, solo se
   agrega la columna". Con la detección por firma ya funcionando y siendo
   extensible (ver arriba), esto queda como optimización a evaluar, no como
   bloqueante.
2. **Hay más de una "financiera" por entidad.** Ejemplo concreto que dio:
   MAF tiene un grupo/lista separada llamada **"IPJ - MAF"** (Inicio Proceso
   Judicial) — unidades que están en esa etapa judicial previa, en un
   archivo/lista distinto del listado principal de MAF. Sugiere que el
   sistema debería soportar esta clase de sub-agrupación por proceso, no
   solo por entidad financiera. **Esta parte sigue sin decisión** — ver la
   pregunta abierta abajo.

## La pregunta que quedó abierta (textual, parafraseada)

> ¿Qué pasa cuando MAF saca a una unidad de "Inicio Proceso Judicial (IPJ)"
> y la mueve a su lista principal? En la validación de una carga posterior
> se vería ese cambio — ¿el sistema debe actualizar automáticamente el tipo
> de financiera/proceso de esa unidad al detectar que ya no aparece en el
> archivo de IPJ pero sí en el principal (o viceversa)?

Esto es una extensión del mecanismo de reconciliación que ya existe
(`previewBulkConflicts`/`createBulk` en `mock-capture-orders.service.ts`),
pero hoy ese mecanismo reconcilia estados (Pendiente/Observado/Capturado/
Paralizado) dentro de una misma financiera — no reconcilia el cambio de
financiera/proceso en sí. Habría que definir:

- Si "IPJ - MAF" es una `CaptureFinanciera` más (junto a `Santander`/`MAF` —
  el tipo ya es `string` abierto, técnicamente no hay nada que lo bloquee)
  o un campo distinto (ej. `proceso`/`subgrupo`) ortogonal a la financiera.
- Si el movimiento IPJ → lista principal (o al revés) se detecta
  automáticamente al validar una carga nueva, o si requiere que el usuario
  lo confirme manualmente (mismo patrón de decisión Sistema/Archivo que ya
  existe para conflictos de estado).
- Qué pasa con el historial/auditoría de la orden cuando cambia de
  financiera/proceso — ¿se trata como una transición más (con su propia
  entrada en `auditTrail`) o como un caso especial?

## Por qué no se implementa ahora

Enzo lo planteó explícitamente como consulta para retomar después, no como
pedido de construcción — "lo llevo como consulta". Ver también
`docs/reconciliacion-cargas-masivas-capturas.md` para el mecanismo de
detección de formato actual, que es la base sobre la que se extendería esto.
