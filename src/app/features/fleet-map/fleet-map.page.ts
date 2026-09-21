import { Component, HostListener, inject } from '@angular/core';
import { FleetTelemetryService } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapCanvasComponent } from './fleet-map-canvas.component';
import { FleetMapSearchComponent } from './fleet-map-search.component';
import { FleetMapService } from './fleet-map.service';

@Component({
  host: { class: 'fleet-map-page' },
  imports: [FleetMapCanvasComponent, FleetMapSearchComponent],
  providers: [FleetMapService],
  template: `
    <section class="fleet-map" aria-labelledby="map-title" [attr.aria-busy]="telemetry.state() === 'loading'">
      <header class="page-heading visually-hidden"><p class="eyebrow">Operación</p><h1 id="map-title">Mapa</h1><p class="description">Localiza unidades y consulta su última posición disponible.</p></header>
      @switch (telemetry.state()) {
        @case ('loading') { <section class="map-surface" aria-label="Cargando ubicación de unidades"><app-fleet-map-canvas /><p class="overlay" role="status">Cargando posiciones disponibles.</p></section> }
        @case ('error') { <section class="map-surface" role="alert" aria-labelledby="map-error-title"><app-fleet-map-canvas /><div class="overlay"><h2 id="map-error-title">No pudimos cargar el mapa</h2><p>La fuente de telemetría no respondió. Reintenta cuando recuperes conexión.</p><button type="button" (click)="telemetry.retry()">Reintentar</button></div></section> }
        @case ('forbidden') { <section class="map-surface" aria-labelledby="map-permission-title"><div class="overlay"><h2 id="map-permission-title">No tienes permiso para ver ubicaciones</h2><p>Solicita acceso a un administrador de tu organización.</p></div></section> }
        @case ('ready') {
          <section class="map-surface" [attr.aria-label]="'Mapa con ' + state.filteredUnits().length + ' unidades ubicadas'">
            <app-fleet-map-canvas [units]="state.filteredUnits()" />
            <app-fleet-map-search />
          </section>
        }
        @default { <section class="map-surface" aria-label="Sin unidades ubicadas todavía"><app-fleet-map-canvas /></section> }
      }
    </section>
  `,
  styles: [`
    :host { display: block; block-size: 100%; }
    .fleet-map { position: relative; block-size: 100%; inline-size: 100%; overflow: hidden; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    h1, h2, p { margin: 0; }
    .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-emphasis); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; }
    .overlay > p:not(.eyebrow) { color: var(--color-text-base-subtle); }

    /* Superficie operativa flotante: conserva una separación breve respecto
       al lienzo de la aplicación y recorta los tiles de Leaflet al radio. */
    .map-surface { position: absolute; inset: var(--layout-padding-md); overflow: hidden; background: var(--color-background-neutral-subtlest); border-radius: var(--radius-lg); }
    app-fleet-map-canvas { position: absolute; inset: 0; }
    .overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; display: grid; gap: var(--layout-gap-lg); max-width: 480px; padding: var(--layout-padding-4xl); text-align: center; background: var(--color-background-base); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
    .overlay a, .overlay button { color: var(--color-text-brand-default); font: inherit; font-weight: var(--font-weight-emphasis); justify-self: center; border: 0; background: transparent; text-decoration: underline; cursor: pointer; }
    .overlay a:focus-visible, .overlay button:focus-visible { outline: var(--layout-border-thick) solid var(--color-border-focused); outline-offset: 3px; }

  `],
})
export class FleetMapPage {
  protected readonly telemetry = inject(FleetTelemetryService);
  protected readonly state = inject(FleetMapService);

  // Cualquier clic fuera de la fila que selecciona una unidad (tarjeta del
  // buscador o marcador del mapa) limpia la selección — buscador, filtros,
  // lienzo vacío del mapa o cualquier otra parte de la página.
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.state.selectedUnitId()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.vehicle-card__main, .leaflet-marker-icon')) return;
    this.state.deselectUnit();
  }
}
