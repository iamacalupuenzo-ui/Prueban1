# Prueba con dispositivo móvil real (geolocalización) — plan pendiente

Estado: **plan a futuro, sin implementar.** Registrado el 2026-09-25 a pedido
de Enzo — validar la lógica de GPS/ubicación con una unidad real en vez de
solo datos mock, más adelante.

## Idea

Generar un enlace a una página pública que, abierta desde un celular, pida
permiso de geolocalización al navegador y reporte esa posición para que se
refleje en una unidad real dentro de Fleet Operations — así se puede probar
en campo la lógica de GPS/"Última ubicación" ya construida (ver
`docs/casuistica-gps-ultima-ubicacion.md`) contra un dispositivo real, no
solo contra las posiciones fijas del fixture.

## Por qué no se hizo ahora

Hoy toda la aplicación es 100% mock en el cliente: `FleetTelemetryService` y
`MockCaptureOrdersService` viven como signals en memoria del navegador, sin
ningún backend ni API. Para que un celular actualice la posición de una
unidad en la app, hace falta algo que reciba esa ubicación y se la entregue
a la app corriendo (un endpoint/relay) — eso no existe todavía y sería la
primera pieza de infraestructura real del proyecto, no solo "un link con
geolocalización".

## Preguntas a resolver cuando se retome

- Qué tan simple puede salir el relay (¿un endpoint mínimo dedicado solo a
  esto, o ya conviene diseñarlo pensando en la futura integración real con
  SAP/flota, para no rehacerlo dos veces?).
- Si la posición reportada por el celular reemplaza o convive con el
  fixture (¿se ata a una unidad demo existente, o se crea una unidad nueva
  "de prueba real"?).
- Requisitos de permisos/privacidad del navegador para geolocalización
  (HTTPS es obligatorio en la mayoría de navegadores fuera de localhost).
