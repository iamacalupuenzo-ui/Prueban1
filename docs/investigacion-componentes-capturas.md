# Investigación — componentes pendientes para Capturas

Fecha: 17 de septiembre de 2026  
Contexto: matriz y registro manual de capturas de flota.

## Hallazgos verificados en la API pública de Comsatel DS 0.2.2

| Necesidad                                         | Componente disponible                      | Resultado                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Elegir una fecha sin hora desde un campo compacto | `Calendar`                                 | No aplica: es una superficie de calendario abierta. No debe insertarse dentro del formulario.                                |
| Elegir fecha y hora                               | `DateTimePicker`                           | Existe y abre el selector desde un campo; incluye una hora, por lo que no cubre por sí solo una fecha de recepción sin hora. |
| Seleccionar una opción conocida                   | `Select` / `InputDropdown`                 | Aplica para fuentes y estados con un conjunto reducido de alternativas.                                                      |
| Encontrar una unidad entre más de mil registros   | No hay `Autocomplete` o `Combobox` público | Brecha del DS. La aplicación compone temporalmente un selector buscable propio, sin copiar internals del DS.                 |

## Decisiones de producto actuales

- La fecha de recepción se muestra como un campo compacto; el navegador abre su selector solo cuando el operador lo activa. No se usa el `Calendar` abierto.
- El código de unidad exige selección explícita. La lista no se abre al enfocar el campo: recién aparece luego de escribir al menos tres caracteres, filtra coincidencias, presenta hasta seis resultados y permite seleccionar con mouse o teclado (flechas, Enter y Escape). Al borrar o modificar el código elegido se limpia también el contexto recuperado de esa unidad.
- La fuente de la orden usa el `Select` público porque sus cuatro opciones son cortas y conocidas.
- La fuente de la orden es obligatoria y de selección única. Se mantiene la elección al volver a seleccionar la misma opción; para cambiarla se elige una alternativa del menú. No se presenta una acción de limpieza que desordene el campo.
- Los valores mostrados son contenido de demostración del flujo. La interfaz no comunica una integración pendiente al operador.

### Estados y acciones de la orden

- **Hecho verificado en US3764 y CU-3764-07.** Los estados visibles de los fixtures (`Registrada`, `En revisión`, `Con observación`, `Cerrada` y `Anulada`) no constituyen una matriz oficial aprobada. La fuente menciona además estados incompatibles entre sí y ordena no inferir transiciones.
- **Decisión operativa vigente.** Una orden `Registrada` puede editarse, cerrarse o anularse. El cierre y la anulación requieren confirmación y ambos cambios quedan registrados en la auditoría. `Cerrada` y `Anulada` son terminales en esta implementación. Las acciones se conservan tanto en la tabla como en el detalle.
- Las transiciones hacia `En revisión` o `Con observación`, así como reglas por tipo de orden o permiso, no se infieren: permanecen pendientes de la matriz oficial.
- La vista de detalle reúne estado, identidad de la unidad, propietario, datos de orden, última ubicación condicional e historial. El simulador combina posiciones demo explícitas para evaluar la interacción cartográfica con unidades sin GPS para validar el estado “Sin posición disponible”; producción deberá sustituir ambos casos por la respuesta real de telemetría.
- Pendiente de Producto: matriz por tipo (captura/recupero), estado inicial, transición origen→destino, permisos, requisito de motivo/evidencia y efecto sobre edición/anulación. Esta decisión desbloquea CU-3764-04 y CU-3764-07.

### Jerarquía de acciones: registro, carga masiva y descarga

- **Hecho verificado.** Un área de página debe exponer una sola acción primaria;
  varias acciones primarias reducen la jerarquía y hacen más difícil identificar
  el siguiente paso. [Atlassian: Button usage](https://atlassian.design/components/button/button-legacy/usage)
- **Hecho verificado.** La barra de una tabla es el lugar para utilidades
  globales del conjunto visible, entre ellas la exportación; las acciones que no
  caben pueden agruparse en un menú. [Carbon: Data table toolbar](https://carbondesignsystem.com/components/data-table/usage/)
- **Decisión.** `Registrar captura` se mantiene como única acción primaria del
  encabezado. `Carga masiva de capturas` se ubica inmediatamente a su izquierda
  como botón secundario: es una vía alternativa para crear registros, no una
  utilidad de la tabla ni una acción por fila.
- **Decisión.** `Descargar` se ubica en una franja de utilidades asociada a la
  tabla, alineada a la derecha y separada de los filtros. Abre un menú con los
  formatos de exportación, en lugar de mostrar un botón por formato. La descarga
  aplica los filtros y el orden actualmente activos; el menú debe indicar el
  formato mediante verbos explícitos, por ejemplo `Descargar PDF` y
  `Descargar Excel`.
- **Pendiente funcional.** Confirmar el segundo formato de descarga antes de
  implementarlo. Si es Excel, el copy será `Descargar Excel`; si se requiere
  CSV u otro formato, se nombra de forma explícita. No se usa “Descargar por”,
  porque no expresa el resultado de la acción.

### Carga masiva de capturas

- El flujo se realiza en una modal exclusiva de Capturas: presenta la estructura de plantilla, permite arrastrar o seleccionar un archivo `XLSX`, `XLS` o `CSV` de hasta 10 MB, valida antes de registrar y conserva la tabla de la página como destino de los registros exitosos.
- La revisión separa filas válidas y rechazadas. Una fila se bloquea si la unidad ya tiene una captura activa en `Registrada`, `En revisión` o `Con observación`; también se bloquean unidades inexistentes y duplicados dentro del mismo archivo.
- Decisión provisional de producto: los antecedentes `Cerrada` y `Anulada` no bloquean una nueva captura, ya que son órdenes terminales y la nueva orden recibe otro código. Esta regla debe reemplazarse por la matriz oficial de estados cuando esté aprobada.
- Las filas rechazadas no se registran. El prototipo permite cargar las válidas y conserva las observadas para corrección posterior; la política de integridad definitiva del lote continúa pendiente de confirmación en CU-3764-06.
- La plantilla descargable actual es un CSV demostrativo codificado en UTF-8 con BOM para que Excel reconozca correctamente los acentos. Expone los campos de la futura plantilla XLSX: código de unidad, fuente de la orden, expediente y fecha de recepción. La generación XLSX real requiere el contrato de plantilla y el servicio correspondiente.
- Hecho verificado en referentes: HubSpot expone una tabla exclusivamente para las filas con error y permite descargarlas para corregirlas; Shopify igualmente reporta las líneas ignoradas y exige cabeceras y codificación correctas. Por ello, Capturas no enumera cientos de filas válidas: comunica solo sus contadores y presenta una tabla paginada de filas rechazadas cuando el volumen lo requiere. La vista muestra como máximo cinco errores por página y los controles aparecen desde una segunda página. [HubSpot: errores de importación](https://knowledge.hubspot.com/import-and-export/troubleshoot-import-errors?ref_type=adv), [Shopify: problemas de importación CSV](https://help.shopify.com/en/manual/products/import-export/common-import-issues)

## Propuesta para Comsatel DS

### `DatePicker` (solo fecha)

- Campo compacto con ícono de calendario y selector emergente al activarlo.
- Valor controlado en formato ISO, límites mínimo/máximo, fechas deshabilitadas, estados de validación y etiqueta equivalente a `Input` y `Select` en tamaño `md`.
- Accesible con foco inicial, flechas, Enter, Escape, cierre al hacer clic fuera y anuncio del valor elegido.

### Rango de fechas para filtros de tabla

- El DS ya expone `Calendar` con `rangeSelected`, selección por dos clics, banda continua, límites y navegación de teclado. Capturas lo compone dentro del `Popover` público, con un trigger etiquetado como “Fecha de registro” y una acción de limpieza.
- El primer clic deja un extremo pendiente y no modifica la tabla; el segundo completa el rango, lo ordena y filtra sobre la fecha de creación de la orden. No se filtra por la fecha de recepción declarada en el formulario.
- `DateTimeRangePicker` no se utiliza porque además solicita una ventana horaria diaria. Es correcto para reportes que filtran también por hora; para Capturas agregaría una decisión que la persona usuaria no necesita.

### `Autocomplete` / `Combobox`

- Entrada de consulta y lista emergente de resultados; no carga una lista completa de unidades de forma anticipada ni se abre por foco sin una consulta de al menos tres caracteres.
- API para mínimo de caracteres, resultados, estado de carga, sin resultados, error y valor seleccionado.
- Semántica ARIA de combobox/listbox, navegación con flechas, Enter, Escape y foco que no se pierda al elegir una opción.
- Debe admitir resultados remotos o paginados, porque el catálogo real supera las mil unidades.
- Cada resultado debe admitir ícono de tipo, código y metadato secundario de solo lectura (por ejemplo, propietario) en una sola fila y con el alto compacto equivalente a una opción `md` del DS, sin que el consumidor copie el patrón visual. El contrato productivo define qué metadatos están disponibles; Capturas no infiere ubicación ni telemetría.
- Una vez elegida la unidad, los datos recuperados se muestran como contexto de solo lectura, no como inputs deshabilitados: así no parecen campos que la persona deba completar ni datos que se enviarán como parte de la orden. Capturas presenta código y propietario, separados de la última ubicación por un divisor discreto; el contenido de ubicación actual es demostrativo mientras se conecta telemetría. Si no hay GPS, el producto debe comunicar esa condición sin inventar una ubicación.

### Ubicación en detalle y trazabilidad

- US3764 exige comunicar la condición de GPS disponible o no disponible, pero no especifica una columna de última ubicación en la tabla. Como decisión de producto posterior, Capturas incorpora `Última ubicación` entre sus siete columnas informativas configurables y la muestra por defecto; el ancho dinámico evita conservar desplazamiento horizontal cuando se ocultan columnas.
- En el detalle, una ubicación de demostración abre Google Maps en una pestaña nueva mediante coordenadas explícitas. La integración real deberá obtener posición, momento de reporte y URL de mapa desde telemetría; cuando no haya información, se conserva el estado “Sin posición disponible”. Las posiciones demo se asignan de forma determinística únicamente al fixture para hacer evaluable la interacción, no como una regla de producto.
- La lista de últimas posiciones y su trazabilidad pertenecen a una vista posterior. El detalle muestra un indicador compacto `Historial`, sin navegación hasta definir ruta, permisos y contrato de telemetría.

### `Select` de selección única

- El `Select` público de la versión `0.2.2` siempre agrega un control de limpieza al tener un valor, incluso si el campo es obligatorio y de selección única. Capturas lo oculta solo en Fuente de la orden para evitar que la X rompa la alineación y sugiera una acción no necesaria.
- Propuesta para el DS: `clearable?: boolean`, con una configuración predeterminada coherente según si el campo es opcional u obligatorio. Un `Select` no debe alternar a vacío al volver a elegir la opción ya seleccionada; esa conducta corresponde a controles toggle, no a una lista de elección única.

### Carga de documentos clasificados

- Capturas necesita adjuntar una Resolución, Oficio, Notificación a Tránsito y Requisitoria durante el registro de una orden.
- El flujo actual compone cuatro selectores nativos de archivo, uno por categoría, accionados con `cs-button` y presentados dentro del drawer de registro. No abre un modal adicional: cada fila conserva el tipo, estado, nombre y tamaño del archivo seleccionado, y permite reemplazarlo o quitarlo.
- Una fila con archivo adjunto conserva fondo y borde neutros. El estado se expresa de forma localizada mediante el check verde; el nombre del archivo permanece en el color principal para no confundir una selección válida con una confirmación final de registro. El rojo queda reservado para la eliminación o un error de validación.
- La aplicación valida temporalmente un PDF por categoría con máximo de 10 MB. La subida es local de demostración; el backend deberá validar tipo, tamaño, antivirus, persistencia y autorización antes de tratar un adjunto como válido.
- Propuesta para Comsatel DS: `FileUpload` con selección nativa accesible, estado vacío/cargando/completado/error, límites configurables, reemplazo, eliminación y una composición opcional para categorías requeridas. La relación entre un documento y el dominio de Capturas sigue siendo responsabilidad de la aplicación.

### Historial de la orden

- La aplicación conserva creación, edición, transiciones de estado y anulación en los datos de auditoría.
- El detalle de Capturas muestra únicamente hitos del ciclo de vida: creación, cambio de estado (incluido el cierre) y anulación. Las ediciones de campos no se presentan en esta cronología.
- Si se requiere una auditoría completa de modificaciones, se expondrá en una superficie dedicada, sin sobrecargar el historial operativo de la orden.

### Observación de una captura

- Una captura en estado `Registrada` o `En revisión` puede pasar a `Con observación` mediante una acción explícita que solicita una descripción obligatoria.
- El cambio conserva la descripción en el detalle y registra el tránsito de estado en el historial operativo. `Con observación` mantiene las acciones de edición y anulación; no permite una nueva observación hasta que exista un flujo de revisión posterior definido.
- La observación es reversible dentro del proceso, por lo que usa una acción primaria estándar; la apariencia destructiva queda reservada para anular la captura.
- Capturas aplica temporalmente el token público `--elevation-surface-overlay: #f8f5ed` en sus modales de cerrar, observar, confirmar y anular. El panel queda crema y los inputs conservan una superficie más clara, sin alcanzar selectores internos del componente.
- Mejora pendiente para Comsatel DS: exponer una propiedad pública de superficie de modal —equivalente a `surface` en `SideDrawer`— para evitar que cada consumidor tenga que redefinir el token de elevación en el host.

### Gestor de columnas de Capturas

- Capturas consume `ColumnManager` para elegir columnas visibles y reordenarlas con el mismo estado que alimenta `Table`; el orden de encabezados y celdas siempre coincide.
- La tabla ofrece siete columnas informativas configurables: `Orden`, `Unidad`, `Propietario`, `Última ubicación`, `Fuente`, `Estado` y `Registro`. Todas se muestran por defecto; `Última ubicación` presenta la posición más reciente disponible o el texto `Sin posición disponible`.
- `Acciones` no se expone en el gestor: permanece visible y fija al extremo derecho, de modo que las operaciones por fila continúan disponibles aunque la persona oculte columnas informativas. El gestor exige mantener al menos tres columnas informativas visibles.
- El ancho mínimo de la tabla se calcula con las columnas visibles. Al ocultar información, las columnas restantes ocupan el espacio disponible y el desplazamiento horizontal desaparece cuando su suma mínima ya cabe en el contenedor; la sombra de `Acciones` se recalcula en el mismo cambio.
- Con las siete columnas visibles, `Propietario` reserva 144 px: conserva legibles los nombres de demostración y permite que la matriz completa quepa en el área disponible cuando el menú lateral está contraído. El scroll horizontal solo aparece cuando el viewport realmente no puede alojar los mínimos de contenido.
- `Fuente` conserva un ancho estable de 176 px y `Última ubicación` es la columna flexible. Esta última absorbe el espacio sobrante para mantener la dirección en una línea cuando el viewport lo permite, pero conserva un mínimo de 272 px y pasa a dos líneas cuando el espacio es limitado.
- Capturas ocupa como mínimo el alto disponible del shell. El `<main>` no usa `gap` para separar sus hijos porque también contiene hosts de drawers y modales: aunque estén cerrados y midan cero, un grid seguiría acumulando separaciones entre ellos. Solo `matrix-section` distribuye el encabezado, filtros, utilidades y tabla; el espacio libre queda dentro del cuerpo de la matriz y la paginación permanece al fondo. Así no aparece un bloque externo ni scroll vertical artificial por overlays ocultos.
- Mejora pendiente para Comsatel DS: `lockedKeys` y una acción de restablecimiento. Harían explícitas las columnas obligatorias y permitirían recuperar la configuración predeterminada sin que cada consumidor tenga que excluir y anexar columnas manualmente.
- Mejora pendiente para Comsatel DS: cuando `label` está vacío, `ColumnManager` debe omitir el nodo de etiqueta o el `gap` asociado. En `0.2.2`, el trigger `md` mide 32 px, pero su contenedor alcanza 36 px por ese espacio residual; Capturas aplica una corrección temporal y acotada.
- Mejora pendiente para Comsatel DS: `ColumnManager` debe exponer el rol visual del texto de su trigger y el `offset` del panel. Capturas replica temporalmente la tipografía y el color `base-subtlest` del placeholder de `Select` `md`, y reduce de 8 px a 4 px la distancia del panel de administración.
- Mejora pendiente para Comsatel DS: las filas de `ColumnManager` deben incluir el mismo estado hover que las opciones de `Select`. Capturas aplica `color-background-neutral-subtlest-hover` sin sobrescribir los estados de arrastre o destino.
- Hecho verificado de accesibilidad: una funcionalidad que depende del arrastre debe ofrecer también una alternativa operable con un puntero simple. WCAG 2.2 muestra explícitamente como solución los botones `Subir` y `Bajar` para mover elementos paso a paso; el patrón de lista reordenable de WAI-ARIA usa igualmente controles separados para ambas acciones. [WCAG 2.2 — Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [Technique G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219), [WAI-ARIA APG — Rearrangeable Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/)
- Limitación verificada en Comsatel DS `0.2.2`: `ColumnManager` solo publica `columns`, `minVisible`, `visibilityChange` y `orderChange`; internamente reordena mediante eventos nativos de drag y no expone acciones, slots ni API pública para mover una fila. Capturas no duplicará ni alcanzará la implementación interna para agregar las flechas.
- Mejora requerida para Comsatel DS: cada fila debe incorporar botones compactos `Subir {columna}` y `Bajar {columna}` que emitan el mismo `orderChange`. `Subir` queda deshabilitado en la primera posición y `Bajar` en la última; después del movimiento se conserva el foco en el control activado y se anuncia la nueva posición mediante una región `aria-live`. Las acciones deben permanecer disponibles para clic o toque —no solo en hover— y el arrastre se conserva como atajo complementario.

### Separación y superficie de overlays

- Hecho verificado en referentes: Base UI usa `sideOffset={4}` en los ejemplos oficiales de `Select` y `Menubar`, pero usa `sideOffset={8}` para un `Popover` informativo. Atlassian ubica la separación entre trigger y superficie elevada dentro de su escala compacta de 0 a 8 px. [Base UI: Select](https://base-ui.com/react/components/select), [Base UI: Menubar](https://base-ui.com/react/components/menubar), [Base UI: Popover](https://base-ui.com/react/components/popover), [Atlassian: Spacing](https://atlassian.design/foundations/spacing)
- Decisión de producto: Capturas usa 4 px cuando el overlay continúa directamente la tarea del control: selects, autocompletado, calendario, gestor de columnas y menús de acción. Los 8 px quedan reservados para popovers informativos o superficies que deban percibirse como independientes.
- Las listas de opciones y el calendario usan superficie base blanca. El lienzo general conserva el crema para mantener la jerarquía entre fondo de página y contenido interactivo.
- El selector de fechas compone `Calendar` y su pie de acciones como una única superficie: el contenedor exterior es dueño del borde, `radius-lg`, fondo blanco, recorte y sombra; el calendario interno no repite borde, radio ni elevación. Así la acción `Limpiar` permanece dentro del mismo perímetro visual.

### Acción de modal durante carga

- `cs-button` conserva el espacio de su contenido proyectado mientras muestra el spinner de carga; por tanto, la acción de confirmación no cambia de ancho.
- Capturas mantiene temporalmente un ancho mínimo global para su modal porque aún consume la versión publicada `0.2.2`; se retira cuando adopte la versión del DS que incluye la corrección.

### Columna fija en tablas responsivas

- `TableColumn` no publica una propiedad para fijar una columna al inicio o al final durante el desplazamiento horizontal.
- Capturas mantiene temporalmente la última columna, `Acciones`, fija a la derecha mediante estilos locales limitados a esa tabla. El ancho mínimo se calcula con las siete columnas informativas visibles más `Acciones` y disminuye según las columnas que la persona oculte, de modo que el scroll solo permanece cuando el contenido realmente supera el contenedor.
- Propuesta de API para el DS: `sticky?: 'start' | 'end'` en `TableColumn`. Debe resolver encabezado, cuerpo, filas hover/resaltadas, fondo de la celda fija, separador visual, orden de apilamiento y navegación horizontal sin requerir selectores internos en cada consumidor.
- Referencia de comportamiento: MUI Data Grid separa columnas fijadas con sombra cuando existe desplazamiento horizontal; permite elegir sombra, borde o ambos. En Capturas se usa solo un degradado de sombra mientras queda contenido oculto antes de la columna fija. Su visibilidad depende del desbordamiento medido, no de un breakpoint: se retira al llegar al final del desplazamiento —o si no hay desborde— para no indicar columnas inexistentes. [MUI: Column pinning](https://mui.com/x/react-data-grid/column-pinning/)
- `--color-interaction-hovered` es translúcido. Una celda fija debe conservar una superficie opaca para no revelar columnas desplazadas; para igualar el hover de la fila se compone una sola capa del token como imagen de fondo sobre esa superficie, sin aplicarlo como dos fondos superpuestos. El componente Table debe resolver esta composición cuando incorpore columnas fijas.

### Navegación móvil del producto

- El drawer móvil debe usar `cs-menu` en modo `expanded`: incluye etiquetas, grupos y subítems. El modo `rail` solo corresponde al sidenav de escritorio/tablet.
- El estado de rail de `AppLayoutState` no se debe propagar al drawer móvil. El producto lo fuerza a `expanded` según el viewport y oculta el control de colapso dentro del drawer.
- El logo se muestra una sola vez en el topnav móvil. El drawer inicia debajo de ese header, usa `--layout-sidenav-width-expanded` y no incluye la cabecera de escritorio duplicada. El backdrop comienza también debajo del topnav.
- El trigger móvil se presenta como control de navegación por ícono, situado antes del logo dentro del header; conserva botón semántico, etiqueta accesible y foco visible. El drawer cerrado queda fuera de la navegación de teclado mediante `inert`.

## Auditoría de conformidad — construido pero no alineado al sistema de diseño

Fecha: 20 de septiembre de 2026
Alcance: revisión del código ya construido (commiteado y en curso) contra la
API pública y los tokens publicados de Comsatel DS `0.2.2`, usando el README
instalado, `tokens.css`, `typography-tokens.css` y el `.d.ts` del paquete como
fuente de verdad. No se repiten aquí las brechas de API ya registradas arriba
(Autocomplete/Combobox, DatePicker, `clearable`, `sticky`, `lockedKeys`,
ancho de modal, superficie de modal). Todo lo listado es corrección en la
aplicación, no un contrato faltante del DS, salvo donde se indica lo
contrario. Pendiente de aplicar: queda registrado como el punteo de partida
para la próxima pasada de corrección.

### Rol tipográfico equivocado en labels externos de campo `md`

- El DS define `fieldLabelTypography.md = content/note` (12px/18px) para el
  label encapsulado de `Select`, `InputDropdown` y `DateTimeRangePicker`. La
  aplicación fija en su lugar `content/ui` (13px/19.5px) en cuatro sitios,
  rompiendo la paridad entre labels equivalentes:
  - `src/styles.css:108-113` — además sobrescribe con `!important` la clase
    interna `.cs-select__label` del DS, algo que el contrato prohíbe
    explícitamente. El comentario que justifica el override parte de una
    premisa falsa: sin él, `cs-select` ya renderiza en 12px.
  - `src/app/features/capture-orders/new-capture-order.page.ts:1021-1026`
    (`.toolbar-field > label`: "Buscar orden o unidad", "Estado", "Fecha de
    registro").
  - `src/app/features/capture-orders/new-capture-order.page.ts:1268-1273`
    (`.form-field > label`: "N.º de expediente", "Fecha de recepción").
  - `src/app/features/capture-orders/unit-autocomplete.component.ts:115-122`.
  - `src/app/features/capture-orders/unit-type-multi-select.component.ts:93-100`.
- Corrección: usar `var(--font-size-content-note)` y
  `var(--font-line-height-content-note)` en los cuatro sitios y eliminar el
  override de `.cs-select__label` en `styles.css` una vez corregido.
- El filtro "Estado" (`cs-input-dropdown`) ya expone una prop pública
  `[label]` que resuelve este mismo rol sin CSS propio; la app arma en su
  lugar un `<label>` manual con `aria-labelledby`. Conviene adoptar la prop
  pública ahí en vez de mantener el label compuesto a mano.

### Tokens CSS inexistentes en `operations-layout.component.ts`

Cuatro `var()` que no resuelven a ninguna custom property publicada por el
paquete — el navegador las trata como no definidas, así que el efecto
simplemente no se aplica:

- `operations-layout.component.ts:105` — `var(--z-index-tooltip)` no existe;
  el token real es `--elevation-z-index-tooltip`.
- `operations-layout.component.ts:112` y `:212` — `var(--elevation-shadow-raised)`
  no existe; las sombras públicas son `--shadow-xs/sm/md/lg/xl`.
- `operations-layout.component.ts:255` — `var(--color-icon-base-subtle)` no
  existe; el token real es `--color-icon-neutral-subtle`.

### Esquema de tokens inventado en `fleet-dashboard.page.ts` y `fleet-map.page.ts`

Ambas páginas usan una convención de nombres que no corresponde a ningún
token publicado en `0.2.2` (posible resabio de otra versión o sistema).
Ninguna de estas variables resuelve a un valor real, así que tipografía de
encabezados, radios y colores de fondo/borde/texto quedan sin aplicar:

| Usado (no existe)                                          | Token público real                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--font-size-display-sm` / `--font-line-height-display-sm` | `--font-size-heading-medium` / `--font-line-height-heading-medium` (ajustar a la jerarquía deseada)                     |
| `--font-size-heading-lg` / `--font-line-height-heading-lg` | `--font-size-heading-small` / `--font-line-height-heading-small`                                                        |
| `--font-weight-semibold`                                   | `--font-weight-emphasis`                                                                                                |
| `--border-radius-lg` / `-md` / `-sm`                       | `--radius-lg` / `-md` / `-sm`                                                                                           |
| `--color-border-base-subtle`                               | `--color-border-neutral-subtlest`                                                                                       |
| `--color-background-base-subtlest`                         | `--color-background-neutral-subtlest`                                                                                   |
| `--color-background-brand-bold`                            | `--color-background-brand-default` (o `-bolder`)                                                                        |
| `--color-text-base-inverse`                                | `--color-text-inverse`                                                                                                  |
| `--color-border-brand-bold`                                | `--color-border-brand-default` (o `-bolder`)                                                                            |
| `32px` / `24px 20px` / `1px solid` crudos                  | `var(--layout-padding-4xl)` / `var(--layout-padding-3xl) var(--layout-padding-2xl)` / `var(--layout-border-thin) solid` |

Ubicaciones: `fleet-dashboard.page.ts:37-39` y `fleet-map.page.ts:23-25`.

### Color de lienzo cálido hardcodeado y duplicado con valores distintos

- `src/styles.css:147-149` fija `#fcfaf4` sobre el token **compartido**
  `--elevation-surface-default`, con alcance `body:has(.operations-shell)`.
  El propio comentario admite que ese alcance también afecta popovers y
  modales que el DS porta al `body` — el fondo decorativo de una pantalla
  termina alterando la superficie de cualquier flotante del DS en toda el
  área autenticada.
- El mismo tono se repite con un segundo valor distinto (`#f8f5ed`) en:
  `new-capture-order.page.ts:950` (`.capture-matrix`),
  `operations-layout.component.ts:193` (`.operations-main`) y
  `side-drawer.component.ts:142` (`.side-drawer--canvas`); mientras
  `side-drawer.component.ts:128` (`.side-drawer`) usa `#fcfaf4`.
- Ningún token público de fondo cubre este tono (los publicados son
  grises/azulados). Corrección propuesta: unificar en un único valor,
  definirlo como custom property local de la app (no reescribir
  `--elevation-surface-default`) y acotar el override de superficie solo al
  contenedor que necesita el fondo cálido. Si el tono es una decisión de
  marca permanente, evaluar proponerlo al DS como token público nuevo (por
  ejemplo `--color-background-canvas`) en vez de repetirlo localmente.

### Color de borde hardcodeado en `side-drawer.component.ts`

- `side-drawer.component.ts:151` y `:196` repiten `#e4dac9` (beige) en
  `border-bottom`/`border-top` del header y footer del drawer, mientras el
  panel mismo (línea 126) sí usa `var(--color-border-neutral-subtle)`.
  Inconsistente dentro del propio archivo. Corrección: extraer a una sola
  declaración local, o documentar explícitamente si el criterio es que
  header/footer usen un borde distinto por acompañar el fondo cálido.

### Color de ícono hardcodeado en `styles.css`

- `src/styles.css:278-284` — `.document-upload__icon` usa `#6b5940` (marrón)
  en el estado por defecto, mientras el estado `--complete` de la misma
  regla sí usa `var(--color-text-success-default)`. Corrección sugerida:
  `var(--color-icon-neutral-default)` o `var(--color-text-base-subtle)`,
  coherente con el resto de `document-upload`.

### Ancho excesivo en los filtros de la matriz — corregido

Fecha: 20 de septiembre de 2026.

- **`Fecha de registro`.** El campo disparador (`cs-input-group` + botón de
  calendario) estaba fijado a `257px`, el mismo ancho que el calendario
  emergente (`.date-range-popover`), sin relación con el contenido real.
  Sobraba tanto espacio entre el texto del rango elegido y el ícono que
  parecía un campo vacío. Se midió en navegador el texto más largo realista
  (`"10 set. 2026 — 19 set. 2026"` ≈ 166px con la fuente `content/ui` real
  del campo `md`) y se fijó `.toolbar-field--date-range` y la columna
  correspondiente de `.matrix-toolbar` a `220px` — deja una separación
  razonable sin el hueco original. El calendario emergente se mantiene en
  `257px`: no hay motivo para acoplar el ancho del trigger al de la
  superficie del calendario.
- **`Estado`.** El disparador de `cs-input-dropdown` combinaba `[fullWidth]="true"`
  con un ancho local fijo de `180px`, mientras el menú (`.cs-input-dropdown__menu`)
  se mide y dimensiona solo por su propio contenido (≈`138px` para "Todos los
  estados"), sin relación con el ancho impuesto al disparador — de ahí el
  mismo problema de aire sobrante. Se quitó `[fullWidth]="true"` y el ancho
  fijo de `.toolbar-field--status`/`.status-filter-control`, dejando que el
  componente se dimensione por su propio contenido (`inline-size: max-content`
  en la celda del grid). Verificado en navegador: el disparador pasó de
  `180px` a `~149px` y no varía de forma perceptible al cambiar entre
  opciones cortas y largas (`147px` con "Cerrada" seleccionada), es decir, el
  propio componente ya calcula un ancho estable basado en la opción más
  larga del catálogo, no en el valor actual — no hacía falta que la app lo
  impusiera.

**Brecha residual del DS, no corregible desde la app.** Aun con el
disparador dimensionado por contenido, el menú sigue midiendo ~14px menos
que el disparador (`135px` vs `149px` verificado en navegador): el
disparador reserva espacio para el ícono `chevron-down` y su `gap` (20px en
total), pero el menú no agrega ese mismo margen al calcular su propio ancho,
así que siempre queda un poco más angosto que su disparador. Cerrar esta
diferencia exigiría sobrescribir `.cs-input-dropdown__menu` desde la app, lo
que rompe la anatomía interna del componente (mismo problema del Hallazgo 1
de la auditoría de conformidad) — se documenta como propuesta en vez de
resolverse con un override.

#### Propuesta para Comsatel DS: ancho mínimo del menú de `InputDropdown`

- El menú de `cs-input-dropdown` (y de cualquier control equivalente que
  abra una superficie flotante desde un disparador, como `Select`) debería
  calcular su ancho como `max(anchoMedidoDelContenido, anchoRenderizadoDelDisparador)`,
  no solo el contenido de las opciones. Así el menú nunca queda más angosto
  que el control que lo abre, sea cual sea el ancho final que le dé la
  aplicación consumidora (fijo, `fullWidth` o por contenido).
- Comportamiento esperado: si el disparador es más ancho que la opción más
  larga (por ejemplo, un formulario con controles `lg` alineados), el menú
  se estira para igualar el disparador; si el disparador es más angosto que
  el contenido, el menú usa su ancho de contenido normalmente (el caso ya
  cubierto hoy).

### Texto del disparador de `ColumnManager` sin unidad — brecha del DS

- El disparador de `cs-column-manager` muestra `"7 de 7 visibles"`. El texto
  sale de un getter interno sin ningún prop público para modificarlo:
  ```js
  // node_modules/@iamacalupuenzo-ui/comsatel-ds/fesm2022/iamacalupuenzo-ui-comsatel-ds.mjs:5221
  get triggerText() {
    return `${this.visibleCount} de ${this.columns.length} visibles`;
  }
  ```
  La API pública (`label`, `ariaLabel`, `columns`, `size`, `disabled`,
  `minVisible`) no incluye ningún input para el sustantivo ("visibles" a
  secas no dice qué se cuenta). No es editable desde la aplicación sin
  parchear `node_modules`, algo que el contrato de consumo prohíbe.
- Propuesta para el DS: agregar un input público, por ejemplo `itemLabel`
  o `unitLabel: string` (default `'visibles'` para no romper consumidores
  existentes), y componer `triggerText` como
  `` `${visibleCount} de ${columns.length} ${itemLabel ?? 'visibles'}` ``.
  Capturas necesita `itemLabel="columnas visibles"` para que el disparador
  diga `"7 de 7 columnas visibles"`. Sin inconveniente en que el control se
  ensanche un poco para dar cabida a la palabra adicional.

## Pendientes de definición funcional

- Validar con negocio si el número de expediente lo digita el operador, se genera automáticamente o ambos escenarios existen.
- Definir catálogo productivo y regla de disponibilidad de unidades para el selector buscable.
- Confirmar si el contrato de unidad expone propietario y su tratamiento cuando no está disponible. Mientras tanto, el simulador lo presenta solo como dato recuperado, nunca editable.
- Confirmar el conjunto definitivo de fuentes y el significado operativo de cada estado de captura.
