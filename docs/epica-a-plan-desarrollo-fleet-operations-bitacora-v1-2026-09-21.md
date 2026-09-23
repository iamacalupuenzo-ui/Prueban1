# Plan de desarrollo — Fleet Operations — Bitácora de órdenes

**Versión:** v1 — 2026-09-21  
**Estado:** Nuevo  
**Épica fuente:** US3765 — Bitácora de Orden de Captura o Recupero: consultar y operar la trazabilidad de actividades, evidencias, ubicación y acciones permitidas de una orden.  
**Verificado contra código existente:** Sí. El proyecto ya cuenta con el mapa global en `src/app/features/fleet-map/`, las listas de Capturas y Recuperos, sus drawers de detalle y datos simulados de telemetría.

## 1. Épica original

Como operador de Centro de Operaciones, quiero consultar y operar la bitácora de una orden de captura o recupero, para tener trazabilidad de actividades, evidencias, ubicación y acciones permitidas durante el operativo.

La primera entrega acordada prioriza visibilidad operacional: desde el mapa y desde el listado se podrá abrir la misma bitácora de una orden. El mapa general mostrará las unidades asociadas a capturas y recuperos. La evidencia, comentarios y acciones avanzadas se desarrollarán después.

Trazabilidad Notion: [US3765 — Bitácora](https://app.notion.com/p/b981a7d0638882909e858128e9d4f16c?pvs=204), [CU-3765-01 — Acceso](https://app.notion.com/p/3de1a7d06388817caf79d95779361039?pvs=204), [CU-3765-02 — Contexto, mapa y línea de tiempo](https://app.notion.com/p/3de1a7d0638881dda363fd47ad33185e?pvs=204).

## 2. Supuestos

- [SUPUESTO] La primera versión funciona solo con fixtures locales; no conecta API, almacenamiento, telemetría en tiempo real ni persistencia. Es coherente con el alcance actual del proyecto.
- [SUPUESTO] El acceso inicial a Bitácora estará disponible para toda orden visible en los fixtures. La regla real por perfil, estado y control documentario aún no está aprobada.
- [SUPUESTO] Una unidad puede tener más de una orden histórica, pero el mapa general mostrará una sola representación por unidad y priorizará la orden activa más reciente. La regla de prioridad debe validarse antes de integrar datos reales.
- [SUPUESTO] “Última ubicación” mostrará hora/frescura del fixture y nunca se presentará como ubicación en vivo.
- [PENDIENTE DE DEFINIR] La matriz oficial de acceso, transición Procesar, frecuencia, ubicación compartida, alertas y capas sigue bloqueando esas historias.

## 3. Mapa de módulos

| Módulo | Descripción | Flujos que contempla | Orden sugerido |
|---|---|---|---:|
| Acceso unificado | Abrir la misma bitácora desde tabla o marcador. | Acción en listado, selección en mapa, retorno contextual. | 1 |
| Mapa operativo de órdenes | Extender el mapa global con unidades vinculadas a capturas y recuperos. | Carga, filtros, marcadores, leyenda, estado sin ubicación. | 2 |
| Contexto de Bitácora | Ruta de detalle por orden con resumen y última posición. | Carga de orden, mapa focalizado, GPS/no GPS/error, retorno. | 3 |
| Línea de tiempo y evidencia | Mostrar actividades y luego permitir registrar evidencia/comentario. | Timeline, estado vacío, adjunto validado, actividad creada. | 4 |
| Acciones operativas avanzadas | Procesar, frecuencia, compartir, informe, alertas y capas. | Confirmaciones y resultado trazable. | Bloqueado |

## 4. Detalle por módulo

### Módulo: Acceso unificado

**Flujos:**

- **Flujo: abrir Bitácora desde un listado**
  - Actor: operador de Centro de Operaciones.
  - Disparador: elige “Ver bitácora” en el menú de una captura o recupero.
  - Pasos: 1) identifica la orden; 2) navega a la bitácora con su id y origen; 3) revisa el contexto; 4) vuelve a la tabla conservando filtros y página.
  - Sistemas involucrados: frontend Angular, servicios de fixtures de Capturas/Recuperos.
  - Resultado esperado: se abre la bitácora de la orden exacta, no una vista genérica de la unidad.

- **Flujo: abrir Bitácora desde el mapa**
  - Actor: operador de Centro de Operaciones.
  - Disparador: selecciona un marcador asociado a una orden.
  - Pasos: 1) ve la identidad, tipo y estado; 2) elige Ver bitácora; 3) navega a la misma ruta de detalle; 4) puede regresar al mapa.
  - Resultado esperado: mapa y lista llevan a una experiencia idéntica y contextual.

**Historias de usuario:**

- **HU-bitacora-01**: Como operador, quiero abrir la bitácora desde las acciones de una captura o recupero, para analizar la orden sin buscar nuevamente la unidad.
  - Criterios de aceptación:
    - DADO una orden visible, CUANDO selecciono Ver bitácora, ENTONCES se abre la bitácora con su identificador, tipo y estado.
    - DADO que regreso, CUANDO uso Volver, ENTONCES retorno al listado de origen conservando su contexto de navegación.
  - INVEST: ok; la regla real de autorización queda sustituida temporalmente por fixtures.

- **HU-bitacora-02**: Como operador, quiero abrir esa misma bitácora desde un marcador del mapa, para pasar de la supervisión geográfica al detalle operativo.
  - Criterios de aceptación:
    - DADO un marcador con una orden activa, CUANDO elijo Ver bitácora, ENTONCES se abre la misma ruta y orden que desde el listado.
    - DADO un marcador sin orden asociada, CUANDO lo selecciono, ENTONCES se comunica que no tiene bitácora disponible y no navega a un detalle incorrecto.
  - INVEST: ok.

**Plan de testing del módulo:**

- Casos funcionales: acceso desde Capturas, Recuperos y marcador; retorno a cada origen.
- Casos borde: id inexistente, orden sin contexto, marcador sin orden y cambio de orden desde la misma vista.
- No funcionales: foco inicial en el título de Bitácora, navegación por teclado y URL compartible.
- Datos/mocks: una captura y un recupero con GPS, una unidad sin GPS y un marcador sin orden.

### Módulo: Mapa operativo de órdenes

**Flujos:**

- **Flujo: observar órdenes activas en mapa**
  - Actor: operador.
  - Disparador: abre Mapa.
  - Pasos: 1) carga las posiciones de fixtures; 2) asocia unidad con orden activa; 3) representa marcador y estado; 4) filtra o selecciona; 5) abre detalle si aplica.
  - Sistemas involucrados: `FleetTelemetryService`, fixtures de Capturas/Recuperos y lienzo Leaflet existente.
  - Resultado esperado: el mapa permite localizar y distinguir unidades con captura o recupero sin afirmar telemetría en vivo.

**Historias de usuario:**

- **HU-bitacora-03**: Como operador, quiero ver en el mapa las unidades asociadas a órdenes activas de captura y recupero, para priorizar qué operativo revisar.
  - Criterios de aceptación:
    - DADO una unidad con ubicación y orden activa, CUANDO carga el mapa, ENTONCES su marcador indica tipo de orden y estado en texto accesible.
    - DADO una orden sin GPS o sin posición, CUANDO carga el mapa, ENTONCES aparece en la alternativa no cartográfica como “sin ubicación”, sin inventar un marcador.
  - INVEST: ok.

- **HU-bitacora-04**: Como operador, quiero filtrar y comprender los marcadores operativos, para no confundir tipo de orden, estado y disponibilidad de ubicación.
  - Criterios de aceptación:
    - DADO varios marcadores, CUANDO aplico un filtro de tipo o estado, ENTONCES el mapa y la lista alternativa muestran el mismo conjunto.
    - DADO un dato de ubicación, CUANDO se muestra, ENTONCES informa la hora de última actualización del fixture.
  - INVEST: requiere validar el catálogo final de filtros antes de datos reales.

**Plan de testing del módulo:**

- Casos funcionales: captura, recupero, filtro combinado, selección y apertura de bitácora.
- Casos borde: sin posiciones, una posición, posiciones repetidas, sin GPS, ubicación desactualizada y selección fuera del viewport.
- No funcionales: teclado, alternativa de lista/detalle equivalente, responsive y no renderizar controles redundantes.
- Datos/mocks: posiciones con hora, tipos de orden, estados y asociaciones de unidad–orden.

### Módulo: Contexto de Bitácora

**Flujos:**

- **Flujo: consultar contexto y última ubicación**
  - Actor: operador.
  - Disparador: entra a `/bitacora/:tipo/:id` desde la lista o el mapa.
  - Pasos: 1) resuelve orden y unidad; 2) muestra cabecera persistente; 3) carga última ubicación/mapa focalizado; 4) presenta estado de ubicación; 5) permite volver.
  - Sistemas involucrados: ruta Angular, fixtures de órdenes, telemetría y el mapa Leaflet existente adaptado al detalle.
  - Resultado esperado: el operador entiende qué orden observa, qué unidad está vinculada y qué tan vigente es su ubicación.

**Referencia visual (C-Locater):** `Proyectos\CLocater\C-Locater\src\shared\components\vehicle-detail\` ya resuelve una vista individual equivalente en producción, verificada en pantalla el 21 de septiembre de 2026. Su composición: panel izquierdo con cabecera del dispositivo (placa, código de motor, estado "Transmitiendo"/apagado, cantidad de etapas), pestañas Info/GPS/Posiciones, bloque de datos del dispositivo GPS (tipo, IMEI, línea, grupo, odómetro, velocidad, combustible, conexión, alarmas) e información del vehículo (propietario, placa, código de motor); columna central con la lista de posiciones históricas ordenadas por hora, cada una con dirección y coordenadas, la más reciente resaltada como "Última"; timeline horizontal de etapas sobre el mapa (Inicio de captura → En proceso → Finalizado); mapa a la derecha con la traza recorrida (línea punteada) entre el punto de inicio y la posición actual. Componentes fuente: `DetailHeader.tsx`, `StatusTimeline.tsx`, `TripPanel.tsx`, `TripStatsRow.tsx`, `VehicleInfoCard.tsx`, `VehicleTrackingMap.tsx`. Sirve como referencia de composición y jerarquía para HU-bitacora-05 y HU-bitacora-06 — no implica copiar sus datos (telemetría de dispositivo GPS real) ni su alcance completo (esta primera entrega no incluye dispositivo GPS, solo unidad/orden).

**Historias de usuario:**

- **HU-bitacora-05**: Como operador, quiero ver el resumen y la última ubicación de una orden en su bitácora, para comprender el contexto operativo antes de actuar.
  - Criterios de aceptación:
    - DADO una orden con GPS, CUANDO abre la Bitácora, ENTONCES ve identificador, tipo, estado, unidad, última ubicación y hora del dato.
    - DADO una unidad sin GPS, CUANDO abre la Bitácora, ENTONCES ve un estado específico de sin ubicación en lugar de un mapa roto o una posición falsa.
    - DADO un error simulado de ubicación, CUANDO ocurre, ENTONCES recibe una explicación y una opción de reintento local.
  - INVEST: ok.

**Plan de testing del módulo:**

- Casos funcionales: captura/recupero, GPS disponible, reintento y retorno.
- Casos borde: id no encontrado, unidad sin asociación, dirección larga, fecha/hora faltante y error de capa.
- No funcionales: foco, lector de pantalla para estado de carga/error, mapa responsive y alternativa textual.
- Datos/mocks: orden completa, orden sin GPS, error temporal y dirección de dos líneas.

### Módulo: Línea de tiempo y evidencia

**Flujos:**

- **Flujo: consultar actividades**
  - Actor: operador.
  - Disparador: la bitácora termina de cargar su contexto.
  - Pasos: 1) obtiene actividades; 2) las ordena por fecha/hora; 3) muestra autor, descripción y tipo; 4) permite ampliar una evidencia cuando exista.
  - Resultado esperado: el operador comprende qué ocurrió antes sin perder el contexto de la orden.

- **Flujo: registrar comentario o evidencia**
  - Actor: operador.
  - Disparador: elige Agregar evidencia.
  - Pasos: 1) escribe comentario y/o adjunta una imagen; 2) valida; 3) confirma o cancela; 4) agrega la actividad arriba de la línea de tiempo.
  - Resultado esperado: hay trazabilidad visible de la actividad creada.

**Historias de usuario:**

- **HU-bitacora-06**: Como operador, quiero consultar actividades ordenadas cronológicamente, para reconstruir el operativo de la orden.
  - Criterios de aceptación:
    - DADO actividades asociadas, CUANDO carga la Bitácora, ENTONCES cada una muestra descripción, fecha, hora y usuario en orden cronológico.
    - DADO que no hay actividades, CUANDO carga la Bitácora, ENTONCES muestra un estado vacío claro.
  - INVEST: ok.

- **HU-bitacora-07**: Como operador, quiero registrar un comentario, una imagen válida o ambos, para documentar una actividad del operativo.
  - Criterios de aceptación:
    - DADO comentario, imagen JPG/JPEG/PNG de hasta 5 MB o ambos, CUANDO confirmo, ENTONCES aparece una actividad con usuario, fecha y hora.
    - DADO que no existe contenido o el archivo no es válido, CUANDO intento guardar, ENTONCES la acción no se ejecuta y se comunica el motivo.
    - DADO que cancelo, CUANDO cierro el modal, ENTONCES no se crea actividad.
  - INVEST: depende de definir si esta entrega seguirá siendo solo local o contará con almacenamiento real.

**Plan de testing del módulo:**

- Casos funcionales: timeline con uno/múltiples eventos, comentario, imagen y ambos.
- Casos borde: vacío, archivo inválido, >5 MB, más de un archivo, nombre largo, cancelar y eliminar adjunto.
- No funcionales: orden cronológico, vista previa accesible y navegación por teclado.
- Datos/mocks: actividades mixtas, usuario, fecha/hora, imagen local y fallos simulados.

### Módulo: Acciones operativas avanzadas

**Flujos:**

- Procesar orden, cambiar frecuencia, compartir ubicación, generar/enviar informe, atender alertas y gestionar capas.
- Sistemas involucrados: frontend, matriz de permisos/estados y contratos externos aún no disponibles.
- Resultado esperado: no se implementa ni simula como comportamiento operativo definitivo hasta que se aprueben las reglas.

**Historias de usuario:**

- **HU-bitacora-08**: Como operador, quiero procesar una orden desde su bitácora, para ejecutar una transición aprobada y registrada.
  - Criterios de aceptación:
    - DADO una matriz oficial aprobada, CUANDO confirmo Procesar, ENTONCES se aplica el estado objetivo y se registra una actividad.
  - INVEST: bloqueada por matriz de estados contradictoria.

- **HU-bitacora-09**: Como operador, quiero usar las acciones permitidas de frecuencia, compartir, informe, alertas y capas, para coordinar una operación bajo reglas aprobadas.
  - Criterios de aceptación:
    - DADO una regla, permiso y contrato aprobados, CUANDO ejecuto una acción habilitada, ENTONCES se informa su resultado y queda trazabilidad.
  - INVEST: bloqueada por políticas y contratos externos.

**Plan de testing del módulo:**

- Casos funcionales: pendiente hasta que exista la matriz oficial.
- Casos borde: transiciones duplicadas, error/espera, permisos y datos ausentes.
- No funcionales: mensajes de estado, deduplicación de alertas y accesibilidad.
- Datos/mocks: no crear reglas definitivas por inferencia.

## 5. Orden y dependencias de desarrollo

| Módulo | Depende de | Razón |
|---|---|---|
| Acceso unificado | Órdenes de Capturas y Recuperos existentes | Debe identificar una orden concreta y conservar origen. |
| Mapa operativo de órdenes | Acceso unificado, telemetría y fixtures de órdenes | El marcador requiere relación unidad–orden y destino de navegación. |
| Contexto de Bitácora | Acceso unificado, telemetría y mapa existente | La ruta debe resolver la orden y mostrar ubicación honesta. |
| Línea de tiempo y evidencia | Contexto de Bitácora | Las actividades se asocian a una orden ya resuelta. |
| Acciones operativas avanzadas | Matrices, permisos, contratos y decisiones de Producto | No se habilitan por intuición. |

## 6. Riesgos y preguntas abiertas

- Regla de acceso real a Bitácora — afecta visibilidad desde mapa y listas; Producto debe definir perfil, control documentario y estados.
- Asociación de múltiples órdenes activas a una sola unidad — afecta el marcador; confirmar prioridad o agrupación.
- Fuente, frecuencia y precisión de ubicación — afecta el texto de frescura y cualquier expectativa de “en vivo”.
- Política de capas — CU-3765-09 exige definir capas simultáneas/exclusivas y datos disponibles antes de construirla.
- Evidencia persistente — el caso exige almacenamiento e identidad; en fixtures solo puede demostrarse la interacción local.
- Alertas, compartir ubicación, frecuencia e informes — requieren contratos, permisos y reglas externas; quedan expresamente fuera de la primera entrega.

## 7. Para el agente de desarrollo

Implementar solo los módulos 1 a 3 como primera iteración de Bitácora. Reutilizar el mapa Leaflet ya instalado y los servicios de fixtures existentes; no instalar librerías nuevas, no tocar el Design System y no crear APIs ni persistencia real.

Crear una ruta única de Bitácora con tipo e identificador de orden. Agregar la acción de acceso a las tablas de Capturas y Recuperos y una acción equivalente desde el marcador del mapa. Extender los datos locales con una relación explícita entre unidad, orden, tipo, estado, posición y hora de última actualización. Mantener una alternativa textual/lista a la información esencial del mapa y representar GPS ausente, carga, error e id inexistente.

Después de validar visualmente el flujo mapa/lista → bitácora → volver, continuar con HU-bitacora-06 y HU-bitacora-07. No implementar HU-bitacora-08 ni HU-bitacora-09 hasta recibir las decisiones indicadas en la sección 6. El usuario ejecuta las pruebas del proyecto: dejar preparados los escenarios y no ejecutar `npm test` ni `npm run build` salvo solicitud explícita.

## Cobertura de trazabilidad

| Fuente | Cobertura en este plan | Estado |
|---|---|---|
| CU-3765-01 — Acceso | HU-bitacora-01 y HU-bitacora-02 | Primera iteración, regla real pendiente. |
| CU-3765-02 — Contexto, mapa y timeline | HU-bitacora-03 a HU-bitacora-06 | Mapa/contexto primero; timeline después. |
| CU-3765-03 — Evidencias y comentarios | HU-bitacora-07 | Segunda iteración, persistencia fuera de alcance. |
| CU-3765-04 a CU-3765-09 | HU-bitacora-08 y HU-bitacora-09 | Bloqueadas por decisiones y contratos. |
