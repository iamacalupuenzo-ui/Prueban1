import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <section class="fleet-map" aria-labelledby="map-title">
      <header class="page-heading">
        <p class="eyebrow">Operación</p>
        <h1 id="map-title">Mapa</h1>
        <p class="description">La visualización geográfica estará disponible cuando conectemos la fuente de telemetría.</p>
      </header>

      <section class="map-surface" aria-labelledby="map-empty-title">
        <div class="map-grid" aria-hidden="true"></div>
        <div class="empty-state" role="status">
          <p class="eyebrow">Estado del mapa</p>
          <h2 id="map-empty-title">Aún no hay unidades para ubicar</h2>
          <p>No se muestran posiciones, rutas ni tiempos de actualización porque la integración cartográfica no está activa.</p>
          <a routerLink="/dashboard">Volver al tablero</a>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .fleet-map { display: grid; gap: var(--layout-gap-2xl); padding: 32px; }
    .page-heading { display: grid; gap: var(--layout-gap-md); max-width: 640px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: var(--font-size-display-sm); line-height: var(--font-line-height-display-sm); letter-spacing: var(--font-letter-spacing-display); }
    h2 { font-size: var(--font-size-heading-lg); line-height: var(--font-line-height-heading-lg); }
    .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; }
    .description, .empty-state > p:not(.eyebrow) { color: var(--color-text-base-subtle); }
    .map-surface { display: grid; min-height: 480px; overflow: hidden; position: relative; border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-lg); background: var(--color-background-neutral-subtlest); }
    .map-grid { background-image: linear-gradient(var(--color-border-base-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-base-subtle) 1px, transparent 1px); background-position: center; background-size: 48px 48px; opacity: .34; }
    .empty-state { align-self: center; justify-self: center; display: grid; gap: var(--layout-gap-lg); max-width: 480px; padding: 32px; position: absolute; text-align: center; }
    .empty-state a { color: var(--color-text-brand-default); font-weight: var(--font-weight-semibold); justify-self: center; }
    .empty-state a:focus-visible { outline: 2px solid var(--color-border-brand-bold); outline-offset: 3px; }
    @media (max-width: 767px) { .fleet-map { gap: var(--layout-gap-xl); padding: 24px 20px; } .map-surface { min-height: 400px; } .empty-state { padding: 24px; } }
  `],
})
export class FleetMapPage {}
