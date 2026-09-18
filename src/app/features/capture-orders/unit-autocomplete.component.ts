import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { Icon, InputGroup, InputGroupAddon, InputGroupInput } from '@iamacalupuenzo-ui/comsatel-ds';

export interface UnitOption {
  code: string;
  description: string;
}

@Component({
  selector: 'app-unit-autocomplete',
  imports: [Icon, InputGroup, InputGroupAddon, InputGroupInput],
  template: `
    <div class="unit-autocomplete">
      <label [for]="inputId">{{ label }}</label>
      <cs-input-group>
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
          (keydown.arrowup)="moveActive($event, -1)" />
        <cs-input-group-addon align="inline-end">
          <cs-icon name="search" [size]="16" aria-hidden="true" />
        </cs-input-group-addon>
      </cs-input-group>
      @if (isOpen()) {
        <div class="unit-options" [id]="listboxId" role="listbox" [attr.aria-label]="label">
          @if (!canSearch()) {
            <p>Escribe al menos {{ minQueryLength }} caracteres para buscar una unidad.</p>
          } @else if (results().length) {
            @for (option of results(); track option.code; let index = $index) {
              <button
                type="button"
                role="option"
                [id]="optionId(index)"
                [attr.aria-selected]="activeIndex() === index"
                [class.is-active]="activeIndex() === index"
                (mousedown)="select(option, $event)">
                <strong>{{ option.code }}</strong>
                <span>{{ option.description }}</span>
              </button>
            }
          } @else {
            <p>No encontramos una unidad con ese código.</p>
          }
        </div>
      }
      @if (invalid && errorText) { <p class="field-error" [id]="errorId" role="alert">{{ errorText }}</p> }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .unit-autocomplete { position: relative; display: grid; gap: var(--layout-gap-xs); }
    label { color: var(--color-text-base-default); font-family: var(--font-family-content); font-size: var(--font-size-content-note); font-weight: var(--font-weight-accent); line-height: var(--font-line-height-content-note); letter-spacing: var(--font-letter-spacing-content); }
    cs-input-group { width: 100%; }
    cs-input-group-addon { color: var(--color-icon-base-subtle); }
    .unit-options { position: absolute; z-index: 2; top: calc(100% + var(--layout-gap-xs)); right: 0; left: 0; max-height: 68px; overflow-y: auto; border: var(--layout-border-thin) solid var(--color-border-divider); border-radius: var(--radius-sm); background: var(--elevation-surface-default); box-shadow: var(--elevation-shadow-md); }
    .unit-options p { margin: 0; padding: var(--layout-padding-md); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .unit-options button { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; width: 100%; min-height: 33px; gap: var(--layout-gap-sm); padding: var(--layout-padding-xs) var(--layout-padding-md); border: 0; border-bottom: var(--layout-border-thin) solid var(--color-border-divider); color: var(--color-text-base-default); background: var(--elevation-surface-default); text-align: left; cursor: pointer; }
    .unit-options button:last-child { border-bottom: 0; }
    .unit-options button:hover, .unit-options button.is-active { background: var(--color-background-brand-subtle); }
    .unit-options strong { font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); font-weight: var(--font-weight-accent); }
    .unit-options span { overflow: hidden; color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); text-overflow: ellipsis; white-space: nowrap; }
    .field-error { color: var(--color-text-danger-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
  `],
})
export class UnitAutocompleteComponent implements OnChanges {
  @Input({ required: true }) inputId = 'unit-code';
  @Input({ required: true }) label = 'Código de unidad';
  @Input({ required: true }) options: readonly UnitOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Busca por código de unidad';
  @Input() minQueryLength = 3;
  @Input() invalid = false;
  @Input() errorText = '';
  @Input() required = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(-1);
  private readonly isSearchOpen = signal(false);
  protected readonly canSearch = computed(() => this.query().trim().length >= this.minQueryLength);
  protected readonly results = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    if (term.length < this.minQueryLength) return [];
    return this.options.filter((option) => `${option.code} ${option.description}`.toLocaleLowerCase().includes(term)).slice(0, 6);
  });
  protected readonly isOpen = computed(() => this.isSearchOpen());
  protected readonly listboxId = `${this.inputId}-options`;
  protected readonly errorId = `${this.inputId}-error`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value !== this.query()) this.query.set(this.value);
  }

  protected search(value: string): void {
    this.query.set(value);
    this.isSearchOpen.set(true);
    this.activeIndex.set(this.canSearch() && this.results().length ? 0 : -1);
  }

  protected open(): void {
    this.isSearchOpen.set(true);
    if (this.canSearch() && this.results().length) this.activeIndex.set(0);
  }

  protected closeAfterBlur(): void {
    window.setTimeout(() => this.isSearchOpen.set(false), 120);
  }

  protected moveActive(event: Event, direction: 1 | -1): void {
    if (!this.canSearch() || !this.results().length) return;
    event.preventDefault();
    this.isSearchOpen.set(true);
    this.activeIndex.update((index) => (index + direction + this.results().length) % this.results().length);
  }

  protected close(): void { this.isSearchOpen.set(false); }

  protected selectActive(): void {
    if (!this.canSearch() || !this.results().length) return;
    this.select(this.results()[this.activeIndex() < 0 ? 0 : this.activeIndex()]);
  }

  protected select(option: UnitOption | undefined, event?: MouseEvent): void {
    event?.preventDefault();
    if (!option) return;
    this.query.set(option.code);
    this.value = option.code;
    this.isSearchOpen.set(false);
    this.activeIndex.set(-1);
    this.valueChange.emit(option.code);
  }

  protected optionId(index: number): string { return `${this.listboxId}-${index}`; }
}
