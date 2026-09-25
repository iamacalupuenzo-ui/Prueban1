import { Component, HostListener, inject } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetTelemetryService } from '../../core/fleet/fleet-telemetry.service';
import { BitacoraViewComponent } from './bitacora-view.component';
import { CaptureOrderInfoCardComponent } from './capture-order-info-card.component';
import { FleetMapCanvasComponent } from './fleet-map-canvas.component';
import { FleetMapSearchComponent } from './fleet-map-search.component';
import { FleetMapService } from './fleet-map.service';
import { FleetMapTabsComponent } from './fleet-map-tabs.component';
import { FollowUnitViewComponent } from './follow-unit-view.component';

@Component({
  host: { class: 'fleet-map-page' },
  imports: [
    BitacoraViewComponent,
    CaptureOrderInfoCardComponent,
    FleetMapCanvasComponent,
    FleetMapSearchComponent,
    FleetMapTabsComponent,
    FollowUnitViewComponent,
    Icon,
  ],
  providers: [FleetMapService],
  template: `
    <section class="fleet-map" aria-labelledby="map-title" [attr.aria-busy]="telemetry.state() === 'loading'">
      <header class="page-heading visually-hidden"><p class="eyebrow">Operación</p><h1 id="map-title">Mapa</h1><p class="description">Localiza unidades y consulta su última posición disponible.</p></header>
      @if (state.message()) {
        <div
          class="feedback-toast"
          [class.is-error]="state.messageKind() === 'error'"
          [class.is-info]="state.messageKind() === 'info'"
          [attr.role]="state.messageKind() === 'error' ? 'alert' : 'status'"
          aria-live="polite"
        >
          <cs-icon
            [name]="
              state.messageKind() === 'error'
                ? 'circle-alert'
                : state.messageKind() === 'info'
                  ? 'circle-help'
                  : 'circle-check'
            "
            [size]="20"
            aria-hidden="true"
          />
          <p>{{ state.message() }}</p>
          <button
            type="button"
            class="feedback-toast__close"
            aria-label="Cerrar notificación"
            (click)="state.dismissMessage()"
          >
            <cs-icon name="x" [size]="16" aria-hidden="true" />
          </button>
        </div>
      }
      <div class="fleet-map__content">
        @if (state.bitacoraUnit()) {
          <app-bitacora-view />
        } @else if (state.followUnit(); as followedUnit) {
          <app-follow-unit-view [unit]="followedUnit" />
        } @else {
          @switch (telemetry.state()) {
            @case ('loading') { <section class="map-surface" aria-label="Cargando ubicación de unidades"><app-fleet-map-canvas /><p class="overlay" role="status">Cargando posiciones disponibles.</p></section> }
            @case ('error') { <section class="map-surface" role="alert" aria-labelledby="map-error-title"><app-fleet-map-canvas /><div class="overlay"><h2 id="map-error-title">No pudimos cargar el mapa</h2><p>La fuente de telemetría no respondió. Reintenta cuando recuperes conexión.</p><button type="button" (click)="telemetry.retry()">Reintentar</button></div></section> }
            @case ('forbidden') { <section class="map-surface" aria-labelledby="map-permission-title"><div class="overlay"><h2 id="map-permission-title">No tienes permiso para ver ubicaciones</h2><p>Solicita acceso a un administrador de tu organización.</p></div></section> }
            @case ('ready') {
              <section class="map-surface" [attr.aria-label]="'Mapa con ' + state.filteredUnits().length + ' unidades ubicadas'">
                <app-fleet-map-canvas [units]="state.filteredUnits()" />
                <app-fleet-map-search />
                <div class="stationary-legend" aria-label="Indicador de unidad detenida por más de una hora">
                  <span class="stationary-legend__swatch" aria-hidden="true"></span>
                  <span>Unidad detenida por más de 1 h</span>
                </div>
                @if (state.selectedUnit()) { <app-capture-order-info-card /> }
              </section>
            }
            @default { <section class="map-surface" aria-label="Sin unidades ubicadas todavía"><app-fleet-map-canvas /></section> }
          }
        }
      </div>
      <app-fleet-map-tabs />
    </section>
  `,
  styles: [`
    :host { display: block; block-size: 100%; }
    .fleet-map { display: flex; flex-direction: column; block-size: 100%; inline-size: 100%; overflow: hidden; }
    .fleet-map__content { position: relative; flex: 1 1 auto; min-block-size: 0; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    h1, h2, p { margin: 0; }
    .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-emphasis); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; }
    .overlay > p:not(.eyebrow) { color: var(--color-text-base-subtle); }

    /* Superficie operativa flotante: conserva una separación breve respecto
       al lienzo de la aplicación y recorta los tiles de Leaflet al radio. */
    .map-surface { position: absolute; inset: var(--layout-padding-md); overflow: hidden; background: var(--color-background-neutral-subtlest); border-radius: var(--radius-lg); }
    app-fleet-map-canvas { position: absolute; inset: 0; }
    .stationary-legend { position: absolute; right: var(--layout-padding-lg); bottom: var(--layout-padding-lg); z-index: 400; display: flex; align-items: center; gap: var(--layout-gap-sm); max-width: calc(100% - var(--layout-padding-4xl)); padding: var(--layout-padding-sm) var(--layout-padding-md); border: var(--layout-border-thin) solid var(--color-border-neutral-subtle); border-radius: var(--radius-md); background: var(--elevation-surface-default); box-shadow: var(--shadow-md); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .stationary-legend__swatch { flex: 0 0 18px; inline-size: 18px; block-size: 12px; border: 2px dashed #c62828; border-radius: var(--radius-full); background: rgb(239 83 80 / 9%); }
    .overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; display: grid; gap: var(--layout-gap-lg); max-width: 480px; padding: var(--layout-padding-4xl); text-align: center; background: var(--color-background-base); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
    .overlay a, .overlay button { color: var(--color-text-brand-default); font: inherit; font-weight: var(--font-weight-emphasis); justify-self: center; border: 0; background: transparent; text-decoration: underline; cursor: pointer; }
    .overlay a:focus-visible, .overlay button:focus-visible { outline: var(--layout-border-thick) solid var(--color-border-focused); outline-offset: 3px; }

    .feedback-toast {
      position: fixed;
      top: var(--layout-padding-2xl);
      right: var(--layout-padding-2xl);
      z-index: var(--elevation-z-index-toast);
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--layout-gap-md);
      width: min(420px, calc(100vw - var(--layout-padding-4xl)));
      padding: var(--layout-padding-lg);
      border: var(--layout-border-thin) solid var(--color-border-success-default);
      border-radius: var(--radius-lg);
      background: var(--color-background-success-subtlest);
      box-shadow: var(--shadow-xl);
      color: var(--color-text-success-default);
      font-size: var(--font-size-content-ui);
      line-height: var(--font-line-height-content-ui);
    }
    .feedback-toast > p {
      margin: 0;
    }
    .feedback-toast.is-error {
      border-color: var(--color-border-danger-default);
      background: var(--color-background-danger-subtlest);
      color: var(--color-text-danger-default);
    }
    .feedback-toast.is-info {
      border-color: var(--color-border-brand-default);
      background: var(--color-background-brand-subtlest);
      color: var(--color-text-brand-default);
    }
    .feedback-toast__close {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--layout-padding-2xs);
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .feedback-toast__close:focus-visible {
      outline: none;
      box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
    }
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
    if (!this.state.selectedUnitId() || this.state.bitacoraUnit() || this.state.followUnit()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.vehicle-card__main, .leaflet-marker-icon, app-capture-order-info-card')) return;
    this.state.deselectUnit();
  }
}
