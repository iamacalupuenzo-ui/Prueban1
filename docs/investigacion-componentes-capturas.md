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

### Buscador flotante del mapa — ajustado al patrón de C-Locater

- **Referencia auditada.** `FloatingMonitor.tsx` (C-Locater, producción) resuelve
  el buscador flotante sobre el mapa con tres decisiones concretas: la píldora
  colapsada usa un radio completo (`rounded-full`), el clic sobre la píldora
  abre el panel y enfoca el campo automáticamente
  (`setTimeout(() => inputRef.current?.focus(), 200)`), y el campo de texto no
  tiene caja ni borde propios — es transparente y comparte tipografía con el
  estado colapsado.
- **Corregido en `fleet-map-search.component.ts`** usando solo API pública de
  `comsatel-ds` 0.2.2, sin tocar internals:
  - Radio: se separó el radio compartido de `.monitor`/`.collapsed-search`
    (antes ambos usaban `--radius-md`). La píldora colapsada ahora usa
    `--radius-full`; el panel expandido conserva `--radius-md`.
  - Borde del campo: se dejó de envolver `cs-input-group-input` en
    `cs-input-group`. El borde/fondo de la caja es propiedad exclusiva de
    `cs-input-group` (`.cs-input-group{border:...;background:...}` en
    `input-group.tsx`); `cs-input-group-input` ya se estiliza a sí mismo sin
    borde (`border:none;background-color:transparent`) porque su tamaño real
    lo fija con estilos en línea desde `INPUT_FIELD_TOKENS`, independientes
    del contenedor. Es una recomposición pública, no un parche.
  - Tipografía: el campo usaba `fieldSize="sm"`, que resuelve a
    `--font-size-content-note` — más chico que el rótulo
    `"Buscar N unidades..."` del estado colapsado, que usa
    `--font-size-content-ui`. Se cambió a `fieldSize="md"`
    (`INPUT_FIELD_TOKENS.md.fontSize === '--font-size-content-ui'`), que sí
    coincide. Verificado en navegador: ambos estados miden `0.8125rem`.
  - Auto-foco: se agregó `@ViewChild('searchInput', { read: ElementRef })`
    sobre `cs-input-group-input` y, al abrir, `setTimeout(() =>
    searchInputRef?.nativeElement.querySelector('input')?.focus())`. Se
    necesita `read: ElementRef` porque el ref por defecto sobre un componente
    Angular resuelve a la instancia de la clase, no al elemento nativo.
    `queueMicrotask` no alcanza a esperar el pintado del signal `isOpen`;
    `setTimeout` sí, igual que en la referencia de C-Locater.
- **Brecha del DS — sin método público para enfocar `cs-input-group-input`.**
  El componente no expone `focus()` ni ningún equivalente. Para enfocarlo
  desde el consumidor hay que leer el código fuente instalado y replicar el
  mismo patrón que usa `InputGroupAddon.onClick()` internamente
  (`elementRef.nativeElement.querySelector('input')?.focus()`). Propuesta:
  exponer un método público `focus()` en `InputGroupInput` (o aceptar un
  `ElementRef` de `<input>` real vía `viewChild` con `exportAs`) para que los
  consumidores no dependan de un detalle de implementación no documentado.
- **Brecha de documentación — mapeo `fieldSize` → token tipográfico no está
  en el contrato público.** `sm`/`md`/`lg` de `InputFieldSize` no dejan
  intuir a qué rol tipográfico corresponde cada uno
  (`sm→content-note`, `md→content-ui`, `lg→content-body`); asumir que
  `sm` = texto chico llevó al error de tipografía que se corrigió hoy.
  Propuesta: documentar esa tabla en el README público de `InputGroupInput`/
  `Input`.
- **Verificado y descartado — `cs-fleet-unit-list` NO es el componente para
  esta fila.** Se leyó su implementación completa en el paquete instalado
  (`FleetUnitList`, fesm2022, clase en torno a la línea 3899). Es un
  acordeón (`cs-accordion`/`cs-accordion-item`) pensado para telemetría
  expandible: ícono de vehículo fijo (`name="truck"` hardcodeado, no varía
  por tipo), avatar cuadrado con esquinas redondeadas
  (`border-radius:var(--radius-md)`, no círculo), fondo de marca plano
  (no varía por estado), y al expandir muestra velocidad/batería/ubicación/
  diagnóstico más un botón "Ver detalle". No hay tres-puntitos, no hay
  ícono de GPS, y la forma del avatar no coincide con lo pedido. Se
  descarta como candidato para esta fila; queda solo como nota de que
  existe, por si en el futuro se necesita un panel de telemetría expandible
  (caso de uso distinto al buscador flotante).

### Avatar del vehículo — se dejó neutro para todos, el estado ya no vive ahí

- Enzo notó que unos autos tenían aro y fondo azul y otros gris, y preguntó
  por qué no eran todos iguales. Era un resto de la segunda corrección de
  esta sección (cuando el estado todavía se comunicaba en el propio
  avatar): `.vehicle-card__avatar--offline` seguía cambiando el aro/fondo/
  ícono según `unit.status`. Con las dos insignias de estado ya
  construidas (GPS y encendido), esa variación quedó redundante y
  confusa — dos señales de color distintas (avatar + insignias) compitiendo
  por decir lo mismo.
- Se quitó el modificador `--offline` y el binding correspondiente en el
  template. El avatar ahora es siempre neutro
  (`--color-background-neutral-subtlest` / `--color-border-neutral-default` /
  `--color-icon-neutral-default`) para las 5 unidades — solo identifica el
  tipo de vehículo, no su estado. El estado vive exclusivamente en las
  insignias (`.vehicle-card__gps`, `.vehicle-card__ignition`).
- **Corrección — el pedido de 8px era el espacio avatar↔texto, no
  título↔fecha.** Primer intento equivocado: cambié el `gap` vertical de
  `.vehicle-card__body` (título/fecha) de 2px a 8px. Enzo aclaró con una
  captura de DevTools que el 8px pedido era el espacio HORIZONTAL entre el
  avatar circular y el bloque de texto (nombre/código/fecha), que estaba en
  `--layout-gap-sm` (6px) dentro de `.vehicle-card__main`. Se revirtió
  `.vehicle-card__body` a `--layout-gap-2xs` (2px, como estaba) y se
  cambió el `gap` de `.vehicle-card__main` a `--layout-gap-md` (8px).
  Verificado con `getBoundingClientRect()`: avatar→texto = 8px,
  título→fecha = 2px.

### Filtros del buscador (`Todos`/`Todos`) — la lista debe verse como `cs-select`

- Enzo pidió mantener el disparador compacto (`filter-control`, el botón
  "Todos ⌄") pero construir la lista que se abre igual que el `cs-select`
  público del DS, no como un menú genérico — puntualmente notó que faltaba
  el ícono de check en la opción seleccionada.
- Se leyó la implementación real de `cs-select` en el paquete instalado
  (clase `Select`, fesm2022 ~línea 4636) para copiar el patrón exacto en
  vez de inventar uno parecido:
  - Opción seleccionada: `cs-icon name="check"` al final de la fila,
    color `--color-text-brand-bolder`, fondo `--color-background-brand-subtlest`,
    `font-weight:var(--font-weight-emphasis)` (las no seleccionadas usan
    `--font-weight-accent`).
  - Hover (solo si no está seleccionada):
    `--color-background-neutral-subtlest-hover`.
  - Contenedor del menú: `background:var(--color-background-base)`,
    `border-radius:var(--radius-lg)`, `box-shadow:var(--shadow-xl)`,
    `border-color:var(--color-border-neutral-default)` — antes usaba
    `--elevation-surface-default`/`--radius-md`/`--shadow-lg`, valores
    parecidos pero no los que realmente usa `cs-select__menu`.
  - `.filter-menu` de `fleet-map-search.component.ts` se actualizó con
    estas clases (`filter-menu__label`, `filter-menu__check`) para
    replicar 1:1 el `cs-select__option` real, en vez del popover genérico
    que tenía antes. Verificado en navegador: al elegir "Todos" aparece el
    check azul junto a la opción.
- **Títulos de filtros ambiguos — corregido.** Enzo señaló dos problemas
  de nomenclatura:
  - El primer filtro decía "Todos"/"En ruta"/"Sin señal", pero el campo
    que filtra (`FleetUnit.status`) siempre fue estado de señal GPS, no de
    ruta/movimiento (ya se estableció esa distinción al construir las
    insignias de GPS/encendido). "En ruta" se renombró a "Con señal" para
    no mezclarlo con el estado de encendido del motor.
  - Ambos catch-all decían el genérico "Todos", sin decir de qué. Se
    reemplazó por "Todos los estados"/"Todas las unidades", igual al
    patrón ya establecido en el toolbar de la matriz de Capturas
    (`capture-order-toolbar.component.ts:51`, placeholder
    `"Todos los estados"`) — no se inventó una redacción nueva.
  - **Revertido.** El envoltorio a dos líneas sí resultó ser un problema
    para Enzo ("demasiado grande"). Se revirtió el catch-all de ambos
    filtros a "Todos" (una palabra, como estaba antes de este punto). Lo
    que SÍ se mantiene es el renombre semántico "En ruta" → "Con señal" en
    la opción de estado — ese cambio no era el que causaba el problema de
    tamaño y sigue siendo correcto (el filtro es de señal GPS, no de
    ruta). Los disparadores volvieron a una sola línea de 28px.

### Chips de filtros activos — quitados, eran redundantes

- Enzo notó que, al elegir "Camión" en el filtro de tipo, aparecía una
  fila con un chip "Camión ✕" debajo de los disparadores — redundante,
  porque el propio disparador ya cambia de "Todos" a "Camión" para
  mostrar la selección activa. Se quitó `.monitor__chips`/`.filter-chip`
  del template y sus estilos en `fleet-map-search.component.ts`. Los
  disparadores siguen siendo la única fuente de verdad visual del filtro
  activo (más el check dentro del menú al abrirlo).

### Deseleccionar unidad al hacer clic fuera

- Enzo notó que la unidad seleccionada (tarjeta resaltada en el buscador)
  seguía marcada aunque hiciera clic en cualquier otro lugar — el mapa
  vacío, los filtros, cualquier parte de la página. Solo cambiaba al
  seleccionar otra unidad explícitamente.
- Se agregó `FleetMapService.deselectUnit()` (mismo patrón que
  `selectUnit()`/`clearFilters()`) y un `@HostListener('document:click')`
  en `FleetMapPage` — mismo patrón `@HostListener` que ya usa
  `side-drawer.component.ts` para `document:keydown`, no uno nuevo. La
  regla: cualquier clic cuyo `event.target` no esté dentro de
  `.vehicle-card__main` (la fila que selecciona en el buscador) ni de
  `.leaflet-marker-icon` (clase que Leaflet agrega a todo marcador,
  incluido el nuestro) limpia la selección.
- Verificado en navegador: clic en el buscador → tarjeta queda resaltada;
  clic en lienzo vacío del mapa → se limpia; clic (evento real,
  disparado sobre el propio `.leaflet-marker-icon`) en un marcador →
  selecciona y NO se autodeselecciona en el mismo clic, confirmando que
  la excepción del listener funciona y no compite con el propio
  `(click)="state.selectUnit(unit)"` del marcador.

### Tarjeta de unidad del buscador — rediseño según referencia de producto

- **Referencia auditada.** Tres capturas del sistema/producto de Enzo (no de
  C-Locater) especifican la fila: avatar circular con fondo de color por
  estado; código + nombre en la misma línea arriba; fecha completa con hora
  abajo; chevron y botón de tres puntos a la derecha; ícono de GPS sobre el
  avatar. La tarjeta anterior (cuadrado neutro, nombre/código apilados en
  dos líneas, `cs-tag` de estado + hora corta a la derecha) fue señalada
  explícitamente como lo que sobra.
- **Construido en `fleet-map-search.component.ts` componiendo solo tokens y
  `cs-icon` público, sin componente nuevo del DS:**
  - Avatar circular (`--radius-full`) con `background: var(--color-map-vehicle-active)` / `var(--color-map-vehicle-offline)` — reutiliza los mismos tokens de estado ya establecidos en `fleet-map-canvas.component.ts` para los marcadores del mapa (mismo criterio, no uno nuevo).
  - Ícono de GPS: `cs-icon name="satellite"`, como insignia circular en la
    esquina del avatar (misma posición que `marker-pill__dot` en
    `vehicle-pill.css` de Comsatel-DS-Angular). Es el mismo ícono que usan
    `gps-compact` y `gps-full` en la página de referencia "Mapa /
    Marcadores" del sistema de diseño — no se inventó un ícono nuevo.
  - Código + nombre en una sola línea (`.vehicle-card__title`, `display:flex`
    en vez de la grilla de dos filas anterior).
  - Fecha completa: se cambió `FleetUnit.lastUpdate` de `'10:14'` (hora
    suelta) a un datetime ISO completo en `fleet-telemetry.service.ts`, y se
    formatea con `Intl.DateTimeFormat('es-PE', { dateStyle: 'medium',
    timeStyle: 'short' })` — el mismo formateador que ya usaba
    `fleet-telemetry.service.ts` para "Última actualización" en el
    tablero, para no inventar un segundo formato de fecha en la misma app.
  - Tres puntos: `cs-icon name="more-horizontal"` (el DS no publica un
    ícono de "más" vertical, solo horizontal; confirmado en el registro de
    íconos del paquete). Se rota 90° por CSS (`transform:rotate(90deg)`)
    para que se vea vertical, que es lo pedido, sin inventar un ícono
    nuevo. No tiene menú funcional todavía — es solo el affordance visual,
    el contenido del menú queda pendiente de definición de producto. Se
    quitó el chevron que había puesto en el primer intento: la fila no
    necesita dos afordancias de "más" (chevron + tres puntos), solo una.
  - Se quitó `<cs-tag>` de estado y la hora corta de la derecha (imagen
    señalada por Enzo como lo que sobra); el estado ahora se comunica por
    el color del avatar, no por una etiqueta de texto aparte.
- **Corrección — el primer intento del avatar circular usaba relleno sólido
  de color (`--color-map-vehicle-active`/`offline`, el mismo token de los
  marcadores del mapa) y quedó "horrible" según Enzo.** El color sólido
  reutiliza el vocabulario de los MARCADORES DEL MAPA, no el de la
  aplicación consumidora; dentro de una lista, dijo, el ícono debe ir sobre
  un fondo tenue (más claro que el crema del buscador), el ícono un poco
  más grande, y el aro debe ser una línea azul — no relleno. Se corrigió
  reutilizando el mismo patrón ya establecido en `cs-list-item__leading`
  del propio DS (`background:var(--color-background-brand-subtlest)`,
  `color:var(--color-icon-brand-default)`), sumado a un borde
  (`border:1.5px solid var(--color-border-brand-default)`) para el aro
  azul pedido. Variante `--offline` usa el mismo patrón con la familia
  neutral (`--color-background-neutral-subtlest`,
  `--color-border-neutral-default`, `--color-icon-neutral-default`) en vez
  de inventar un segundo par de tokens. Ícono subido de 16px a 20px y
  círculo de 36px a 40px.
- **Corrección — el hover de la fila usaba el hover genérico de la DS, no
  el de esta app.** Enzo señaló que FleetOperations ya tiene su propio
  efecto hover establecido, visible en la sección "Documentos de respaldo"
  del formulario de captura (`.document-upload:hover` en
  `src/styles.css:333`): cambia `border-color` a
  `var(--color-border-brand-default)` y agrega `box-shadow:var(--shadow-sm)`,
  sin tocar el fondo. Se replicó ese mismo par de propiedades en
  `.vehicle-card:has(.vehicle-card__main:hover)` en vez de el
  `background-color` que se había usado antes — mismo tratamiento en las
  dos superficies de la misma app.
- **Corrección — fondo del panel no coincidía con el resto de "superficies
  flotantes" de la app.** Enzo notó que el buscador tenía otro fondo de
  color que el modal/drawer "Registrar captura". Medido en navegador:
  - El drawer de "Registrar captura" (`app-side-drawer` con
    `surface="canvas"`) renderiza `rgb(248, 245, 237)` = `#f8f5ed`,
    hardcodeado en `side-drawer.component.ts:142`
    (`.side-drawer--canvas{background:#f8f5ed}`). El mismo hex está
    repetido en `operations-layout.component.ts:195` y
    `new-capture-order.page.ts:109`.
  - `.document-upload` (las tarjetas de "Documentos de respaldo") usa
    `var(--elevation-surface-default)`, que esta app sobreescribe
    globalmente a `#fcfaf4` (más claro que `#f8f5ed`) — confirmado
    comparando el valor computado de la variable en `:root` (`#ffffff`,
    el default del DS) contra el que realmente aplica en pantalla
    (`#fcfaf4`).
  - El `.monitor`/`.collapsed-search` del buscador usaba también
    `var(--elevation-surface-default)` (`#fcfaf4`) — el mismo tono que las
    tarjetas de documentos, no el del panel/drawer que lo contiene. Se
    corrigió a `#f8f5ed`, igual que `side-drawer.component.ts`, para que
    el panel flotante y el drawer compartan la misma superficie "canvas" y
    las tarjetas (`.vehicle-card`, ya en `#fcfaf4`) queden un tono más
    claras encima — la misma relación de capas que ya existe entre el
    drawer y `.document-upload`.
  - **Brecha real, no de esta pasada.** Existe `--elevation-surface-overlay`
    público del DS (`#ffffff` claro / `#344054` oscuro en
    `tokens.css`), y esta app ya lo re-define *localmente* a `#f8f5ed`
    dentro de `.capture-surface-modal` (`styles.css:174-180`, con un
    comentario que dice explícitamente que es "variación temporal... hasta
    que el componente publique una propiedad de superficie equivalente a
    la del SideDrawer"). Fuera de esa clase, la variable cae al blanco por
    defecto del DS — por eso el buscador del mapa no podía simplemente
    escribir `var(--elevation-surface-overlay)` y tuvo que repetir el hex,
    como ya hacen los otros tres archivos. La brecha de fondo sigue siendo
    la misma que ya identificó ese comentario: falta una propiedad de
    superficie pública para "SideDrawer"/superficies canvas, en vez de
    cuatro copias del mismo hex en cuatro archivos distintos.
- **Bug real del DS — `--color-icon-brand-default` no existe.** Se copió de
  `cs-list-item__leading` (`color:var(--color-icon-brand-default)`) para el
  ícono del avatar, confiando en que era un token público válido porque el
  propio DS lo usa. Verificado en navegador: la variable resuelve a cadena
  vacía (`getComputedStyle(...).getPropertyValue('--color-icon-brand-default')
  === ''`); no está definida en `tokens.css` ni en `styles.css` del paquete
  instalado, en ningún modo. El ícono del avatar se veía gris neutro en vez
  de azul aunque el borde sí tomaba `--color-border-brand-default`
  correctamente. Es probable que `cs-list-item` tenga el mismo defecto
  visual en cualquier consumidor. Se corrigió localmente usando
  `var(--color-text-brand-default)` (sí definido, `#153565` claro /
  `#3f7ad5` oscuro, ya usado en esta misma app en `fleet-map.page.ts`
  `.eyebrow`). Propuesta para el DS: definir `--color-icon-brand-default`
  en `tokens.css` (probablemente con el mismo valor de
  `--color-text-brand-default`) o corregir `ListItem` para que use el
  token que sí existe.
- **Color de GPS — resuelto más simple de lo previsto: binario, no por
  calidad de señal.** Se había registrado como brecha pendiente (tokens de
  calidad de señal sin definir: sin señal/baja/media/alta). Enzo simplificó
  el alcance: por ahora GPS solo necesita dos estados, igual que
  encendido — verde si el vehículo tiene señal, gris si no. Como
  `FleetUnit.status` (`'En ruta' | 'Sin señal'`) ya es exactamente ese
  dato, no hizo falta agregar un campo nuevo: `.vehicle-card__gps` usa
  `[class.vehicle-card__gps--on]="unit.status === 'En ruta'"`, con
  `--color-map-vehicle-active` (verde) / `--color-map-vehicle-offline`
  (gris, sin cambios respecto del estado por defecto). La brecha real de
  tokens por calidad de señal (baja/media/alta) sigue sin resolverse, pero
  queda fuera de alcance mientras el producto no la necesite — no bloqueó
  esta iteración.
- **Encendido del motor (Ignition On/Off) — nuevo, agregado hoy.** Es un
  estado distinto al de señal GPS (`status`); antes no estaba en el modelo.
  Se agregó `FleetUnit.ignition: 'on' | 'off'` en
  `fleet-telemetry.service.ts` y una insignia en la esquina inferior
  izquierda del avatar (espejo de la insignia de GPS en la esquina
  superior derecha). El DS no publica un ícono de "encendido"; solo existe
  `power-off`. Se usó `power-off` para apagado y `activity` (ya
  establecido como ícono del estado `active` en `FleetUnitList` del propio
  DS) para encendido — decisión de Enzo. Color: `on` reutiliza
  `--color-text-success-default` (mismo verde que ya usa
  `.document-upload--complete` en `styles.css`), `off` usa
  `--color-text-base-subtlest`. Propuesta para el DS: publicar un ícono
  dedicado de "encendido" (`power-on`/`zap`/`key`) en vez de reutilizar
  `activity`, que ya tiene otro significado establecido (estado de
  movimiento) en `FleetUnitList`.
  - **Corrección de estilo — las insignias debían ir con relleno sólido,
    no tenues.** Enzo aclaró que el tratamiento tenue (fondo crema + ícono
    de color) que se usó primero para el avatar NO aplica a las insignias
    pequeñas de GPS/encendido: esas van con círculo de relleno sólido e
    ícono blanco. Se cambió `.vehicle-card__gps` y `.vehicle-card__ignition`
    a `background:var(--color-map-vehicle-active)` (verde,
    `--color-status-online`) / `var(--color-map-vehicle-offline)` (gris
    `--color-status-offline`) con `color:var(--color-text-inverse)`
    (blanco) — son los mismos tokens que ya se usan para los marcadores del
    mapa en `fleet-map-canvas.component.ts`, reubicados de donde estaban
    mal (el avatar) a donde sí correspondían (las insignias de estado).
    La insignia de GPS por ahora usa el mismo gris sólido que "apagado"
    como relleno provisional de forma/estilo, no una decisión de color por
    calidad de señal — esa sigue pendiente como brecha del DS (ver arriba).
  - **Ajuste — sin borde en las insignias.** Enzo pidió evaluar si el
    borde de 2px alrededor de GPS/encendido era necesario; se comparó
    contra la referencia real (`VehicleAccordionItem.tsx` de C-Locater,
    que sí usa borde) y contra el patrón general del mercado (Fleetio,
    Verizon Connect, Motive: el estado se lee pegado al ícono del
    vehículo, coincide con mantenerlas sobre el avatar). La decisión fue
    probar sin borde manteniendo el `box-shadow` — se ve más limpio y
    sigue siendo legible por el contraste del relleno sólido. Se quitó
    `border:2px solid var(--elevation-surface-default)` de ambas.
  - **Ajuste — encendido apagado ahora es rojo, no gris.** Enzo corrigió:
    el gris queda reservado para "sin dato/neutro" (como el badge de GPS,
    todavía sin decidir), pero "apagado" del motor debe leerse como una
    alerta, no como neutro. Se cambió `.vehicle-card__ignition` (estado
    por defecto, apagado) a `var(--color-background-danger-default)`
    (`#f63d68` claro / `#c01048` oscuro) en vez de
    `--color-map-vehicle-offline`. `.vehicle-card__ignition--on` (verde)
    no cambió. El badge de GPS se mantiene en gris neutro, sin relación
    con este ajuste.
  - **Pendiente de accesibilidad, no resuelto hoy.** Las dos insignias
    (GPS y encendido) son `aria-hidden="true"` — decorativas. El estado de
    encendido no se anuncia a lectores de pantalla porque no hay texto
    visible equivalente en la fila, a diferencia del nombre/código/fecha.
    Falta decidir cómo exponerlo (texto oculto visualmente, `aria-label`
    del botón principal, o un tooltip accesible).
  - **Nota aparte, no corregida hoy:** `.document-upload__icon` en
    `src/styles.css:342` sigue usando el color hardcodeado `#6b5940` en su
    estado por defecto — ya estaba señalado como brecha en este mismo
    documento (sección "Color de ícono hardcodeado en `styles.css`"). No se
    tocó porque no fue lo pedido en esta pasada, pero es la fuente que se
    debe corregir antes de seguir replicando ese patrón de hover en más
    lugares.
- **Nota de estructura.** La tarjeta pasó de ser un solo `<button>` a un
  `<div role="listitem">` con dos hijos: un `<button>` para
  seleccionar/volar a la unidad (avatar + texto) y un `<button>` aparte
  para el menú de tres puntos. Un `<button>` no puede anidar otro `<button>`
  en HTML válido, y la fila necesita dos acciones independientes
  (seleccionar unidad vs. abrir menú de la fila).
- **Corregido — ícono nativo de "limpiar" duplicado en el buscador.**
  `cs-input-group-input` con `type="search"` hace que Chrome/Edge agreguen
  su propio ícono nativo de limpiar (✕) dentro del campo, además del botón
  ✕ propio que ya construimos (`Limpiar búsqueda`) y el botón ✕ de contraer
  el panel — quedaban tres ✕ visibles. Se cambió a `type="text"`: mismo
  campo, mismo comportamiento, sin el ícono nativo duplicado. No se pierde
  nada semántico relevante porque ya hay ícono de lupa + `aria-label`
  explícito indicando que es un buscador.

### Estilo de `cs-select` probado en los disparadores de filtro

- Enzo pidió, a modo de prueba visual, aplicar el estilo real del
  disparador de `cs-select` (`cs-select__trigger`: caja con borde,
  fondo de campo, `radius-sm`) a los botones compactos `.filter-control`
  ("Todos ⌄"), que antes eran transparentes y sin borde. Se copiaron
  `border:var(--layout-border-thin) solid var(--color-border-neutral-default)`,
  `background:var(--elevation-surface-default)` y `border-radius:var(--radius-sm)`
  del `Select` real (fesm2022 ~línea 4636) en vez de aproximar valores. Sigue
  pendiente de que Enzo confirme si se queda así o se revierte al estilo pill
  sin borde.

### Padding de `.vehicle-card` — 6px en vez de 12px

- Enzo midió con DevTools y pidió 12px parejo en los cuatro lados. El
  padding real (verificado por `getComputedStyle`) era 6px uniforme
  (`--layout-padding-sm`), no asimétrico como parecía en la captura — se
  cambió a `--layout-padding-lg` (12px), el paso exacto de la escala para
  ese valor. Verificado: `padding-top/right/bottom/left` = 12px en los
  cuatro lados.

### Botón de tres puntos — agrandado

- Enzo lo vio demasiado chico para leerse como una acción. Se aumentó el
  ícono de 14px a 18px y el área del botón de un padding mínimo (~18px
  efectivos) a un cuadrado fijo de `--layout-size-sm` (24px), el paso
  correspondiente de la escala de tamaños del DS en vez de un valor suelto.

### Altura de opción del filtro — 36px en vez de 32px

- Enzo comparó contra el `cs-input-dropdown` de "Estado" en Capturas
  (opción de 32px de alto) y notó que la nuestra medía 36px.
- La causa: antes copié solo las reglas CSS estáticas de
  `cs-select__option`, pero la altura real de `cs-select` no sale de ahí —
  sale de estilos en línea atados a `INPUT_TOKENS[size]`
  (`fesm2022...mjs:1126`), con `md = { height: 32, paddingX: 10,
  fontSize: content-ui, lineHeight: content-ui }`. Al no copiar esa parte,
  `.filter-menu button` quedaba con `padding:6px 8px` +
  `line-height` de `content-note` (24px), sumando 36px en vez de 32.
- Se corrigió a `block-size:32px`, `padding-inline:10px` (el DS usa ese
  valor crudo, no un token, para `paddingX`), `font-size`/`line-height` de
  `--font-size-content-ui`/`--font-line-height-content-ui` — igual al
  tier `md` real. Verificado en navegador: 32px exactos.

### Color de tipografía del disparador — no distinguía "Todos" de una selección real

- Enzo comparó contra `cs-input-dropdown` de "Estado" en Capturas: ahí el
  texto del disparador cambia de color entre el estado "Todos los
  estados" (placeholder, texto tenue) y una opción real elegida (texto
  oscuro). En nuestros filtros el cambio existía pero era casi
  imperceptible.
- Causa encontrada en el propio DS: `InputDropdown.textColor`
  (`fesm2022...mjs:1791`) devuelve `--color-text-base-subtlest` cuando no
  hay `selectedOption` y `--color-text-base-default` cuando sí. Y
  `capture-orders.service.ts:305` hace que "Todos los estados" nunca
  quede como `selectedOption` real: mapea el sentinel `'__all__'` de
  vuelta a `''` (`this.statusFilter.set(value === '__all__' ? '' : value)`),
  un valor que no calza con ninguna opción — así el disparador cae al
  modo "placeholder" del componente aunque "Todos los estados" sí
  aparezca marcado con check dentro del menú.
- Nuestro `.filter-control` sí cambiaba de color con `[class.is-active]`,
  pero usaba `--color-text-base-subtle` (`#667085`) para "Todos" en vez de
  `--color-text-base-subtlest` (`#98a2b3`, el tono real que usa
  `InputDropdown` para su estado placeholder) — muy cerca del tono
  seleccionado (`--color-text-base-default`, `#344054`) para notarse.
  Se corrigió a `--color-text-base-subtlest`. Verificado en navegador:
  "Todos" = `rgb(152, 162, 179)`, "Camión" (seleccionado) =
  `rgb(52, 64, 84)`.

### Peso tipográfico del disparador — emphasis en vez de regular

- Al medir el color en `cs-input-dropdown__value`/`__trigger` con un
  inspector, Enzo notó que el peso también difiere: la referencia real
  usa `Regular (400)` en ambos estados (solo cambia el color, nunca el
  peso). `.filter-control` tenía `font-weight:var(--font-weight-emphasis)`
  fijo en las dos variantes. Se cambió a `var(--font-weight-regular)`.
  Verificado: `fontWeight` computado pasa de `600` a `400` en ambos
  disparadores, con el color ya diferenciando "Todos" (tenue) de una
  selección real (oscuro).

### Disparadores de filtro a 50/50 del ancho disponible

- Propuesta de Enzo: que "Estado" y "Tipo" repartan el espacio de la fila
  en partes iguales en vez de encogerse a su contenido. Se agregó
  `flex:1 1 0` a `.filter-control` dentro de `.monitor__filters` (antes
  `inline-flex` sin crecer) y `justify-content:space-between` para que el
  chevron quede pegado al borde derecho de cada mitad; el `<span>` del
  label trunca con elipsis si el texto no cupiera. Verificado en
  navegador: ambos disparadores miden 144px, exactamente la mitad del
  espacio disponible de la fila.

### Alineación y truncado del disparador — texto se separaba del ícono en vez de truncar

- Al pasar `.filter-control` a `flex:1 1 0` para el 50/50, se le había
  dejado `justify-content:space-between` con tres hijos (ícono, texto,
  chevron): con tres elementos ese `space-between` reparte huecos
  también entre ícono y texto, así que el texto "flotaba" hacia el centro
  en vez de quedar pegado al ícono. Enzo lo notó y además pidió volver a
  las etiquetas completas ("Todos los estados"/"Todas las unidades",
  revertidas la vez anterior por el problema de ancho) ahora que el
  control trunca con elipsis en una sola línea en vez de envolver — es el
  patrón estándar para este tipo de componente.
- Se quitó `justify-content:space-between` de `.filter-control` y se
  agregó `margin-inline-start:auto` solo al ícono de chevron
  (`.filter-control__chevron`): así únicamente el chevron se empuja al
  extremo derecho, mientras ícono+texto conservan su `gap` natural y
  quedan agrupados a la izquierda. El `<span>` ya tenía
  `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` desde el
  ajuste del 50/50.
- Se restauraron las etiquetas `'all'` a "Todos los estados"/"Todas las
  unidades". Verificado en navegador: "Todos los estados" cabe completo
  en 144px sin truncar; "Todas las unidades" sí desborda
  (`scrollWidth > clientWidth`) y trunca con elipsis, ambos en una sola
  línea de 28px de alto (sin envolver).

### `.monitor__filters` se salía del panel — `min-width:auto` de grid item

- Enzo notó que "Todas las unidades" salía del contenedor del buscador en
  vez de quedarse truncado adentro. Medido: `.monitor` (panel, 306px) vs
  `.monitor__filters` (306px + 10px de más, 316px) — el segundo disparador
  llegaba a `right:567px`, 5px pasado el borde derecho del panel
  (`562px`).
- Causa: `.monitor__filters` es un ítem del grid implícito de `.monitor`
  (`display:grid`), y por especificación CSS un ítem de grid tiene
  `min-width:auto` por defecto — no se encoge más allá del tamaño mínimo
  de su contenido aunque el contenedor sea más angosto, así que el track
  del grid se expandía para darle espacio en vez de forzar el truncado en
  los `.filter-control` de adentro. El `overflow:hidden` de `.monitor` no
  alcanza a evitarlo porque el problema es el tamaño del track, no el
  recorte visual.
- Se agregó `min-inline-size:0` a `.monitor__filters`. Verificado: la fila
  pasó a medir `304px` (dentro de los `306px` del panel) y ambos
  disparadores quedan en `144px` exactos, sin pasarse del borde derecho.
  Con el ancho ya correcto, "Todos los estados" también trunca por unos
  pocos píxeles — la elipsis funcionando en ambos casos, no un problema
  nuevo.

### Bug real encontrado al construir Recuperos — también afecta a Capturas

- **Síntoma.** Al registrar un recupero nuevo en vivo, la fila apareció al
  final de la tabla en vez de arriba, a pesar de que el orden es "Registro,
  descendente" y la orden recién creada debería ser la más reciente.
- **Causa.** `registrationTimestamp()`/`registrationDate()` (copiadas 1:1 de
  `CaptureOrdersService`) parsean el string de `createdAt` con una regex que
  asume `sep.` como abreviatura de septiembre y hora de 24h con dos dígitos
  (`08:15`) — el formato de los fixtures escritos a mano. Pero
  `Intl.DateTimeFormat('es-PE', {dateStyle:'medium', timeStyle:'short'})`
  (la función `timestamp()` real, usada al crear una orden en vivo) en este
  entorno genera `set.` (no `sep.`) y hora de 12h con `a. m.`/`p. m.`
  (verificado en navegador: `21 set. 2026, 3:35 a. m.`). La regex nunca
  matchea ese formato real, así que toda orden creada en vivo cae al
  fallback `return 0`, ordenando siempre al final sin importar qué tan
  reciente sea.
- **Corregido en `recoveries.service.ts`**: la regex ahora acepta `sep` y
  `set` como abreviaturas de septiembre, hora de 1 o 2 dígitos y un sufijo
  opcional `a. m.`/`p. m.` que se convierte a 24h antes de construir la
  fecha. Verificado en navegador: una orden creada en vivo (`21 set. 2026,
  3:38 a. m.`) ahora ordena correctamente por encima de los fixtures
  (`19 sep. 2026, 16:56`).
- **Mismo bug sigue presente en `CaptureOrdersService`** (código idéntico,
  no tocado en esta pasada porque no fue lo pedido): cualquier captura
  registrada en vivo hoy también caerá al final de la matriz en vez de
  ordenarse por fecha real, y probablemente tampoco calce con filtros de
  rango de fechas que dependan de `registrationDate()`. Requiere el mismo
  fix aplicado aquí.

## Mejoras aplicadas a Recuperos tras revisión de Enzo (21 de septiembre de 2026)

### Corrección conceptual — un recupero no se registra ya recuperado

Enzo corrigió el modelo: un recupero se registra para **monitorear** una
unidad, no porque ya se haya recuperado. La fecha de recuperación no se pide
al crear la orden — es consecuencia de un cambio de estado a "Recuperado"
(fuera de alcance de esta pasada, matriz de estados pendiente de Producto).

- **`mock-recovery-orders.service.ts`**: se quitó `recoveryDate` de
  `RecoveryOrderDraft` (ya no se pide en el formulario) y se agregó
  `recoveredAt?: string` **solo en `RecoveryOrder`**, opcional, para
  cuando ese cambio de estado exista.
- **Fixtures** (`recovery-orders.json`): `recoveredAt` solo está presente en
  REC-0103 (Recuperado) y REC-0104 (Cerrado, que pasó por Recuperado antes).
  El resto (Registrado/En gestión/Anulado) no lo tiene.
- **`recoveries.service.ts`**: nuevo helper `recoveredLabel(order)` —
  devuelve la fecha formateada si existe, o `"Pendiente de recuperar"` si
  no. Lo consumen la tabla y el detalle.
- **Diálogos de crear/editar**: se quitó el campo "Fecha del recupero"
  por completo.
- **Tabla**: columna renombrada de "Fecha del recupero" a "Fecha de
  recuperación", ahora muestra `state.recoveredLabel(order)` en vez de una
  fecha siempre presente.
- El filtro de rango de fechas del toolbar (que en realidad filtra por
  `createdAt`/fecha de registro, igual que en Capturas) tenía la etiqueta
  "Fecha del recupero" — confuso ahora que existe una fecha de recuperación
  distinta. Se renombró a "Fecha de registro", igual que en Capturas.

### Tipo de unidad junto al buscador — faltaba en el formulario

Enzo señaló que el formulario de registro/edición debía tener el mismo
selector de "Tipo de unidad" que Capturas, ubicado junto al buscador de
código de unidad (el patrón `unit-selection-grid` de
`capture-order-form-dialog.component.ts`).

- Se movió `UnitTypeMultiSelectComponent` de `capture-orders/` a
  `shared/` (igual que ya se hizo antes con `UnitAutocompleteComponent`):
  es genérico, sin acoplamiento a Capturas, y ahora lo usan dos features.
  Se actualizaron los imports en Capturas.
- `recoveries.service.ts` ganó su propio `RECOVERY_UNIT_TYPE_OPTIONS`
  (VHC/TRK/VAN/BUS + **Moto**, que Capturas no tiene — los fixtures de
  Recuperos sí incluyen unidades `MOT-*`), `unitTypeFilter` signal,
  `setUnitTypeFilter()` y `unitTypeOf()`, mismo patrón que
  `CaptureOrdersService` pero con su propio catálogo — no se importó el de
  Capturas.
- Ambos diálogos (`recovery-create-dialog`, `recovery-edit-dialog`) ganaron
  el bloque `.unit-selection-grid` (`app-unit-type-multi-select` +
  `app-unit-autocomplete`, 180px + 1fr, igual que Capturas).

### Aseguradora auto-sugerida al elegir la unidad, editable

Enzo: "al seleccionar la unidad automáticamente se me trae la aseguradora...
y la aseguradora me permite editar". Se agregó `insurer: string` a la
fixture de unidad (`RecoveryUnitFixture`) y `onUnitSelected()` ahora
también fija `sourceType: 'aseguradora'` y `sourceName: unit.insurer` al
elegir una unidad — sigue siendo un `cs-input` normal, completamente
editable después. Verificado en navegador: elegir TRK-3002 completa
"Nombre de la fuente" con "Pacífico Seguros" automáticamente.

### Sin el botón "Limpiar" (X) en "Fuente del recupero"

Mismo patrón ya documentado para Capturas
("Texto del disparador..." → sección `Select` de selección única): el
`cs-select` de fuente es obligatorio y de selección única, así que no debe
tener una X para "vaciarlo" — para cambiarlo se elige otra opción. Se
agregó la clase `recovery-source-select` al `cs-select` de ambos diálogos y
la regla global correspondiente en `styles.css`
(`cs-select.recovery-source-select .cs-select__clear{display:none}`),
calcada 1:1 de `cs-select.capture-source-select` — no se repitió el
override de `.cs-select__label` que sí tiene Capturas, porque ese ya está
señalado en este mismo documento como una corrección basada en una premisa
falsa (brecha "Rol tipográfico equivocado en labels externos de campo
`md`"), no un patrón a replicar.

## Pendientes de definición funcional

- Validar con negocio si el número de expediente lo digita el operador, se genera automáticamente o ambos escenarios existen.
- Definir catálogo productivo y regla de disponibilidad de unidades para el selector buscable.
- Confirmar si el contrato de unidad expone propietario y su tratamiento cuando no está disponible. Mientras tanto, el simulador lo presenta solo como dato recuperado, nunca editable.
- Confirmar el conjunto definitivo de fuentes y el significado operativo de cada estado de captura.
