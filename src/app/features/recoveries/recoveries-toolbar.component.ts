import { Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  Calendar,
  Icon,
  InputDropdown,
  InputDropdownOption,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
} from '@iamacalupuenzo-ui/comsatel-ds';
import { RECOVERY_ORDER_STATUSES } from '../../core/recoveries/mock-recovery-orders.service';
import { RecoveriesService } from './recoveries.service';

/**
 * Barra de filtros de la matriz de recuperos: búsqueda, estado y rango de
 * fechas con su propio popover. Espeja `CaptureOrderToolbarComponent` — mismo
 * layout, mismo patrón de `cs-input-group`/`cs-input-dropdown`/popover de
 * calendario — conectada a `RecoveriesService` en vez de
 * `CaptureOrdersService`. No incluye filtro de tipo de unidad ni acción de
 * carga masiva: ninguno existe para Recuperos (ver
 * `docs/plan-construccion-recuperos.md`). El popover de rango de fechas es UI
 * local del toolbar; `dateFrom`/`dateTo` viven en `RecoveriesService` porque
 * alimentan el filtrado de la tabla.
 */
@Component({
  selector: 'app-recoveries-toolbar',
  imports: [Button, Calendar, Icon, InputDropdown, InputGroup, InputGroupAddon, InputGroupInput, Popover],
  template: `
    <div class="matrix-toolbar" aria-label="Filtros de la matriz de recuperos">
      <div class="toolbar-field">
        <label for="recovery-search">Buscar orden, unidad o fuente</label
        ><cs-input-group
          ><cs-input-group-addon
            ><cs-icon
              name="search"
              [size]="16"
              style="color: var(--color-text-base-subtlest)"
              aria-hidden="true" /></cs-input-group-addon
          ><cs-input-group-input
            id="recovery-search"
            fieldSize="md"
            type="search"
            placeholder="Buscar por orden, unidad o fuente"
            [value]="state.searchTerm()"
            (valueChange)="state.setSearchTerm($event)"
        /></cs-input-group>
      </div>
      <div class="toolbar-field toolbar-field--status">
        <label id="recovery-status-label">Estado</label
        ><cs-input-dropdown
          class="status-filter-control"
          aria-labelledby="recovery-status-label"
          placeholder="Todos los estados"
          size="md"
          [options]="statusOptions"
          [value]="state.statusFilter()"
          (valueChange)="state.setStatusFilter($event)"
        />
      </div>
      <div class="toolbar-field toolbar-field--status">
        <label id="recovery-insurer-label">Seguro</label
        ><cs-input-dropdown
          class="status-filter-control"
          aria-labelledby="recovery-insurer-label"
          placeholder="Todos los seguros"
          size="md"
          [options]="insurerFilterOptions"
          [value]="state.insurerFilter()"
          (valueChange)="state.setInsurerFilter($event)"
        />
      </div>
      <div class="toolbar-field toolbar-field--status">
        <label id="recovery-theft-modality-label">Modalidad</label
        ><cs-input-dropdown
          class="status-filter-control"
          aria-labelledby="recovery-theft-modality-label"
          placeholder="Todas las modalidades"
          size="md"
          [options]="theftModalityFilterOptions"
          [value]="state.theftModalityFilter()"
          (valueChange)="state.setTheftModalityFilter($event)"
        />
      </div>
      <div class="toolbar-field toolbar-field--date-range">
        <label id="recovery-date-range-label" for="recovery-date-range">Fecha de registro</label>
        <div #recoveryDateTrigger class="date-range-trigger">
          <cs-input-group
            ><cs-input-group-input
              id="recovery-date-range"
              fieldSize="md"
              [readonly]="true"
              [value]="dateRangeInputValue()"
              placeholder="Selecciona un rango"
              ariaHasPopup="dialog"
              [ariaExpanded]="dateRangeOpen()"
              ariaControls="recovery-date-range-calendar"
              ariaLabelledby="recovery-date-range-label"
              (focused)="openDateRangePicker()"
              (enterKey)="toggleDateRangePicker()"
              (escapeKey)="closeDateRangePicker()" /><cs-input-group-addon
              align="inline-end"
              [compact]="true"
              ><button
                type="button"
                class="date-range-calendar-button"
                aria-label="Abrir calendario de rango"
                [attr.aria-expanded]="dateRangeOpen()"
                aria-controls="recovery-date-range-calendar"
                (click)="toggleDateRangePicker()"
              >
                <cs-icon
                  name="calendar"
                  [size]="16"
                  aria-hidden="true"
                /></button></cs-input-group-addon
          ></cs-input-group>
        </div>
        <cs-popover
          [isOpen]="dateRangeOpen()"
          [triggerRef]="recoveryDateTrigger"
          placement="bottom-start"
          [offset]="4"
          role="dialog"
          ariaLabel="Seleccionar rango de fechas de registro"
          [bare]="true"
          (closed)="closeDateRangePicker()"
          ><div id="recovery-date-range-calendar" class="date-range-popover">
            <cs-calendar
              [selected]="pendingDateRangeStart() ? [pendingDateRangeStart()!] : []"
              [rangeSelected]="selectedDateRange()"
              [weekStartDay]="1"
              ariaLabelledby="recovery-date-range-label"
              (dateChange)="selectDateRangeDate($event)"
            />
            <div class="date-range-popover__actions">
              <cs-button
                variant="subtle"
                size="sm"
                [disabled]="!state.dateFrom()"
                (click)="clearDateRange()"
                >Limpiar</cs-button
              >
            </div>
          </div></cs-popover
        >
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
        grid-template-columns: minmax(220px, 480px) max-content max-content max-content 220px;
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
      .date-range-trigger {
        min-inline-size: 0;
      }
      .date-range-calendar-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--layout-padding-xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-subtle);
        cursor: pointer;
      }
      .date-range-calendar-button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .date-range-popover {
        --elevation-surface-default: var(--color-background-base);
        display: grid;
        inline-size: 257px;
        overflow: hidden;
        gap: 0;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background-color: var(--color-background-base);
        box-shadow: var(--shadow-xs);
      }
      .date-range-popover__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-block-size: var(--layout-size-md);
        padding-inline: var(--layout-padding-md);
        border-top: var(--layout-border-thin) solid var(--color-border-divider);
      }
      @media (max-width: 1080px) {
        .matrix-toolbar {
          grid-template-columns: minmax(220px, 1fr) max-content max-content max-content;
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
export class RecoveriesToolbarComponent {
  protected readonly state = inject(RecoveriesService);

  protected readonly statusOptions: InputDropdownOption[] = [
    { label: 'Todos los estados', value: '__all__' },
    ...RECOVERY_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
  ];
  protected readonly insurerFilterOptions: InputDropdownOption[] = [
    { label: 'Todos los seguros', value: '__all__' },
    ...this.state.insurerOptions,
  ];
  protected readonly theftModalityFilterOptions: InputDropdownOption[] = [
    { label: 'Todas las modalidades', value: '__all__' },
    ...this.state.theftModalityOptions,
  ];

  protected readonly dateRangeOpen = signal(false);
  protected readonly pendingDateRangeStart = computed(() =>
    this.state.dateFrom() && !this.state.dateTo() ? this.state.dateFrom() : '',
  );
  protected readonly selectedDateRange = computed(() =>
    this.state.dateFrom() && this.state.dateTo()
      ? ([this.state.dateFrom(), this.state.dateTo()] as [string, string])
      : undefined,
  );
  protected readonly dateRangeLabel = computed(() => {
    const from = this.state.dateFrom();
    const to = this.state.dateTo();
    if (!from) return 'Selecciona un rango';
    if (!to) return `Desde ${this.formatFilterDate(from)}`;
    return `${this.formatFilterDate(from)} — ${this.formatFilterDate(to)}`;
  });
  protected readonly dateRangeInputValue = computed(() =>
    this.state.dateFrom() ? this.dateRangeLabel() : '',
  );

  protected openDateRangePicker(): void {
    this.dateRangeOpen.set(true);
  }
  protected toggleDateRangePicker(): void {
    this.dateRangeOpen.update((isOpen) => !isOpen);
  }
  protected closeDateRangePicker(): void {
    this.dateRangeOpen.set(false);
  }
  protected selectDateRangeDate(value: string): void {
    const from = this.state.dateFrom();
    if (!from || this.state.dateTo()) {
      this.state.dateFrom.set(value);
      this.state.dateTo.set('');
      return;
    }
    const [start, end] = [from, value].sort();
    this.state.setDateRange(start, end);
    this.dateRangeOpen.set(false);
  }
  protected clearDateRange(): void {
    this.state.clearDateRange();
  }
  private formatFilterDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }
}
