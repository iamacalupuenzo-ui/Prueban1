# Investigación — componentes pendientes para Capturas

Fecha: 17 de septiembre de 2026  
Contexto: matriz y registro manual de capturas de flota.

## Hallazgos verificados en la API pública de Comsatel DS 0.2.2

| Necesidad | Componente disponible | Resultado |
| --- | --- | --- |
| Elegir una fecha sin hora desde un campo compacto | `Calendar` | No aplica: es una superficie de calendario abierta. No debe insertarse dentro del formulario. |
| Elegir fecha y hora | `DateTimePicker` | Existe y abre el selector desde un campo; incluye una hora, por lo que no cubre por sí solo una fecha de recepción sin hora. |
| Seleccionar una opción conocida | `Select` / `InputDropdown` | Aplica para fuentes y estados con un conjunto reducido de alternativas. |
| Encontrar una unidad entre más de mil registros | No hay `Autocomplete` o `Combobox` público | Brecha del DS. La aplicación compone temporalmente un selector buscable propio, sin copiar internals del DS. |

## Decisiones de producto actuales

- La fecha de recepción se muestra como un campo compacto; el navegador abre su selector solo cuando el operador lo activa. No se usa el `Calendar` abierto.
- El código de unidad exige selección explícita. Desde tres caracteres filtra coincidencias, presenta hasta seis resultados y permite seleccionar con mouse o teclado (flechas, Enter y Escape).
- La fuente de la orden usa el `Select` público porque sus cuatro opciones son cortas y conocidas.
- Los valores mostrados son contenido de demostración del flujo. La interfaz no comunica una integración pendiente al operador.

### Jerarquía de acciones: registro, carga masiva y descarga

- **Hecho verificado.** Un área de página debe exponer una sola acción primaria;
  varias acciones primarias reducen la jerarquía y hacen más difícil identificar
  el siguiente paso. [Atlassian: Button usage](https://atlassian.design/components/button/button-legacy/usage)
- **Hecho verificado.** La barra de una tabla es el lugar para utilidades
  globales del conjunto visible, entre ellas la exportación; las acciones que no
  caben pueden agruparse en un menú. [Carbon: Data table toolbar](https://carbondesignsystem.com/components/data-table/usage/)
- **Decisión.** `Registrar captura` se mantiene como única acción primaria del
  encabezado. `Carga masiva de recuperos` se ubica inmediatamente a su izquierda
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

- Entrada de consulta y lista emergente de resultados; no carga una lista completa de unidades de forma anticipada.
- API para mínimo de caracteres, resultados, estado de carga, sin resultados, error y valor seleccionado.
- Semántica ARIA de combobox/listbox, navegación con flechas, Enter, Escape y foco que no se pierda al elegir una opción.
- Debe admitir resultados remotos o paginados, porque el catálogo real supera las mil unidades.

### Cronología vertical de estados

- Línea vertical sutil que conecta nodos para los hitos ya ocurridos, sin pasos futuros predefinidos.
- El último nodo identifica el estado vigente; los anteriores permanecen neutrales.
- La aplicación lo compone localmente para evaluar el flujo de Capturas. Solo se propone como componente de DS si se confirma su reutilización en otros dominios con ciclos de vida similares.
- No representa auditoría de campos: muestra únicamente creación, transiciones de estado y anulación.

### Acción de modal durante carga

- `cs-button` conserva el espacio de su contenido proyectado mientras muestra el spinner de carga; por tanto, la acción de confirmación no cambia de ancho.
- Capturas mantiene temporalmente un ancho mínimo global para su modal porque aún consume la versión publicada `0.2.2`; se retira cuando adopte la versión del DS que incluye la corrección.

### Columna fija en tablas responsivas

- `TableColumn` no publica una propiedad para fijar una columna al inicio o al final durante el desplazamiento horizontal.
- Capturas mantiene temporalmente la última columna, `Acciones`, fija a la derecha mediante estilos locales limitados a esa tabla.
- Propuesta de API para el DS: `sticky?: 'start' | 'end'` en `TableColumn`. Debe resolver encabezado, cuerpo, filas hover/resaltadas, fondo de la celda fija, separador visual, orden de apilamiento y navegación horizontal sin requerir selectores internos en cada consumidor.
- Referencia de comportamiento: MUI Data Grid separa columnas fijadas con sombra cuando existe desplazamiento horizontal; permite elegir sombra, borde o ambos. En Capturas se usa solo un degradado de sombra, condicionado al ancho mínimo de 864 px de esta tabla, para evitar un indicador falso cuando no hay desborde. [MUI: Column pinning](https://mui.com/x/react-data-grid/column-pinning/)
- `--color-interaction-hovered` es translúcido. Una celda fija debe conservar una superficie opaca para no revelar columnas desplazadas; para igualar el hover de la fila se compone una sola capa del token como imagen de fondo sobre esa superficie, sin aplicarlo como dos fondos superpuestos. El componente Table debe resolver esta composición cuando incorpore columnas fijas.

### Navegación móvil del producto

- El drawer móvil debe usar `cs-menu` en modo `expanded`: incluye etiquetas, grupos y subítems. El modo `rail` solo corresponde al sidenav de escritorio/tablet.
- El estado de rail de `AppLayoutState` no se debe propagar al drawer móvil. El producto lo fuerza a `expanded` según el viewport y oculta el control de colapso dentro del drawer.
- El logo se muestra una sola vez en el topnav móvil. El drawer inicia debajo de ese header, usa `--layout-sidenav-width-expanded` y no incluye la cabecera de escritorio duplicada. El backdrop comienza también debajo del topnav.
- El trigger móvil se presenta como control de navegación por ícono, situado antes del logo dentro del header; conserva botón semántico, etiqueta accesible y foco visible. El drawer cerrado queda fuera de la navegación de teclado mediante `inert`.

## Pendientes de definición funcional

- Validar con negocio si el número de expediente lo digita el operador, se genera automáticamente o ambos escenarios existen.
- Definir catálogo productivo y regla de disponibilidad de unidades para el selector buscable.
- Confirmar el conjunto definitivo de fuentes y el significado operativo de cada estado de captura.
