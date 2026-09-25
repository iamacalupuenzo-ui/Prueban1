import { Component, inject } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetMapService, type FleetMapTabKey } from './fleet-map.service';

/**
 * Pestañas para navegar entre el Mapa y las bitácoras abiertas — acotadas a
 * Explorar/Mapa, no globales a la app (ver
 * `docs/epica-a-plan-desarrollo-fleet-operations-bitacora-v1-2026-09-21.md`).
 * Solo aparece cuando hay al menos una bitácora abierta; con una sola
 * pestaña ("Mapa") no aporta nada, igual que en un navegador.
 */
@Component({
  selector: 'app-fleet-map-tabs',
  imports: [Icon],
  template: `
    @if (state.openBitacoraUnitIds().length || state.openFollowUnitIds().length) {
      <div class="fleet-map-tabs" role="tablist" aria-label="Mapa, bitácoras y seguimientos abiertos">
        <button
          type="button"
          class="fleet-map-tabs__tab fleet-map-tabs__tab--map"
          role="tab"
          [attr.aria-selected]="state.activeTab() === 'map'"
          [class.is-active]="state.activeTab() === 'map'"
          (click)="state.switchTab('map')"
        >
          <cs-icon name="map" [size]="14" aria-hidden="true" />Mapa
        </button>
        @for (unit of state.openBitacoraUnits(); track unit.id) {
          <span class="fleet-map-tabs__tab" role="tab" [attr.aria-selected]="state.activeTab() === bitacoraTabKey(unit.id)" [class.is-active]="state.activeTab() === bitacoraTabKey(unit.id)">
            <button type="button" class="fleet-map-tabs__label" [attr.aria-label]="'Bitácora de ' + unit.vehicleCode" (click)="state.switchTab(bitacoraTabKey(unit.id))">
              <cs-icon name="file-text" [size]="12" aria-hidden="true" />{{ unit.vehicleCode }}
            </button>
            <button
              type="button"
              class="fleet-map-tabs__close"
              [attr.aria-label]="'Cerrar bitácora de ' + unit.vehicleCode"
              (click)="state.closeBitacoraTab(unit.id)"
            >
              <cs-icon name="x" [size]="12" aria-hidden="true" />
            </button>
          </span>
        }
        @for (unit of state.openFollowUnits(); track unit.id) {
          <span class="fleet-map-tabs__tab" role="tab" [attr.aria-selected]="state.activeTab() === followTabKey(unit.id)" [class.is-active]="state.activeTab() === followTabKey(unit.id)">
            <button type="button" class="fleet-map-tabs__label" [attr.aria-label]="'Siguiendo a ' + unit.vehicleCode" (click)="state.switchTab(followTabKey(unit.id))">
              <cs-icon name="eye" [size]="12" aria-hidden="true" />{{ unit.vehicleCode }}
            </button>
            <button
              type="button"
              class="fleet-map-tabs__close"
              [attr.aria-label]="'Dejar de seguir a ' + unit.vehicleCode"
              (click)="state.closeFollowTab(unit.id)"
            >
              <cs-icon name="x" [size]="12" aria-hidden="true" />
            </button>
          </span>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
        box-sizing: border-box;
        max-inline-size: 100%;
        padding-inline: var(--layout-padding-md);
      }
      .fleet-map-tabs {
        display: flex;
        align-items: stretch;
        inline-size: 100%;
        overflow-x: auto;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-block-end: 0;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        background: var(--elevation-surface-default);
      }
      .fleet-map-tabs__tab {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        min-block-size: 36px;
        border-inline-end: var(--layout-border-thin) solid var(--color-border-divider);
        background: var(--elevation-surface-default);
        color: var(--color-text-base-subtle);
      }
      .fleet-map-tabs__tab--map {
        gap: var(--layout-gap-xs);
        padding-inline: var(--layout-padding-lg);
        border-block: 0;
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-accent);
        cursor: pointer;
      }
      .fleet-map-tabs__tab.is-active {
        color: var(--color-text-brand-default);
        background: var(--color-background-brand-subtlest);
      }
      .fleet-map-tabs__label {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-xs);
        padding-inline: var(--layout-padding-md) var(--layout-padding-xs);
        border: 0;
        background: transparent;
        color: inherit;
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-accent);
        white-space: nowrap;
        cursor: pointer;
      }
      .fleet-map-tabs__close {
        display: grid;
        place-items: center;
        padding-inline: var(--layout-padding-xs) var(--layout-padding-sm);
        border: 0;
        background: transparent;
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
      }
      .fleet-map-tabs__close:hover {
        opacity: 1;
      }
      .fleet-map-tabs button:focus-visible {
        outline: var(--layout-border-thick) solid var(--color-border-focused);
        outline-offset: -2px;
      }
    `,
  ],
})
export class FleetMapTabsComponent {
  protected readonly state = inject(FleetMapService);

  // Helpers tipados para la plantilla: la concatenación de strings (`'bitacora:' + unit.id`)
  // no se angosta al tipo plantilla `FleetMapTabKey` que espera `switchTab`.
  protected bitacoraTabKey(unitId: string): FleetMapTabKey {
    return `bitacora:${unitId}`;
  }
  protected followTabKey(unitId: string): FleetMapTabKey {
    return `follow:${unitId}`;
  }
}
