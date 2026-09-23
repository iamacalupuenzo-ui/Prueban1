import { Component, inject } from '@angular/core';
import { Icon, InputDropdown, InputDropdownOption, InputGroup, InputGroupAddon, InputGroupInput } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_CONTRACT_STATUSES,
  CAPTURE_ORDER_STATUSES,
} from '../../core/orders/mock-capture-orders.service';
import { DateRangeFilterComponent, type DateRangeFilterValue } from '../../shared/date-range-filter.component';
import { CaptureOrdersService } from './capture-orders.service';

/**
 * Barra de filtros de la matriz de capturas: búsqueda, estado y rango de
 * fechas con su propio popover. Extraído de `new-capture-order.page.ts`
 * (bloque `.matrix-toolbar`). El popover de rango de fechas es UI local del
 * toolbar (nadie más lo necesita); en cambio `dateFrom`/`dateTo` viven en
 * `CaptureOrdersService` porque alimentan el filtrado de la tabla.
 */
@Component({
  selector: 'app-capture-order-toolbar',
  imports: [DateRangeFilterComponent, Icon, InputDropdown, InputGroup, InputGroupAddon, InputGroupInput],
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
      <div class="toolbar-field toolbar-field--status">
        <label id="capture-contract-label">Contrato</label
        ><cs-input-dropdown
          class="status-filter-control"
          aria-labelledby="capture-contract-label"
          placeholder="Todos los contratos"
          size="md"
          [options]="contractOptions"
          [value]="state.contractFilter()"
          (valueChange)="state.setContractFilter($event)"
        />
      </div>
      <div class="toolbar-field toolbar-field--date-range">
        <app-date-range-filter
          label="Fecha de registro"
          [value]="{ from: state.dateFrom(), to: state.dateTo() }"
          (valueChange)="onDateRangeChange($event)"
        />
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
        grid-template-columns: minmax(220px, 480px) max-content max-content 220px;
        align-items: end;
        gap: var(--layout-gap-md);
      }
      .toolbar-field {
        display: grid;
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
      }
      .toolbar-field--date-range {
        inline-size: 220px;
        min-inline-size: 220px;
        max-inline-size: 220px;
      }
      @media (max-width: 1080px) {
        .matrix-toolbar {
          grid-template-columns: minmax(220px, 1fr) max-content;
        }
        .toolbar-field--date-range {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 767px) {
        .matrix-toolbar {
          grid-template-columns: 1fr;
        }
        .toolbar-field--status,
        .status-filter-control,
        .toolbar-field--date-range {
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

  protected onDateRangeChange(value: DateRangeFilterValue): void {
    this.state.setDateRange(value.from, value.to);
  }
}
