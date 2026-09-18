import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FleetTelemetryService } from '../../core/fleet/fleet-telemetry.service';

@Component({
  imports: [RouterLink],
  template: `
    <section class="fleet-map" aria-labelledby="map-title" [attr.aria-busy]="telemetry.state() === 'loading'">
      <header class="page-heading"><p class="eyebrow">Operación</p><h1 id="map-title">Mapa</h1><p class="description">Localiza unidades y consulta siempre una alternativa de lista con la misma información.</p></header>
      @switch (telemetry.state()) {
        @case ('loading') { <section class="map-surface" aria-label="Cargando ubicación de unidades"><div class="map-grid" aria-hidden="true"></div><p class="overlay" role="status">Cargando posiciones disponibles.</p></section> }
        @case ('error') { <section class="map-surface" role="alert" aria-labelledby="map-error-title"><div class="map-grid" aria-hidden="true"></div><div class="overlay"><h2 id="map-error-title">No pudimos cargar el mapa</h2><p>La fuente de telemetría no respondió. Reintenta cuando recuperes conexión.</p><button type="button" (click)="telemetry.retry()">Reintentar</button></div></section> }
        @case ('forbidden') { <section class="map-surface" aria-labelledby="map-permission-title"><div class="overlay"><h2 id="map-permission-title">No tienes permiso para ver ubicaciones</h2><p>Solicita acceso a un administrador de tu organización.</p></div></section> }
        @case ('ready') {
          <section class="map-surface" aria-labelledby="map-ready-title"><div class="map-grid" aria-hidden="true"></div><div class="overlay"><h2 id="map-ready-title">Ubicaciones disponibles</h2><p>Última actualización: {{ telemetry.lastUpdated() }}.</p></div></section>
          <section class="unit-list" aria-labelledby="unit-list-title"><h2 id="unit-list-title">Lista de unidades</h2><p>Alternativa al mapa con el mismo estado operativo.</p><ul>@for (unit of telemetry.units(); track unit.id) { <li><strong>{{ unit.name }}</strong><span>{{ unit.status }} · {{ unit.lastUpdate }}</span></li> }</ul></section>
        }
        @default { <section class="map-surface" aria-labelledby="map-empty-title"><div class="map-grid" aria-hidden="true"></div><div class="overlay"><p class="eyebrow">Estado del mapa</p><h2 id="map-empty-title">Aún no hay unidades para ubicar</h2><p>No se muestran posiciones, rutas ni tiempos de actualización porque la integración cartográfica no está activa.</p><a routerLink="/dashboard">Volver al tablero</a></div></section> }
      }
    </section>
  `,
  styles: [`
    :host { display: block; } .fleet-map { display: grid; gap: var(--layout-gap-2xl); padding: 32px; } .page-heading { display: grid; gap: var(--layout-gap-md); max-width: 640px; } h1, h2, p { margin: 0; } h1 { font-size: var(--font-size-display-sm); line-height: var(--font-line-height-display-sm); letter-spacing: var(--font-letter-spacing-display); } h2 { font-size: var(--font-size-heading-lg); line-height: var(--font-line-height-heading-lg); } .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; } .description, .overlay > p:not(.eyebrow), .unit-list > p { color: var(--color-text-base-subtle); }
    .map-surface { display: grid; min-height: 480px; overflow: hidden; position: relative; border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-lg); background: var(--color-background-neutral-subtlest); } .map-grid { background-image: linear-gradient(var(--color-border-base-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-base-subtle) 1px, transparent 1px); background-position: center; background-size: 48px 48px; opacity: .34; } .overlay { align-self: center; justify-self: center; display: grid; gap: var(--layout-gap-lg); max-width: 480px; padding: 32px; position: absolute; text-align: center; } .overlay a, .overlay button { color: var(--color-text-brand-default); font: inherit; font-weight: var(--font-weight-semibold); justify-self: center; border: 0; background: transparent; text-decoration: underline; cursor: pointer; } .overlay a:focus-visible, .overlay button:focus-visible { outline: 2px solid var(--color-border-brand-bold); outline-offset: 3px; }
    .unit-list { display: grid; gap: var(--layout-gap-md); max-width: 720px; } ul { display: grid; gap: var(--layout-gap-sm); margin: 0; padding: 0; list-style: none; } li { display: flex; justify-content: space-between; gap: var(--layout-gap-md); padding: var(--layout-padding-lg); border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-md); } li span { color: var(--color-text-base-subtle); } @media (max-width: 767px) { .fleet-map { gap: var(--layout-gap-xl); padding: 24px 20px; } .map-surface { min-height: 400px; } .overlay { padding: 24px; } li { align-items: flex-start; flex-direction: column; } }
  `],
})
export class FleetMapPage {
  protected readonly telemetry = inject(FleetTelemetryService);
}
