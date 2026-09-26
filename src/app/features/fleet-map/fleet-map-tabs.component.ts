import { Component, ElementRef, inject, signal } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetMapService, type FleetMapTabKey, type FollowingGroup } from './fleet-map.service';

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
    @if (state.openBitacoraUnitIds().length || state.followingGroups().length) {
      <div class="fleet-map-tabs" role="tablist" aria-label="Mapa, bitácoras y seguimiento abiertos">
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
        @for (group of state.followingGroups(); track group.id; let i = $index) {
          <span class="fleet-map-tabs__tab" role="tab" [attr.aria-selected]="state.activeTab() === followTabKey(group.id)" [class.is-active]="state.activeTab() === followTabKey(group.id)">
            @if (editingGroupId() === group.id) {
              <span class="fleet-map-tabs__label fleet-map-tabs__label--editing">
                <cs-icon name="eye" [size]="12" aria-hidden="true" />
                <input
                  class="fleet-map-tabs__rename-input"
                  type="text"
                  aria-label="Nombre del grupo de seguimiento"
                  [value]="editingName()"
                  [style.width.ch]="editingName().length + 1"
                  (input)="editingName.set($any($event.target).value)"
                  (blur)="commitRename(group.id)"
                  (keydown.enter)="($any($event.target)).blur()"
                  (keydown.escape)="cancelRename()"
                  (click)="$event.stopPropagation()"
                  (dblclick)="$event.stopPropagation()"
                />
                <span>({{ group.unitIds.length }})</span>
              </span>
            } @else {
              <button
                type="button"
                class="fleet-map-tabs__label"
                [attr.aria-label]="'Ver ' + followingGroupLabel(group, i) + '. Doble clic para renombrar'"
                (click)="state.switchTab(followTabKey(group.id))"
                (dblclick)="startRename(group, i)"
              >
                <cs-icon name="eye" [size]="12" aria-hidden="true" />{{ followingGroupLabel(group, i) }} ({{ group.unitIds.length }})
              </button>
            }
            <button
              type="button"
              class="fleet-map-tabs__close"
              [attr.aria-label]="'Cerrar ' + followingGroupLabel(group, i)"
              (click)="state.requestCloseFollowingGroup(group.id)"
            >
              <cs-icon name="x" [size]="14" aria-hidden="true" />
            </button>
          </span>
        }
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
              <cs-icon name="x" [size]="14" aria-hidden="true" />
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
        color: var(--color-text-danger-default);
        opacity: 0.7;
        cursor: pointer;
      }
      .fleet-map-tabs__close:hover {
        opacity: 1;
      }
      .fleet-map-tabs button:focus-visible {
        outline: var(--layout-border-thick) solid var(--color-border-focused);
        outline-offset: -2px;
      }
      /* Mismo contenedor/tipografía que .fleet-map-tabs__label (icono +
         texto + contador en la misma fila, misma altura de pestaña) — solo
         el nombre se vuelve editable, no se reemplaza toda la fila por una
         caja de formulario ajena al resto de la barra. */
      .fleet-map-tabs__label--editing {
        color: var(--color-text-brand-default);
      }
      .fleet-map-tabs__rename-input {
        min-inline-size: 12px;
        max-inline-size: 160px;
        padding: 0;
        border: 0;
        border-bottom: var(--layout-border-thin) solid currentColor;
        background: transparent;
        color: inherit;
        font: inherit;
      }
      .fleet-map-tabs__rename-input:focus-visible {
        outline: none;
      }
    `,
  ],
})
export class FleetMapTabsComponent {
  protected readonly state = inject(FleetMapService);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  // Helpers tipados para la plantilla: la concatenación de strings (`'bitacora:' + unit.id`)
  // no se angosta al tipo plantilla `FleetMapTabKey` que espera `switchTab`.
  protected bitacoraTabKey(unitId: string): FleetMapTabKey {
    return `bitacora:${unitId}`;
  }

  protected followTabKey(groupId: string): FleetMapTabKey {
    return `follow:${groupId}`;
  }

  /** "Seguimiento N" por posición, salvo que el usuario le haya puesto un nombre propio. */
  protected followingGroupLabel(group: FollowingGroup, index: number): string {
    return group.name || `Seguimiento ${index + 1}`;
  }

  // ---------------------------------------------------------------------
  // Renombrar un grupo de seguimiento con doble clic en su pestaña — mismo
  // patrón que renombrar una hoja de Excel (pedido explícito). Estado
  // puramente de UI (no vive en el servicio): solo importa mientras el
  // usuario está escribiendo, nadie más lo necesita.
  // ---------------------------------------------------------------------
  protected readonly editingGroupId = signal<string | null>(null);
  protected readonly editingName = signal('');

  protected startRename(group: FollowingGroup, index: number): void {
    this.editingGroupId.set(group.id);
    this.editingName.set(group.name || `Seguimiento ${index + 1}`);
    // El input recién existe en el DOM después de que Angular repinta el
    // `@if` de esta misma vuelta — un `setTimeout` (no un `requestAnimationFrame`
    // suelto) espera a que ese repintado ya haya ocurrido antes de buscarlo.
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector<HTMLInputElement>('.fleet-map-tabs__rename-input');
      input?.focus();
      input?.select();
    });
  }

  protected commitRename(groupId: string): void {
    if (this.editingGroupId() !== groupId) return;
    this.state.renameFollowingGroup(groupId, this.editingName());
    this.editingGroupId.set(null);
  }

  protected cancelRename(): void {
    this.editingGroupId.set(null);
  }
}
