import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Icon, InputDropdown, InputDropdownOption, InputGroup, InputGroupAddon, InputGroupInput, Popover } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_CONTRACT_STATUSES,
  CAPTURE_DOCUMENT_DEFINITIONS,
  CAPTURE_ORDER_STATUSES,
} from '../../core/orders/mock-capture-orders.service';
import { UnitTypeMultiSelectComponent, type UnitTypeFilterOption } from '../../shared/unit-type-multi-select.component';
import { CaptureOrdersService } from './capture-orders.service';

/**
 * Barra de filtros de la matriz de capturas: búsqueda, estado y el resto de
 * filtros (Contrato/GPS/Ubicación/Documentos) detrás de un popover "Más
 * filtros". Extraído de `new-capture-order.page.ts` (bloque `.matrix-toolbar`).
 * El filtro de rango de fechas se quitó a pedido explícito (2026-09-25).
 */
@Component({
  selector: 'app-capture-order-toolbar',
  imports: [Icon, InputDropdown, InputGroup, InputGroupAddon, InputGroupInput, Popover, UnitTypeMultiSelectComponent],
  template: `
    <div class="matrix-toolbar" aria-label="Filtros de la matriz de capturas">
      <div class="toolbar-field">
        <label for="capture-search">Buscar orden o unidad</label
        ><cs-input-group
          ><cs-input-group-addon
            ><cs-icon
              name="search"
              [size]="16"
              style="color: var(--color-text-base-subtlest)"
              aria-hidden="true" /></cs-input-group-addon
          ><cs-input-group-input
            id="capture-search"
            fieldSize="md"
            type="search"
            placeholder="Buscar por orden o unidad"
            [value]="state.searchTerm()"
            (valueChange)="state.setSearchTerm($event)"
        /></cs-input-group>
      </div>
      <div class="toolbar-field toolbar-field--status">
        <label id="capture-status-label">Estado</label
        ><cs-input-dropdown
          class="status-filter-control"
          aria-labelledby="capture-status-label"
          placeholder="Todos los estados"
          size="md"
          [options]="statusOptions"
          [value]="state.statusFilter()"
          (valueChange)="state.setStatusFilter($event)"
        />
      </div>
      <div class="toolbar-field">
        <span class="toolbar-field__spacer" aria-hidden="true"></span>
        <button
          #moreFiltersTrigger
          type="button"
          class="more-filters-trigger"
          [class.more-filters-trigger--open]="moreFiltersOpen()"
          aria-haspopup="dialog"
          [attr.aria-expanded]="moreFiltersOpen()"
          (click)="toggleMoreFilters()"
        >
          <cs-icon name="sliders" [size]="16" aria-hidden="true" />
          <span>Más filtros{{ activeExtraFilterCount() ? ' (' + activeExtraFilterCount() + ')' : '' }}</span>
        </button>
        <cs-popover
          [isOpen]="moreFiltersOpen()"
          [triggerRef]="moreFiltersTrigger"
          placement="bottom-end"
          [offset]="4"
          role="dialog"
          ariaLabel="Más filtros"
          [bare]="true"
          [closeOnOverlayClick]="false"
          (closed)="closeMoreFilters()"
        >
          <div class="more-filters-popover">
            <div class="toolbar-field">
              <label id="capture-contract-label">Contrato</label
              ><cs-input-dropdown
                class="status-filter-control"
                aria-labelledby="capture-contract-label"
                placeholder="Todos los contratos"
                size="md"
                [fullWidth]="true"
                [options]="contractOptions"
                [value]="state.contractFilter()"
                (valueChange)="state.setContractFilter($event)"
              />
            </div>
            <div class="toolbar-field">
              <label id="capture-gps-label">GPS</label
              ><cs-input-dropdown
                class="status-filter-control"
                aria-labelledby="capture-gps-label"
                placeholder="Todos"
                size="md"
                [fullWidth]="true"
                [options]="gpsOptions"
                [value]="state.gpsFilter()"
                (valueChange)="state.setGpsFilter($event)"
              />
            </div>
            <div class="toolbar-field">
              <label id="capture-location-label">Ubicación</label
              ><cs-input-dropdown
                class="status-filter-control"
                aria-labelledby="capture-location-label"
                placeholder="Todas"
                size="md"
                [fullWidth]="true"
                [options]="locationOptions"
                [value]="state.locationFilter()"
                (valueChange)="state.setLocationFilter($event)"
              />
            </div>
            <div class="toolbar-field">
              <app-unit-type-multi-select
                inputId="capture-documents-filter"
                label="Documentos"
                placeholder="Todos los documentos"
                [options]="documentOptions"
                [value]="state.documentsFilter()"
                (valueChange)="state.setDocumentsFilter($event)"
              />
            </div>
          </div>
        </cs-popover>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .matrix-toolbar {
        display: grid;
        grid-template-columns: minmax(220px, 480px) max-content max-content;
        align-items: end;
        gap: var(--layout-gap-md);
      }
      .toolbar-field {
        display: grid;
        min-inline-size: 0;
        gap: var(--layout-gap-xs);
      }
      .toolbar-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .toolbar-field--status {
        inline-size: max-content;
      }
      .status-filter-control {
        display: flex;
        min-inline-size: 0;
      }
      .toolbar-field__spacer {
        display: block;
        block-size: var(--font-line-height-content-ui);
      }
      .more-filters-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: var(--layout-gap-xs);
        block-size: 32px;
        padding-inline: 10px;
        border: var(--layout-border-thin) solid var(--color-border-neutral-default);
        border-radius: var(--radius-sm);
        background-color: var(--elevation-surface-default, var(--color-background-base));
        color: var(--color-text-base-default);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-regular);
        letter-spacing: var(--font-letter-spacing-content);
        white-space: nowrap;
        cursor: pointer;
        transition: border-color var(--motion-duration-fast) var(--motion-easing-default);
      }
      .more-filters-trigger:focus-visible,
      .more-filters-trigger--open {
        outline: none;
        border-color: var(--color-border-brand-default);
        box-shadow: 0 0 0 2px var(--color-border-brand-subtle);
      }
      .more-filters-popover {
        --elevation-surface-default: var(--color-background-base);
        display: grid;
        inline-size: 240px;
        gap: var(--layout-gap-lg);
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background-color: var(--color-background-base);
        box-shadow: var(--shadow-xl);
      }
      @media (max-width: 1080px) {
        .matrix-toolbar {
          grid-template-columns: minmax(220px, 1fr) max-content max-content;
        }
      }
      @media (max-width: 767px) {
        .matrix-toolbar {
          grid-template-columns: 1fr;
        }
        .toolbar-field--status,
        .status-filter-control {
          inline-size: 100%;
          min-inline-size: 0;
          max-inline-size: none;
        }
      }
    `,
  ],
})
export class CaptureOrderToolbarComponent {
  protected readonly state = inject(CaptureOrdersService);

  protected readonly statusOptions: InputDropdownOption[] = [
    { label: 'Todos los estados', value: '__all__' },
    ...CAPTURE_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
  ];
  protected readonly contractOptions: InputDropdownOption[] = [
    { label: 'Todos los contratos', value: '__all__' },
    ...CAPTURE_CONTRACT_STATUSES.map((status) => ({ label: status, value: status })),
  ];
  protected readonly gpsOptions: InputDropdownOption[] = [
    { label: 'Todos', value: '__all__' },
    { label: 'Con GPS', value: 'with' },
    { label: 'Sin señal', value: 'no-signal' },
    { label: 'Sin GPS', value: 'no-gps' },
  ];
  protected readonly locationOptions: InputDropdownOption[] = [
    { label: 'Todas', value: '__all__' },
    { label: 'Con ubicación', value: 'with' },
    { label: 'Sin ubicación en los últimos 30 días', value: 'stale' },
    { label: 'Sin posición disponible', value: 'none' },
  ];
  protected readonly documentOptions: UnitTypeFilterOption[] = CAPTURE_DOCUMENT_DEFINITIONS.map(
    (definition) => ({ label: definition.label, value: definition.type }),
  );

  protected readonly moreFiltersOpen = signal(false);
  protected readonly activeExtraFilterCount = computed(() => {
    let count = 0;
    if (this.state.contractFilter()) count++;
    if (this.state.gpsFilter()) count++;
    if (this.state.locationFilter()) count++;
    if (this.state.documentsFilter().length) count++;
    return count;
  });

  protected toggleMoreFilters(): void {
    this.moreFiltersOpen.update((isOpen) => !isOpen);
  }
  protected closeMoreFilters(): void {
    this.moreFiltersOpen.set(false);
  }
  /**
   * `closeOnOverlayClick` del propio `cs-popover` va desactivado (ver
   * arriba) porque no distingue un clic realmente afuera de un clic dentro
   * de un popover anidado (el menú de Contrato/Ubicación o el calendario de
   * fecha — todos `cs-popover` propios, portados a `document.body`). Este
   * listener hace esa distinción a mano: cualquier clic dentro del
   * disparador o de CUALQUIER `cs-popover` (el propio de "Más filtros" o uno
   * anidado) no cierra; todo lo demás sí. Mismo patrón que
   * `fleet-map.page.ts#onDocumentClick`.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.moreFiltersOpen()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.more-filters-trigger, cs-popover')) return;
    this.closeMoreFilters();
  }
}
