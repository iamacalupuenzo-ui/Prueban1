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

## Propuesta para Comsatel DS

### `DatePicker` (solo fecha)

- Campo compacto con ícono de calendario y selector emergente al activarlo.
- Valor controlado en formato ISO, límites mínimo/máximo, fechas deshabilitadas, estados de validación y etiqueta equivalente a `Input` y `Select` en tamaño `md`.
- Accesible con foco inicial, flechas, Enter, Escape, cierre al hacer clic fuera y anuncio del valor elegido.

### `Autocomplete` / `Combobox`

- Entrada de consulta y lista emergente de resultados; no carga una lista completa de unidades de forma anticipada.
- API para mínimo de caracteres, resultados, estado de carga, sin resultados, error y valor seleccionado.
- Semántica ARIA de combobox/listbox, navegación con flechas, Enter, Escape y foco que no se pierda al elegir una opción.
- Debe admitir resultados remotos o paginados, porque el catálogo real supera las mil unidades.

## Pendientes de definición funcional

- Validar con negocio si el número de expediente lo digita el operador, se genera automáticamente o ambos escenarios existen.
- Definir catálogo productivo y regla de disponibilidad de unidades para el selector buscable.
- Confirmar el conjunto definitivo de fuentes y el significado operativo de cada estado de captura.
