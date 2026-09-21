# Plan de construcción de Recuperos

Fecha: 20 de septiembre de 2026  
Estado: plan de implementación  
Referencia: `US3764` / `CU-3764-02 — Registrar una orden de recupero manual`.

## Objetivo

Construir el módulo **Recuperos** para gestionar órdenes de recupero de forma
manual. Capturas ya establece el patrón de interfaz, estructura de página y
feedback; Recuperos reutiliza ese patrón sin copiar reglas de negocio ni datos
que sean exclusivos de Capturas.

El resultado permite al operador crear, consultar, filtrar, revisar y editar
un recupero cuando la regla lo permita, con información propia de su fuente.

## Alcance

### Incluido

- Página de Recuperos con la misma composición general de Capturas.
- Tabla de recuperos, búsqueda, filtros, ordenamiento, columnas visibles,
  paginación, descarga y acciones por fila.
- Registro manual mediante modal o drawer, siguiendo el patrón ya establecido
  para Capturas.
- Detalle y edición de campos permitidos.
- Estados de carga, vacío, sin resultados, error, éxito y confirmación.
- Preparación de la integración de documentos y trazabilidad.

### Fuera de alcance

- **No existe carga masiva de recuperos.** No se agrega botón, plantilla,
  modal, validación de archivos ni lógica de importación para Recuperos.
- Configuración de plantilla XLSX: pertenece a un módulo específico de
  configuración, no a Recuperos.
- Matriz oficial de estados y transiciones: sigue pendiente de Producto y del
  módulo de Trazabilidad.
- Tabla de auditoría dentro de Recuperos: la auditoría se visualizará en
  Trazabilidad.
- Inventar contratos de unidades, GPS, fuentes, aseguradoras o documentos.

## Cuándo se inicia un recupero

Un recupero se inicia solo desde la acción explícita **Registrar recupero**.

1. El operador entra al módulo Recuperos.
2. Selecciona **Registrar recupero**.
3. Identifica una unidad.
4. El sistema presenta solo la información disponible de la unidad, incluida la
   condición de GPS si existe o si no existe.
5. El operador selecciona la fuente, completa los datos propios del recupero y
   los requisitos aplicables.
6. Revisa el resumen y confirma.
7. El sistema valida, crea la orden, muestra el resultado y la incorpora a la
   tabla.

No se debe iniciar un recupero desde una plantilla, un archivo ni una carga
masiva.

## Información del recupero

Los nombres definitivos y la obligatoriedad se confirman con el contrato de
negocio. El módulo debe prever estos grupos, sin convertirlos en valores
inventados:

| Grupo | Información que se debe definir o validar |
| --- | --- |
| Identificación | Unidad, condición de registro, tipo y disponibilidad de GPS. |
| Fuente | Aseguradora, persona natural u otra fuente permitida; catálogo, contacto y vigencia. |
| Referencia | Expediente, caso, póliza u otro identificador aplicable a la fuente. |
| Datos del recupero | Fecha, requisitos, contacto y datos operativos propios de la orden. |
| Ubicación | Última ubicación disponible; sin GPS se comunica la condición sin inventar una posición. |
| Evidencias | Tipo documental, obligatoriedad, formato, tamaño y almacenamiento. |
| Ciclo de vida | Estado inicial, duplicidad, permisos, edición permitida y transiciones. |

## Decisiones que deben estar confirmadas antes de conectar datos reales

- Catálogo de fuentes y aseguradoras.
- Campos obligatorios por tipo de fuente.
- Regla para unidad no registrada, sin GPS y con una orden activa.
- Política de duplicidad.
- Estado inicial y permisos.
- Requisitos documentales y servicio de almacenamiento.

Mientras estas reglas no estén aprobadas, la interfaz puede utilizar fixtures
explícitos para validar la experiencia, pero no debe afirmar que representa la
regla real.

## Arquitectura del feature

Se sigue `docs/lineamientos-estructura-componentes.md`: un archivo por
componente, templates y estilos inline en el `.ts`, shell delgado y un service
compartido por feature.

```text
src/app/features/recoveries/
├── recoveries.page.ts
├── recoveries.service.ts
├── recoveries-toolbar.component.ts
├── recoveries-table.component.ts
├── recoveries-detail-drawer.component.ts
└── dialogs/
    ├── recovery-create-dialog.component.ts
    ├── recovery-edit-dialog.component.ts
    └── recovery-confirm-dialog.component.ts
```

El `recoveries.service.ts` contiene signals de registros, filtros, columnas
visibles, selección activa, estado de carga y mensajes. Los estados de un
popover o menú de fila se mantienen locales en su componente.

## Componentes y comportamiento

### Página y toolbar

La página replica la estructura de Capturas:

- Título, descripción y acción primaria **Registrar recupero**.
- Buscador por los campos permitidos del recupero.
- Filtro de estado y rango de fechas; filtros adicionales solo cuando el
  contrato de Recuperos los defina.
- Control de columnas visibles y descarga alineados como utilidades de tabla.
- No se muestra ninguna acción de carga masiva.

### Tabla de Recuperos

La tabla reutiliza el estándar visual y funcional de Capturas:

- Superficie, bordes, hover, encabezados, paginación y responsive.
- Sombra de la columna de acciones cuando exista desplazamiento horizontal.
- Ancho dinámico: la columna con mayor contenido absorbe espacio antes de
  forzar cortes de línea o scroll.
- Las columnas obligatorias y configurables se definen con el contrato de
  Recuperos; Acciones se mantiene disponible.
- Los valores copiables, como código de unidad o ubicación disponible, usan el
  patrón ya establecido: texto normal; en hover, subrayado e ícono de copiar;
  al copiar, feedback de sistema.

### Registro manual

El diálogo de creación contiene secciones coherentes y evita repetir
formularios:

1. Identificación de unidad.
2. Fuente de recupero.
3. Datos propios de la fuente y del recupero.
4. Requisitos o documentos, cuando el contrato los defina.
5. Resumen y confirmación.

Los campos exclusivos se revelan según la fuente elegida. La condición de una
unidad sin GPS se muestra como contexto, nunca como una ubicación fabricada.

### Detalle y edición

- El detalle sigue el patrón de drawer o modal de Capturas.
- Los datos recuperados y no editables son de solo lectura.
- La edición se habilita únicamente cuando la regla de estado y permisos lo
  permita.
- El componente conserva un punto de integración para documentos, pero el
  flujo documental completo depende de su configuración y almacenamiento.

## Fases de construcción

### 1. Definir el contrato funcional

**Qué se hará**

- Definir el modelo de datos, fuentes permitidas y obligatoriedad.
- Acordar reglas de unidad, GPS, duplicidad y orden activa.
- Confirmar estado inicial, edición y permisos.

**Cierre**

- Cada campo tiene origen, obligatoriedad, validación y mensaje de error.
- Las casuísticas de fuente inválida, unidad no registrada y sin GPS tienen
  comportamiento aprobado.

### 2. Crear el módulo y estado

**Qué se hará**

- Crear la estructura `recoveries/` y su servicio.
- Incorporar fixtures propios de Recuperos y adaptadores separados de
  Capturas.
- Implementar carga, vacío, error y feedback.

**Cierre**

- La página es navegable y su shell solo compone hijos.
- La lógica compartida se concentra en `recoveries.service.ts`.

### 3. Construir toolbar y tabla

**Qué se hará**

- Reutilizar el patrón de filtros, buscador, columnas, descarga, tabla y
  paginación de Capturas.
- Definir columnas específicas de Recuperos y sus datos de demostración.
- Aplicar responsive, sombra de acciones y comportamiento de scroll ya
  validado.

**Cierre**

- Buscar, filtrar, ordenar y configurar columnas solo afecta Recuperos.
- La tabla mantiene el estándar visual de Capturas.

### 4. Construir el registro manual

**Qué se hará**

- Construir el diálogo de alta con sus secciones y campos condicionales.
- Validar antes de confirmar.
- Comunicar creación exitosa o error mediante el feedback estándar.

**Cierre**

- No se expone carga masiva.
- Un campo requerido bloquea el registro y explica qué falta.
- Un recupero válido aparece en la tabla con tipo Recupero.

### 5. Construir detalle, edición e integración documental

**Qué se hará**

- Construir el detalle y la edición permitida.
- Preparar el contrato de integración de documentos.
- Mantener la auditoría fuera de esta superficie.

**Cierre**

- Los campos no editables son claramente de solo lectura.
- La edición no permite modificar campos o estados sin autorización.

### 6. Verificar y cerrar

**Qué se hará**

- Probar aseguradora, persona natural y otra fuente permitida.
- Probar unidad registrada, no registrada, sin GPS y con orden activa.
- Probar campos incompletos, error de servicio y reintento seguro.
- Ejecutar `npx tsc --noEmit` y una verificación visual responsive.

**Cierre**

- Las casuísticas acordadas pasan sin crear datos o reglas inexistentes.
- El módulo queda listo para revisión funcional.

## Riesgos y dependencias

| Elemento | Estado | Impacto |
| --- | --- | --- |
| Catálogo de fuentes y aseguradoras | Pendiente | Impide valores definitivos y reglas por fuente. |
| Contrato de unidad y GPS | Pendiente | Define información recuperada y validaciones. |
| Matriz de estados | Bloqueada | Impide cerrar estado inicial y transiciones reales. |
| Documentos y almacenamiento | Pendiente | Limita el flujo documental a una integración preparada. |
| Trazabilidad | Alcance posterior | La auditoría no se duplica dentro de Recuperos. |

## Criterio de cierre del módulo

Recuperos estará listo cuando el operador pueda registrar manualmente una
orden con datos y validaciones aprobados, consultarla y filtrarla en una tabla
propia, editar exclusivamente lo permitido y recibir feedback claro durante
todo el flujo. El módulo no incluye carga masiva ni transiciones no definidas.

