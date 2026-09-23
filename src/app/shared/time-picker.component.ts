import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Button, Icon, InputGroup, InputGroupAddon, InputGroupInput, Popover } from '@iamacalupuenzo-ui/comsatel-ds';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

let nextId = 0;

/**
 * Selector de hora con dos columnas (hora / minuto) y "Limpiar" en el
 * mismo panel — reemplaza el `<input type="time">` nativo del navegador
 * porque ese popup lo dibuja el sistema operativo y no se le puede meter
 * un botón adentro ni cambiarle el diseño (pedido explícito: la lista y el
 * "Limpiar" deben verse juntos, como en `date-range-filter.component.ts`).
 */
@Component({
  selector: 'app-time-picker',
  imports: [Button, Icon, InputGroup, InputGroupAddon, InputGroupInput, Popover],
  template: `
    <div class="time-picker-field">
      @if (label) {
        <label [id]="labelId" [for]="fieldId">{{ label }}</label>
      }
      <div #trigger class="time-picker-trigger">
        <cs-input-group
          ><cs-input-group-input
            [id]="fieldId"
            fieldSize="sm"
            [readonly]="true"
            [value]="displayValue()"
            [placeholder]="placeholder"
            ariaHasPopup="dialog"
            [ariaExpanded]="open()"
            [ariaControls]="panelId"
            [attr.aria-labelledby]="labelId"
            (focused)="openPicker()"
            (enterKey)="togglePicker()"
            (escapeKey)="closePicker()" /><cs-input-group-addon
            align="inline-end"
            [compact]="true"
            ><button
              type="button"
              class="time-picker-trigger-button"
              aria-label="Abrir selector de hora"
              [attr.aria-expanded]="open()"
              [attr.aria-controls]="panelId"
              (click)="togglePicker()"
            >
              <cs-icon name="timer" [size]="14" aria-hidden="true" /></button></cs-input-group-addon
        ></cs-input-group>
      </div>
      <cs-popover
        [isOpen]="open()"
        [triggerRef]="trigger"
        placement="bottom-start"
        [offset]="4"
        role="dialog"
        [ariaLabel]="'Seleccionar ' + (label || 'hora')"
        [bare]="true"
        (closed)="closePicker()"
        ><div [id]="panelId" class="time-picker-popover">
          <div class="time-picker-columns">
            <ol class="time-picker-column" [attr.aria-label]="'Hora'">
              @for (h of hours; track h) {
                <li>
                  <button
                    type="button"
                    class="time-picker-option"
                    [class.is-selected]="hour() === h"
                    (click)="selectHour(h)"
                  >
                    {{ pad(h) }}
                  </button>
                </li>
              }
            </ol>
            <ol class="time-picker-column" [attr.aria-label]="'Minuto'">
              @for (m of minutes; track m) {
                <li>
                  <button
                    type="button"
                    class="time-picker-option"
                    [class.is-selected]="minute() === m"
                    (click)="selectMinute(m)"
                  >
                    {{ pad(m) }}
                  </button>
                </li>
              }
            </ol>
          </div>
          <div class="time-picker-popover__actions">
            <cs-button variant="subtle" size="sm" [disabled]="!value" (click)="clear()">Limpiar</cs-button>
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
      .time-picker-field {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .time-picker-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .time-picker-trigger {
        min-inline-size: 0;
      }
      .time-picker-trigger-button {
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
      .time-picker-trigger-button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .time-picker-popover {
        --elevation-surface-default: var(--color-background-base);
        display: grid;
        inline-size: 128px;
        overflow: hidden;
        gap: 0;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background-color: var(--color-background-base);
        box-shadow: var(--shadow-xs);
      }
      .time-picker-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        max-block-size: 224px;
      }
      .time-picker-column {
        display: grid;
        gap: var(--layout-gap-2xs);
        margin: 0;
        padding: var(--layout-padding-2xs) var(--layout-padding-xs);
        list-style: none;
        overflow-y: auto;
        scrollbar-width: none;
      }
      .time-picker-column::-webkit-scrollbar {
        display: none;
      }
      .time-picker-column:first-child {
        border-inline-end: var(--layout-border-thin) solid var(--color-border-divider);
      }
      .time-picker-option {
        display: block;
        inline-size: 100%;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        text-align: center;
        cursor: pointer;
      }
      .time-picker-option:hover {
        background: var(--color-background-neutral-subtlest-hover);
      }
      .time-picker-option.is-selected {
        background: var(--color-background-brand-default);
        color: var(--color-text-inverse);
      }
      .time-picker-popover__actions {
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
export class TimePickerComponent {
  private readonly uid = `time-picker-${++nextId}`;
  protected readonly fieldId = this.uid;
  protected readonly labelId = `${this.uid}-label`;
  protected readonly panelId = `${this.uid}-panel`;
  protected readonly hours = HOURS;
  protected readonly minutes = MINUTES;

  @Input() label = '';
  @Input() placeholder = '--:--';
  /**
   * `value` es un @Input plano, no una señal — leerlo dentro de un
   * `computed()` no lo vuelve reactivo (Angular no puede rastrear cambios
   * sobre una propiedad de clase normal). Por eso se refleja en esta
   * señal interna apenas llega, y todo lo demás (hour/minute/displayValue)
   * deriva de ella, no del @Input directamente — mismo patrón que
   * `date-range-filter.component.ts`.
   */
  @Input() set value(next: string | null | undefined) {
    this._value.set(next ?? '');
  }
  get value(): string {
    return this._value();
  }
  @Output() readonly valueChange = new EventEmitter<string>();

  private readonly _value = signal('');
  protected readonly open = signal(false);
  protected readonly hour = computed(() => {
    const v = this._value();
    return v ? Number(v.split(':')[0]) : null;
  });
  protected readonly minute = computed(() => {
    const v = this._value();
    return v ? Number(v.split(':')[1]) : null;
  });
  protected readonly displayValue = this._value.asReadonly();

  protected openPicker(): void {
    this.open.set(true);
  }
  protected togglePicker(): void {
    this.open.update((isOpen) => !isOpen);
  }
  protected closePicker(): void {
    this.open.set(false);
  }
  protected selectHour(h: number): void {
    this.emit(h, this.minute() ?? 0);
  }
  protected selectMinute(m: number): void {
    this.emit(this.hour() ?? 0, m);
  }
  protected clear(): void {
    this._value.set('');
    this.valueChange.emit('');
  }
  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
  private emit(h: number, m: number): void {
    const next = `${this.pad(h)}:${this.pad(m)}`;
    this._value.set(next);
    this.valueChange.emit(next);
  }
}
