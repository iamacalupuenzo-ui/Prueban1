# Plan de cierre de experiencia — Recuperos

Fecha de actualización: 21 de septiembre de 2026
Estado: experiencia con fixtures — puntos 1 a 4 del plan de continuación cerrados; queda el punto 5 (revisión manual del responsable del proyecto)
Referencia: `US3764` / `CU-3764-02 — Registrar una orden de recupero manual`.

## Propósito de esta etapa

Consolidar el módulo **Recuperos** como una experiencia de producto navegable y verificable con datos de demostración. Capturas aporta el patrón visual de consulta y gestión; Recuperos conserva sus propios datos, campos y estados de interfaz.

Esta etapa valida composición, jerarquía, formularios, filtros, evidencias y acciones. No representa todavía una integración productiva ni reglas finales de negocio.

## Límites explícitos

### Incluido en esta etapa

- Página de Recuperos, toolbar, tabla, detalle, alta, edición y confirmación.
- Fixtures propios, estados de carga, vacío, sin resultados, error y feedback.
- Búsqueda, filtros, orden, paginación, columnas visibles y comportamiento responsive de tabla.
- Exportación local del conjunto filtrado, sin depender de servicios externos.
- Flujo visual de registro manual, duplicidad simulada y condición GPS.
- Experiencia local de evidencias: adjuntar, retirar, identificar el tipo de archivo y abrir en una pestaña nueva los archivos añadidos durante la sesión.
- Acciones y transiciones como demostración visual, separadas de la regla definitiva de ciclo de vida.

### Fuera de alcance en esta etapa

- API, base de datos, persistencia, autenticación, roles o permisos reales.
- Almacenamiento real de documentos, enlaces durables, antivirus, progreso de red, validación de contenido o recuperación tras recargar la página.
- Carga masiva de recuperos, plantilla XLSX e importación de archivos.
- Matriz oficial de estados, transiciones productivas y auditoría persistida.
- Catálogos definitivos de unidades, aseguradoras, fuentes, servicios y modalidades.

## Estado actual

| Área | Estado | Alcance disponible |
| --- | --- | --- |
| Página y toolbar | Construido | Título, descripción, acción primaria, búsqueda y filtros. |
| Consulta | Construido | Filtros por estado, seguro, modalidad y rango de fechas; orden y paginación. |
| Tabla | Construido | Columnas configurables, acciones, menú de descarga, responsive y sombra de acciones. |
| Exportación | Construido (Excel) | Descarga `.xls` del conjunto filtrado y ordenado completo (no solo la página visible), sin librerías ni API — HTML-table servido con extensión `.xls`. Se evitó `xlsx`/SheetJS por una vulnerabilidad alta sin fix en npm. PDF sigue como mensaje informativo, pendiente si se prioriza. |
| Registro manual | Construido | Unidad, contexto GPS, fuente, seguro, tipo de servicio, modalidad, datos operativos, validación, confirmación y duplicidad simulada. |
| Detalle y edición | Construido para fixture | Drawer de detalle en pestañas (Información/Historial) y edición condicionada por estados de demostración. |
| Evidencias | Construido para fixture | Adjuntar, retirar, truncar nombres, icono por tipo, apertura local de archivos recién adjuntados y estado vacío con ayuda visual. Formato/peso/reemplazo/carga fallida siguen documentados como pendientes de reglas de Producto (ver Riesgos). |
| Estados | Parcial / demostración | Acciones visuales de gestión, recuperación, cierre y anulación (con motivo) ya construidas; no son la matriz oficial — no ampliar por inferencia. |
| Integración real | No iniciar | Queda fuera de este plan. |

## Flujos vigentes de interfaz

### Registro manual

1. El operador selecciona **Registrar recupero**.
2. Identifica una unidad y ve únicamente su contexto disponible, incluida la condición de GPS.
3. Completa fuente, seguro, tipo de servicio, modalidad y los datos aplicables.
4. Agrega evidencias opcionales si las tiene disponibles.
5. Revisa la confirmación y registra la orden en la tabla de fixtures.

### Evidencias

- La evidencia es opcional en esta etapa.
- Los nombres extensos se truncan sin invadir el botón de eliminar.
- El ícono inicial representa de forma visual el tipo de archivo disponible (imagen, audio, video o documento).
- Los archivos adjuntados en la sesión pueden abrirse en una nueva pestaña.
- Los archivos de fixtures no simulan una URL real ni deben prometer descarga.

### Estados y edición

- La interfaz puede demostrar acciones de gestión, recuperación, cierre y anulación para validar jerarquía y mensajes.
- Esas acciones no se consideran reglas aprobadas ni deben ampliarse por inferencia.
- La edición continúa siendo una experiencia de fixture hasta que exista una definición funcional de campos permitidos y trazabilidad.

## Plan de continuación

### 1. Consolidar el formulario de Recuperos — Cerrado

**Objetivo:** cerrar la experiencia de alta y edición con decisiones de UI coherentes, usando solamente fixtures.

- [x] Nombres, labels, placeholders, obligatoriedad visible y orden de los campos validados (Tipo de servicio + Modalidad de robo arriba, Seguro + Referencia en medio, Fuente de solicitud abajo, sola).
- [x] Controles con la anatomía publicada por Comsatel DS; excepciones locales documentadas en `styles.css` (ocultar "x" de selects de selección única, alinear tamaño de label).
- [x] Comportamiento de selección de fuente (Cliente/Aseguradora) y catálogo de Seguro confirmados para la demostración, sin declararlos valores reales.

**Cierre:** el operador entiende qué debe completar y recibe feedback cercano al campo, sin depender de datos externos.

### 2. Completar la experiencia local de evidencias — Cerrado

**Objetivo:** terminar el comportamiento visible del bloque documental sin convertirlo en un módulo de almacenamiento.

- [x] Hover, foco, apertura en nueva pestaña, eliminación y nombres largos revisados.
- [x] Estado vacío y ayuda del bloque definidos visualmente ("Todavía no adjuntaste ninguna evidencia.", copy de ayuda corregido).
- [x] Documentado en Riesgos que formato, peso, reemplazo, carga fallida y cambios sin guardar quedan pendientes de reglas de producto, no de implementación técnica real.

**Cierre:** la evidencia opcional es clara, accesible y no genera scroll o desbordes con archivos largos.

### 3. Revisar acciones de tabla y estados de demostración — Cerrado

**Objetivo:** asegurar que las acciones disponibles sean comprensibles sin presentarlas como una matriz operativa definitiva.

- [x] Visibilidad, copy y confirmaciones de editar, pasar a gestión, marcar recuperado, cerrar y anular (con motivo) revisadas, en tabla y en el drawer de detalle.
- [x] Nota técnica de que las transiciones son fixtures hasta contar con una matriz aprobada, presente en el propio código (`TransitionRecoveryOrderResult`) y en este documento.
- [x] No se agregaron transiciones ni permisos más allá de los ya construidos.

**Cierre:** el recorrido se puede demostrar y revisar visualmente sin afirmar reglas que aún no existen.

### 4. Implementar exportación local — Cerrado (Excel)

**Objetivo:** completar la descarga desde la tabla sin incorporar servicios ni datos reales.

- [x] Excel exporta el total filtrado y ordenado, no solo la página visible.
- [ ] PDF sigue solo como mensaje informativo — no se priorizó en esta ronda; retomar si se necesita.
- [x] Comunica el resultado (éxito con el total exportado, o error si no hay filas que coincidan con los filtros) de forma cercana a la acción.

**Cierre:** la descarga en Excel refleja el conjunto filtrado en la interfaz y funciona de forma local, sin dependencias con vulnerabilidades conocidas.

### 5. Revisión funcional y visual manual

**Objetivo:** recopilar observaciones de la interfaz antes de cerrar el módulo de experiencia.

- Probar visualmente fuentes, unidades con y sin GPS, unidad con orden activa, campos obligatorios, evidencias y tamaños responsive.
- Registrar solo defectos o decisiones de experiencia; no abrir trabajo de API ni backend a partir de esta revisión.
- Las pruebas y la compilación las ejecuta el responsable del proyecto.

**Cierre:** lista de mejoras de interfaz priorizada y sin pendientes técnicas fuera de alcance mezcladas con el módulo.

## Riesgos y decisiones pendientes

| Tema | Decisión para esta etapa |
| --- | --- |
| Catálogos de fuente, seguro y unidad | Se usan fixtures; no se declaran definitivos. |
| GPS y ubicación | Mostrar solamente el contexto fixture disponible. |
| Estados | Se validan como interacción visual; matriz oficial pendiente. |
| Evidencias | UX local; no prometer almacenamiento ni enlace persistente. |
| Exportación | Se implementa localmente sobre fixtures y filtros actuales; sin API. |
| Auditoría | Módulo futuro separado; no construir historial ni tabla de auditoría dentro de Recuperos. |

## Criterio de cierre de esta etapa

La experiencia de Recuperos queda lista para revisión cuando un operador pueda consultar y filtrar fixtures, registrar y editar una orden de demostración, entender el contexto de GPS, gestionar evidencias locales y recorrer las acciones visibles sin desbordes, ambigüedades ni promesas de integración real.

Las integraciones productivas se planificarán en un documento separado cuando Producto defina contratos, catálogos, estados y política documental.
