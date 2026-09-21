import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { Icon, Popover } from '@iamacalupuenzo-ui/comsatel-ds';

export interface UnitTypeFilterOption {
  label: string;
  value: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-unit-type-multi-select',
  imports: [Icon, Popover],
  template: `
    <div class="unit-type-multi-select">
      <label [id]="labelId" [for]="inputId">{{ label }}</label>
      <button
        #trigger
        [id]="inputId"
        class="unit-type-multi-select__trigger"
        [class.is-open]="isOpen()"
        [class.has-value]="selectedCount > 0"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="menuId"
        [attr.aria-labelledby]="labelId"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <span>{{ triggerText }}</span>
        <cs-icon name="chevron-down" [size]="16" aria-hidden="true" />
      </button>
    </div>

    <cs-popover
      [isOpen]="isOpen()"
      [triggerRef]="triggerRef ?? null"
      placement="bottom-start"
      [offset]="4"
      [matchTriggerWidth]="true"
      [role]="null"
      [bare]="true"
      (closed)="onPopoverClosed()"
    >
      <div
        [id]="menuId"
        class="unit-type-multi-select__menu"
        role="listbox"
        aria-multiselectable="true"
        [attr.aria-labelledby]="labelId"
        (keydown)="onMenuKeydown($event)"
      >
        @for (option of options; track option.value; let index = $index) {
          <button
            type="button"
            role="option"
            class="unit-type-multi-select__option"
            [id]="optionId(index)"
            [disabled]="option.disabled"
            [attr.aria-selected]="isSelected(option.value)"
            [class.is-selected]="isSelected(option.value)"
            (click)="toggleOption(option)"
          >
            <span>{{ option.label }}</span>
            @if (isSelected(option.value)) {
              <cs-icon name="check" [size]="16" aria-hidden="true" />
            }
          </button>
        }
      </div>
    </cs-popover>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .unit-type-multi-select {
        display: grid;
        gap: var(--layout-gap-xs);
        min-width: 0;
      }
      label {
        color: var(--color-text-base-default);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-accent);
        line-height: var(--font-line-height-content-ui);
        letter-spacing: var(--font-letter-spacing-content);
      }
      .unit-type-multi-select__trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-width: 0;
        min-height: var(--layout-size-base);
        gap: var(--layout-gap-sm);
        padding: var(--layout-padding-xs) var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-neutral-default);
        border-radius: var(--radius-sm);
        background: var(--elevation-surface-default);
        color: var(--color-text-base-subtle);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-regular);
        line-height: var(--font-line-height-content-ui);
        letter-spacing: var(--font-letter-spacing-content);
        text-align: left;
        cursor: pointer;
      }
      .unit-type-multi-select__trigger > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .unit-type-multi-select__trigger > cs-icon {
        flex: none;
        color: var(--color-text-base-subtle);
        transition: transform var(--motion-duration-fast) var(--motion-easing-default);
      }
      .unit-type-multi-select__trigger.has-value {
        color: var(--color-text-base-default);
      }
      .unit-type-multi-select__trigger.is-open > cs-icon {
        transform: rotate(180deg);
      }
      .unit-type-multi-select__trigger:hover {
        border-color: var(--color-border-neutral-default);
        background: var(--color-background-neutral-subtlest);
      }
      .unit-type-multi-select__trigger:focus-visible,
      .unit-type-multi-select__trigger.is-open {
        outline: none;
        border-color: var(--color-border-focused);
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .unit-type-multi-select__menu {
        box-sizing: border-box;
        display: grid;
        width: 100%;
        padding: var(--layout-padding-xs);
        border: var(--layout-border-thin) solid var(--color-border-neutral-default);
        border-radius: var(--radius-sm);
        background: var(--color-background-base);
        box-shadow: var(--shadow-xl);
      }
      .unit-type-multi-select__option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: var(--layout-size-base);
        gap: var(--layout-gap-sm);
        padding: var(--layout-padding-xs) var(--layout-padding-sm);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-default);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-regular);
        line-height: var(--font-line-height-content-ui);
        letter-spacing: var(--font-letter-spacing-content);
        text-align: left;
        cursor: pointer;
      }
      .unit-type-multi-select__option:hover,
      .unit-type-multi-select__option:focus-visible {
        outline: none;
        background: var(--color-background-brand-subtlest);
      }
      .unit-type-multi-select__option.is-selected {
        color: var(--color-text-brand-default);
        font-weight: var(--font-weight-accent);
      }
      .unit-type-multi-select__option > cs-icon {
        flex: none;
        color: var(--color-text-brand-default);
      }
      .unit-type-multi-select__option:disabled {
        color: var(--color-text-base-disabled);
        cursor: not-allowed;
      }
    `,
  ],
})
export class UnitTypeMultiSelectComponent {
  @Input() inputId = 'unit-type';
  @Input() label = 'Tipo de unidad';
  @Input() placeholder = 'Todos los tipos';
  @Input() options: readonly UnitTypeFilterOption[] = [];
  @Input() value: readonly string[] = [];
  @Output() readonly valueChange = new EventEmitter<string[]>();

  @ViewChild('trigger') protected triggerRef?: ElementRef<HTMLButtonElement>;

  protected readonly isOpen = signal(false);
  protected get menuId(): string {
    return `${this.inputId}-options`;
  }
  protected get labelId(): string {
    return `${this.inputId}-label`;
  }

  protected get selectedCount(): number {
    return this.options.filter((option) => this.isSelected(option.value)).length;
  }

  protected get triggerText(): string {
    const selected = this.options.filter((option) => this.isSelected(option.value));
    if (!selected.length || selected.length === this.options.length) return this.placeholder;
    return selected.length === 1 ? selected[0].label : `${selected.length} tipos seleccionados`;
  }

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.isOpen.set(true);
      this.focusOption(event.key === 'ArrowUp' ? -1 : 0);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const enabledOptions = this.optionElements();
    const currentIndex = enabledOptions.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      this.isOpen.set(false);
      this.triggerRef?.nativeElement.focus();
      return;
    }
    if (event.key === 'Tab') {
      this.isOpen.set(false);
      return;
    }
    if (!enabledOptions.length) return;

    const nextIndex =
      event.key === 'ArrowDown'
        ? currentIndex + 1
        : event.key === 'ArrowUp'
          ? currentIndex - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? enabledOptions.length - 1
              : null;
    if (nextIndex === null) return;
    event.preventDefault();
    enabledOptions[(nextIndex + enabledOptions.length) % enabledOptions.length].focus();
  }

  protected toggleOption(option: UnitTypeFilterOption): void {
    if (option.disabled) return;
    const nextValue = this.isSelected(option.value)
      ? this.value.filter((value) => value !== option.value)
      : [...this.value, option.value];
    this.valueChange.emit(nextValue);
  }

  protected isSelected(value: string): boolean {
    return this.value.includes(value);
  }
  protected optionId(index: number): string {
    return `${this.menuId}-${index}`;
  }
  protected onPopoverClosed(): void {
    this.isOpen.set(false);
  }

  private focusOption(index: number): void {
    requestAnimationFrame(() => {
      const options = this.optionElements();
      if (options.length) options[index < 0 ? options.length - 1 : index].focus();
    });
  }

  private optionElements(): HTMLButtonElement[] {
    return Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        `#${this.menuId} [role="option"]:not(:disabled)`,
      ),
    );
  }
}
