import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Button, Calendar, Icon, InputGroup, InputGroupAddon, InputGroupInput, Popover } from '@iamacalupuenzo-ui/comsatel-ds';

export interface DateRangeFilterValue {
  from: string;
  to: string;
}

let nextId = 0;

/**
 * Trigger + popover + `cs-calendar` + "Limpiar" para filtrar por rango de
 * fechas — extraído de `capture-order-toolbar.component.ts` (el filtro
 * "Fecha de registro" de Capturas) para que cualquier otra pantalla que
 * necesite el mismo filtro use el MISMO componente, no una copia del
 * markup que con el tiempo diverge en detalles de spacing/CSS (ver
 * `bitacora-view.component.ts`, que copiaba este bloque a mano y se
 * desalineaba del original en cada cambio).
 */
@Component({
  selector: 'app-date-range-filter',
  imports: [Button, Calendar, Icon, InputGroup, InputGroupAddon, InputGroupInput, Popover],
  template: `
    <div class="date-range-field">
      @if (label) {
        <label [id]="labelId" [for]="fieldId">{{ label }}</label>
      }
      <div #dateTrigger class="date-range-trigger">
        <cs-input-group
          ><cs-input-group-input
            [id]="fieldId"
            fieldSize="md"
            [readonly]="true"
            [value]="inputValue()"
            [placeholder]="placeholder"
            ariaHasPopup="dialog"
            [ariaExpanded]="open()"
            [ariaControls]="calendarId"
            [attr.aria-labelledby]="labelId"
            (focused)="openPicker()"
            (enterKey)="togglePicker()"
            (escapeKey)="closePicker()" /><cs-input-group-addon
            align="inline-end"
            [compact]="true"
            ><button
              type="button"
              class="date-range-calendar-button"
              aria-label="Abrir calendario de rango"
              [attr.aria-expanded]="open()"
              [attr.aria-controls]="calendarId"
              (click)="togglePicker()"
            >
              <cs-icon name="calendar" [size]="16" aria-hidden="true" /></button></cs-input-group-addon
        ></cs-input-group>
      </div>
      <cs-popover
        [isOpen]="open()"
        [triggerRef]="dateTrigger"
        placement="bottom-start"
        [offset]="4"
        role="dialog"
        [ariaLabel]="'Seleccionar ' + (label || 'rango de fechas')"
        [bare]="true"
        (closed)="closePicker()"
        ><div [id]="calendarId" class="date-range-popover">
          <cs-calendar
            [selected]="pendingStart() ? [pendingStart()!] : []"
            [rangeSelected]="rangeSelected()"
            [weekStartDay]="1"
            [ariaLabelledby]="labelId"
            (dateChange)="selectDate($event)"
          />
          <div class="date-range-popover__actions">
            <cs-button variant="subtle" size="sm" [disabled]="!from()" (click)="clear()">Limpiar</cs-button>
          </div>
        </div></cs-popover
      >
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .date-range-field {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .date-range-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
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
    `,
  ],
})
export class DateRangeFilterComponent {
  private readonly uid = `date-range-filter-${++nextId}`;
  protected readonly fieldId = this.uid;
  protected readonly labelId = `${this.uid}-label`;
  protected readonly calendarId = `${this.uid}-calendar`;

  @Input() label = '';
  @Input() placeholder = 'Selecciona un rango';
  /** Formato 'YYYY-MM-DD'. Componente controlado: el consumidor es dueño del estado, igual que un value/valueChange de Angular. */
  @Input() set value(next: DateRangeFilterValue | null | undefined) {
    this._from.set(next?.from ?? '');
    this._to.set(next?.to ?? '');
  }
  @Output() readonly valueChange = new EventEmitter<DateRangeFilterValue>();

  protected readonly open = signal(false);
  private readonly _from = signal('');
  private readonly _to = signal('');
  protected readonly from = this._from.asReadonly();
  protected readonly pendingStart = computed(() => (this._from() && !this._to() ? this._from() : ''));
  protected readonly rangeSelected = computed(() =>
    this._from() && this._to() ? ([this._from(), this._to()] as [string, string]) : undefined,
  );
  protected readonly inputValue = computed(() => {
    const from = this._from();
    const to = this._to();
    if (!from) return '';
    if (!to) return `Desde ${this.formatDate(from)}`;
    if (from === to) return this.formatDate(from);
    return `${this.formatDate(from)} — ${this.formatDate(to)}`;
  });

  protected openPicker(): void {
    this.open.set(true);
  }
  protected togglePicker(): void {
    this.open.update((isOpen) => !isOpen);
  }
  protected closePicker(): void {
    this.open.set(false);
  }
  protected selectDate(value: string): void {
    const from = this._from();
    if (!from || this._to()) {
      this._from.set(value);
      this._to.set('');
      this.valueChange.emit({ from: value, to: '' });
      return;
    }
    const [start, end] = [from, value].sort();
    this._from.set(start);
    this._to.set(end);
    this.open.set(false);
    this.valueChange.emit({ from: start, to: end });
  }
  protected clear(): void {
    this._from.set('');
    this._to.set('');
    this.valueChange.emit({ from: '', to: '' });
  }
  /**
   * `new Date('2026-09-17')` se interpreta como medianoche UTC; formateada
   * en horario de Lima (UTC-5) retrocede al día anterior. Se arma la fecha
   * con las partes explícitas para que quede en horario local.
   */
  private formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(year, month - 1, day),
    );
  }
}
