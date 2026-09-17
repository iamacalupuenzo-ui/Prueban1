import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <section class="dashboard" aria-labelledby="dashboard-title">
      <header class="page-heading">
        <p class="eyebrow">Operación</p>
        <h1 id="dashboard-title">Tablero</h1>
        <p class="description">Un punto de partida para supervisar la flota cuando la telemetría esté conectada.</p>
      </header>

      <section class="initial-state" aria-labelledby="initial-state-title">
        <div>
          <p class="eyebrow">Estado inicial</p>
          <h2 id="initial-state-title">La operación aún no tiene datos conectados</h2>
          <p>En esta vista aparecerán los indicadores y alertas operativas una vez que se integre la fuente de unidades.</p>
        </div>
        <a routerLink="/mapa">Ver el mapa</a>
      </section>

      <section class="next-step" aria-labelledby="next-step-title">
        <h2 id="next-step-title">Próximo paso</h2>
        <p>Conectar telemetría para habilitar posiciones, actividad, alertas y el tiempo de actualización de la información.</p>
      </section>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dashboard { display: grid; gap: var(--layout-gap-2xl); padding: 32px; }
    .page-heading { display: grid; gap: var(--layout-gap-md); max-width: 640px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: var(--font-size-display-sm); line-height: var(--font-line-height-display-sm); letter-spacing: var(--font-letter-spacing-display); }
    h2 { font-size: var(--font-size-heading-lg); line-height: var(--font-line-height-heading-lg); }
    .eyebrow { color: var(--color-text-brand-default); font-size: var(--font-size-content-caption); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-caption); text-transform: uppercase; letter-spacing: .08em; }
    .description, .initial-state p:not(.eyebrow), .next-step p { color: var(--color-text-base-subtle); }
    .initial-state { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--layout-gap-2xl); padding: 32px; border: 1px solid var(--color-border-base-subtle); border-radius: var(--border-radius-lg); background: var(--color-background-base-subtlest); }
    .initial-state > div { display: grid; gap: var(--layout-gap-lg); max-width: 650px; }
    .initial-state a { border-radius: var(--border-radius-md); background: var(--color-background-brand-bold); color: var(--color-text-base-inverse); font-size: var(--font-size-content-body); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-content-body); padding: var(--layout-gap-lg) var(--layout-gap-xl); text-decoration: none; white-space: nowrap; }
    .initial-state a:hover { filter: brightness(.94); }
    .initial-state a:focus-visible { outline: 2px solid var(--color-border-brand-bold); outline-offset: 3px; }
    .next-step { display: grid; gap: var(--layout-gap-md); max-width: 720px; padding-top: var(--layout-gap-xl); border-top: 1px solid var(--color-border-base-subtle); }
    @media (max-width: 767px) { .dashboard { gap: var(--layout-gap-xl); padding: 24px 20px; } .initial-state { grid-template-columns: minmax(0, 1fr); align-items: start; padding: 24px; } .initial-state a { justify-self: start; } }
  `],
})
export class FleetDashboardPage {}
