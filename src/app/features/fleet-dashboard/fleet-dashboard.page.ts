import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FleetTelemetryService } from '../../core/fleet/fleet-telemetry.service';

@Component({
  imports: [RouterLink],
  template: `
    <section class="dashboard" aria-labelledby="dashboard-title" [attr.aria-busy]="telemetry.state() === 'loading'">
      <header class="page-heading">
        <p class="eyebrow">Operación</p>
        <h1 id="dashboard-title">Tablero</h1>
        <p class="description">Supervisa la disponibilidad de la flota y el estado de la información operativa.</p>
      </header>

      @switch (telemetry.state()) {
        @case ('loading') {
          <section class="state-card" aria-labelledby="loading-title"><div class="skeleton skeleton--eyebrow" aria-hidden="true"></div><div class="skeleton skeleton--title" aria-hidden="true"></div><p id="loading-title" role="status">Cargando estado de la operación.</p></section>
        }
        @case ('error') {
          <section class="state-card state-card--error" role="alert" aria-labelledby="error-title"><p class="eyebrow">Conexión</p><h2 id="error-title">No pudimos cargar la telemetría</h2><p>Revisa tu conexión e inténtalo nuevamente. Tus filtros se conservarán cuando estén disponibles.</p><button type="button" (click)="telemetry.retry()">Reintentar</button></section>
        }
        @case ('forbidden') {
          <section class="state-card" aria-labelledby="forbidden-title"><p class="eyebrow">Acceso limitado</p><h2 id="forbidden-title">No tienes permiso para ver la telemetría</h2><p>Pide acceso a un administrador de tu organización para consultar el estado de las unidades.</p></section>
        }
        @case ('ready') {
          <section class="state-card" aria-labelledby="ready-title"><p class="eyebrow">Telemetría conectada</p><h2 id="ready-title">{{ telemetry.units().length }} unidades reportando</h2><p>Última actualización: {{ telemetry.lastUpdated() }}.</p><a routerLink="/mapa">Explorar unidades en el mapa</a></section>
        }
        @default {
          <section class="state-card" aria-labelledby="empty-title"><p class="eyebrow">Estado inicial</p><h2 id="empty-title">La operación aún no tiene datos conectados</h2><p>En esta vista aparecerán indicadores y alertas cuando se integre la fuente de unidades.</p><a routerLink="/mapa">Ver el mapa</a></section>
        }
      }

      <section class="next-step" aria-labelledby="next-step-title"><h2 id="next-step-title">Próximo paso</h2><p>Conectar telemetría para habilitar posiciones, actividad, alertas y la hora de actualización de la información.</p></section>
    </section>
  `,
  styles: [`
    :host { display: block; } .dashboard { display: grid; gap: var(--layout-gap-2xl); padding: 32px; } .page-heading { display: grid; gap: var(--layout-gap-md); max-width: 640px; } h1, h2, p { margin: 0; } h1 { font-size: var(--font-size-display-sm); line-height: var(--font-line-height-display-sm); letter-spacing: var(--font-letter-spacing-display); } h2 { font-size: var(--font-size-heading-lg); line-height: var(--font-line-height-heading-lg); } .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; } .description, .state-card p:not(.eyebrow), .next-step p { color: var(--color-text-base-subtle); }
    .state-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--layout-gap-2xl); padding: 32px; border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-lg); background: var(--color-background-base-subtlest); } .state-card > * { grid-column: 1; } .state-card a, .state-card button { grid-column: 2; grid-row: 1 / span 4; justify-self: end; align-self: end; border: 0; border-radius: var(--border-radius-md); background: var(--color-background-brand-bold); color: var(--color-text-base-inverse); font: inherit; font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-body); padding: var(--layout-gap-lg) var(--layout-gap-xl); text-decoration: none; white-space: nowrap; cursor: pointer; } .state-card--error { border-color: var(--color-text-danger-default); } .state-card a:focus-visible, .state-card button:focus-visible { outline: 2px solid var(--color-border-brand-bold); outline-offset: 3px; }
    .skeleton { border-radius: var(--border-radius-sm); background: var(--color-background-neutral-subtlest); animation: pulse 1.4s ease-in-out infinite; } .skeleton--eyebrow { width: 96px; height: 12px; } .skeleton--title { width: min(100%, 360px); height: 32px; } @keyframes pulse { 50% { opacity: .5; } } .next-step { display: grid; gap: var(--layout-gap-md); max-width: 720px; padding-top: var(--layout-gap-xl); border-top: 1px solid var(--color-border-base-subtle); }
    @media (max-width: 767px) { .dashboard { gap: var(--layout-gap-xl); padding: 24px 20px; } .state-card { grid-template-columns: minmax(0, 1fr); align-items: start; padding: 24px; } .state-card a, .state-card button { grid-column: 1; grid-row: auto; justify-self: start; } }
  `],
})
export class FleetDashboardPage {
  protected readonly telemetry = inject(FleetTelemetryService);
}
