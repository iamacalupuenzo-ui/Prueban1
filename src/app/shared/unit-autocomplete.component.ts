import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import {
  Icon,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  type IconName,
} from '@iamacalupuenzo-ui/comsatel-ds';

export interface UnitOption {
  code: string;
  owner: string;
  lastLocation: string;
  lastLocationMapUrl: string;
  icon: IconName;
}

@Component({
  selector: 'app-unit-autocomplete',
  imports: [Icon, InputGroup, InputGroupAddon, InputGroupInput],
  template: `
    <div class="unit-autocomplete">
      <label [for]="inputId"
        >{{ label }}
        @if (required) {
          <span class="required-marker" aria-hidden="true">*</span>
        }
      </label>
      <cs-input-group>
        <cs-input-group-addon align="inline-start">
          <cs-icon name="search" [size]="16" aria-hidden="true" />
        </cs-input-group-addon>
        <cs-input-group-input
          [id]="inputId"
          [fieldSize]="'md'"
          type="search"
          autocomplete="off"
          [ariaHasPopup]="'listbox'"
          [ariaControls]="listboxId"
          [ariaExpanded]="isOpen()"
          [attr.aria-describedby]="invalid ? errorId : null"
          [invalid]="invalid"
          [required]="required"
          [placeholder]="placeholder"
          [value]="query()"
          (valueChange)="search($event)"
          (focused)="open()"
          (blurred)="closeAfterBlur()"
          (enterKey)="selectActive()"
          (escapeKey)="close()"
          (keydown.arrowdown)="moveActive($event, 1)"
          (keydown.arrowup)="moveActive($event, -1)"
        />
      </cs-input-group>
      @if (isOpen()) {
        <div
          class="unit-options"
          [id]="listboxId"
          role="listbox"
          [attr.aria-label]="label"
          (mousedown)="keepOpenOnPointerDown()"
        >
          @if (results().length) {
            @for (option of results(); track option.code; let index = $index) {
              <button
                type="button"
                role="option"
                [id]="optionId(index)"
                [attr.aria-selected]="activeIndex() === index"
                [class.is-active]="activeIndex() === index"
                (mouseenter)="activateOption(index)"
                (mousedown)="select(option, $event)"
              >
                <cs-icon
                  class="unit-option__type-icon"
                  [name]="option.icon"
                  [size]="18"
                  aria-hidden="true"
                />
                <span class="unit-option__details">
                  <strong>{{ option.code }}</strong>
                  <span>{{ option.owner }}</span>
                </span>
              </button>
            }
          } @else {
            <p>No encontramos una unidad con ese código.</p>
          }
        </div>
      }
      @if (invalid && errorText) {
        <p class="field-error" [id]="errorId" role="alert">{{ errorText }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .unit-autocomplete {
        position: relative;
        display: grid;
        gap: var(--layout-gap-xs);
      }
      label {
        color: var(--color-text-base-default);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-accent);
        line-height: var(--font-line-height-content-ui);
        letter-spacing: var(--font-letter-spacing-content);
      }
      cs-input-group {
        width: 100%;
      }
      cs-input-group-addon {
        color: var(--color-text-base-subtlest);
      }
      .required-marker {
        margin-left: var(--layout-gap-2xs);
        color: var(--color-text-danger-default);
      }
      .unit-options {
        position: absolute;
        z-index: 2;
        box-sizing: border-box;
        top: calc(100% + var(--layout-gap-xs));
        right: 0;
        left: 0;
        max-height: 232px;
        overflow-y: auto;
        padding: var(--layout-padding-xs);
        border: var(--layout-border-thin) solid var(--color-border-neutral-default);
        border-radius: var(--radius-md);
        background: var(--color-background-base);
        box-shadow: var(--shadow-xl);
      }
      .unit-options p {
        margin: 0;
        padding: var(--layout-padding-md);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .unit-options button {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        align-items: center;
        width: 100%;
        height: 32px;
        min-height: 32px;
        gap: var(--layout-gap-xs);
        padding: var(--layout-padding-2xs) var(--layout-padding-md);
        border: 0;
        border-radius: var(--radius-sm);
        color: var(--color-text-base-default);
        background: transparent;
        font-family: var(--font-family-content);
        font-weight: var(--font-weight-regular);
        letter-spacing: var(--font-letter-spacing-content);
        text-align: left;
        cursor: pointer;
      }
      .unit-options button:hover,
      .unit-options button.is-active,
      .unit-options button:focus-visible {
        outline: none;
        background: var(--color-background-neutral-subtle);
      }
      .unit-option__type-icon {
        color: var(--color-text-brand-default);
      }
      .unit-option__details {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: var(--layout-gap-sm);
      }
      .unit-option__details strong {
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .unit-option__details > span {
        overflow: hidden;
        min-width: 0;
        color: var(--color-text-base-subtle);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-regular);
        line-height: var(--font-line-height-content-ui);
        letter-spacing: var(--font-letter-spacing-content);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .field-error {
        margin: 0;
        color: var(--color-text-danger-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
    `,
  ],
})
export class UnitAutocompleteComponent implements OnChanges {
  @Input({ required: true }) inputId = 'unit-code';
  @Input({ required: true }) label = 'Código de unidad';
  @Input({ required: true }) options: readonly UnitOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Busca por código de unidad';
  @Input() invalid = false;
  @Input() errorText = '';
  @Input() required = false;
  @Input() minimumCharacters = 3;
  @Output() readonly valueChange = new EventEmitter<string>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  private readonly isSearchOpen = signal(false);
  private pointerDownWithinOptions = false;
  protected readonly hasMinimumCharacters = computed(
    () => this.query().trim().length >= this.minimumCharacters,
  );
  protected readonly results = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    if (term.length < this.minimumCharacters) return [];
    return this.options.filter((option) =>
      `${option.code} ${option.owner}`.toLocaleLowerCase().includes(term),
    );
  });
  protected readonly isOpen = computed(() => this.isSearchOpen() && this.hasMinimumCharacters());
  protected readonly listboxId = `${this.inputId}-options`;
  protected readonly errorId = `${this.inputId}-error`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value !== this.query()) this.query.set(this.value);
  }

  protected search(value: string): void {
    this.query.set(value);
    if (value !== this.value) {
      this.value = '';
      this.valueChange.emit('');
    }
    this.isSearchOpen.set(this.hasMinimumCharacters());
    this.activeIndex.set(this.results().length ? 0 : -1);
  }

  protected open(): void {
    // La lista solo se abre por una consulta escrita, no al enfocar el campo.
    this.isSearchOpen.set(false);
  }

  protected closeAfterBlur(): void {
    window.setTimeout(() => {
      if (!this.pointerDownWithinOptions) this.isSearchOpen.set(false);
      this.pointerDownWithinOptions = false;
    }, 120);
  }

  protected moveActive(event: Event, direction: 1 | -1): void {
    if (!this.isOpen() || !this.results().length) return;
    event.preventDefault();
    this.activeIndex.update(
      (index) => (index + direction + this.results().length) % this.results().length,
    );
  }

  protected close(): void {
    this.isSearchOpen.set(false);
  }

  protected activateOption(index: number): void {
    this.activeIndex.set(index);
  }

  protected keepOpenOnPointerDown(): void {
    this.pointerDownWithinOptions = true;
  }

  protected selectActive(): void {
    if (!this.isOpen() || !this.results().length) return;
    this.select(this.results()[this.activeIndex() < 0 ? 0 : this.activeIndex()]);
  }

  protected select(option: UnitOption | undefined, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!option) return;
    this.pointerDownWithinOptions = false;
    this.query.set(option.code);
    this.value = option.code;
    this.isSearchOpen.set(false);
    this.activeIndex.set(-1);
    this.valueChange.emit(option.code);
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-${index}`;
  }
}
