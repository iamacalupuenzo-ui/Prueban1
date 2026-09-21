import { Component, inject } from '@angular/core';
import { Button, Icon, Input, Select, SelectOption } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveryOrderEvidence } from '../../../core/recoveries/mock-recovery-orders.service';
import { SideDrawerComponent } from '../../../shared/side-drawer.component';
import { UnitAutocompleteComponent } from '../../../shared/unit-autocomplete.component';
import { UnitTypeMultiSelectComponent } from '../../../shared/unit-type-multi-select.component';
import { DraftField, RecoveriesService } from '../recoveries.service';

/**
 * Formulario de registro de un recupero. Mismo patrón visual que
 * `capture-order-form-dialog.component.ts` (drawer + campos agrupados en
 * `.field-grid`/`.form-field`), pero separado del de edición porque el plan
 * de Recuperos (`docs/plan-construccion-recuperos.md`) los lista como
 * archivos distintos — a diferencia de Capturas, que combina registro y
 * edición en un solo componente. La confirmación vive aparte, en
 * `recovery-confirm-dialog.component.ts`, compartida por ambos.
 */
@Component({
  selector: 'app-recovery-create-dialog',
  imports: [
    Button,
    Icon,
    Input,
    Select,
    SideDrawerComponent,
    UnitAutocompleteComponent,
    UnitTypeMultiSelectComponent,
  ],
  template: `
    <app-side-drawer
      [isOpen]="state.formOpen() && !state.editingOrder()"
      [title]="state.dialogTitle()"
      surface="canvas"
      [primaryAction]="state.primaryAction()"
      [secondaryAction]="state.secondaryAction"
      (primaryActionClick)="state.requestSubmission()"
      (secondaryActionClick)="state.closeForm()"
      (closed)="state.closeForm()"
    >
      <div class="dialog-content">
        <form class="recovery-form" (submit)="onSubmit($event)" novalidate>
          <div class="field-grid">
            <div class="unit-selection-grid">
              <app-unit-type-multi-select
                inputId="recovery-unit-type"
                label="Tipo de unidad"
                placeholder="Todos los tipos"
                [options]="state.unitTypeOptions"
                [value]="state.unitTypeFilter()"
                (valueChange)="state.setUnitTypeFilter($event)"
              />
              <app-unit-autocomplete
                inputId="recovery-unit-code"
                label="Código de unidad"
                [options]="state.filteredUnitOptions()"
                [value]="state.draft().unitCode"
                placeholder="Escribe 3 caracteres para buscar"
                [invalid]="state.errors().unitCode !== ''"
                [errorText]="state.errors().unitCode"
                [required]="true"
                (valueChange)="state.onUnitSelected($event)"
              />
            </div>
            @if (state.selectedUnit(); as unit) {
              <div class="selected-unit-summary" role="status" aria-live="polite">
                <div class="selected-unit-summary__identity">
                  <p>Unidad seleccionada</p>
                  <span
                    ><strong>{{ unit.code }}</strong
                    >{{ unit.owner }}</span
                  >
                </div>
                <span class="selected-unit-summary__divider" aria-hidden="true"></span>
                <div class="selected-unit-summary__location">
                  <p>Condición de GPS</p>
                  <span>{{ unit.hasGps ? 'Disponible — ' + unit.lastLocation : 'No disponible para esta unidad' }}</span>
                </div>
              </div>
            }
            <div class="form-field">
              <cs-select
                class="recovery-source-select"
                label="Fuente del recupero"
                placeholder="Selecciona una fuente"
                size="md"
                [options]="sourceOptions"
                [value]="state.draft().sourceType"
                (valueChange)="setSourceType(asText($event))"
                [required]="true"
              />
            </div>
            <div class="two-col-grid">
              <div class="form-field">
                <label for="recovery-source-name">Nombre de la fuente <span class="required-marker" aria-hidden="true">*</span></label>
                <cs-input
                  id="recovery-source-name"
                  name="recovery-source-name"
                  fieldSize="md"
                  autocomplete="off"
                  [value]="state.draft().sourceName"
                  (valueChange)="setField('sourceName', $event)"
                  [invalid]="state.errors().sourceName !== ''"
                  [required]="true"
                />
                @if (state.errors().sourceName) {
                  <p class="field-error" role="alert">{{ state.errors().sourceName }}</p>
                }
              </div>
              <div class="form-field">
                <label for="recovery-reference">{{ state.referenceLabel(state.draft().sourceType) }} <span class="required-marker" aria-hidden="true">*</span></label>
                <cs-input
                  id="recovery-reference"
                  name="recovery-reference"
                  fieldSize="md"
                  autocomplete="off"
                  [value]="state.draft().referenceNumber"
                  (valueChange)="setField('referenceNumber', $event)"
                  [invalid]="state.errors().referenceNumber !== ''"
                  [required]="true"
                />
                @if (state.errors().referenceNumber) {
                  <p class="field-error" role="alert">{{ state.errors().referenceNumber }}</p>
                }
              </div>
            </div>
            <div class="two-col-grid">
              <div class="form-field">
                <label for="recovery-contact-name">Nombre de contacto <span class="required-marker" aria-hidden="true">*</span></label>
                <cs-input
                  id="recovery-contact-name"
                  name="recovery-contact-name"
                  fieldSize="md"
                  autocomplete="off"
                  [value]="state.draft().contactName"
                  (valueChange)="setField('contactName', $event)"
                  [invalid]="state.errors().contactName !== ''"
                  [required]="true"
                />
                @if (state.errors().contactName) {
                  <p class="field-error" role="alert">{{ state.errors().contactName }}</p>
                }
              </div>
              <div class="form-field">
                <label for="recovery-contact-phone">Teléfono de contacto <span class="required-marker" aria-hidden="true">*</span></label>
                <cs-input
                  id="recovery-contact-phone"
                  name="recovery-contact-phone"
                  type="tel"
                  fieldSize="md"
                  autocomplete="off"
                  [value]="state.draft().contactPhone"
                  (valueChange)="setField('contactPhone', $event)"
                  [invalid]="state.errors().contactPhone !== ''"
                  [required]="true"
                />
                @if (state.errors().contactPhone) {
                  <p class="field-error" role="alert">{{ state.errors().contactPhone }}</p>
                }
              </div>
            </div>
            <div class="form-field">
              <label for="recovery-notes">Datos operativos y requisitos</label>
              <cs-input
                id="recovery-notes"
                name="recovery-notes"
                fieldSize="md"
                autocomplete="off"
                placeholder="Notas para coordinar el recupero"
                [value]="state.draft().operationalNotes"
                (valueChange)="setField('operationalNotes', $event)"
              />
            </div>

            <section class="evidence-section" aria-labelledby="evidence-title">
              <div class="evidence-section__header">
                <div>
                  <h2 id="evidence-title">Evidencias</h2>
                  <p>Opcional por ahora. Adjunta lo que tengas disponible; el flujo documental completo se habilitará más adelante.</p>
                </div>
                <input #evidenceInput class="visually-hidden" type="file" (change)="addEvidence($event)" />
                <cs-button variant="default" size="sm" (click)="evidenceInput.click()">
                  <cs-icon name="plus" [size]="16" aria-hidden="true" />Adjuntar evidencia
                </cs-button>
              </div>
              @if (state.draft().evidence.length) {
                <ul class="evidence-list">
                  @for (item of state.draft().evidence; track item.fileName) {
                    <li>
                      <cs-icon name="file-text" [size]="16" aria-hidden="true" />
                      <span>{{ item.fileName }}</span>
                      <button type="button" class="evidence-list__remove" [attr.aria-label]="'Quitar ' + item.fileName" (click)="removeEvidence(item)">
                        <cs-icon name="trash-2" [size]="14" aria-hidden="true" />
                      </button>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>
        </form>
      </div>
    </app-side-drawer>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .dialog-content {
        display: grid;
        gap: var(--layout-gap-2xl);
        padding-block: var(--layout-padding-lg);
      }
      .recovery-form {
        margin: 0;
      }
      .field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--layout-gap-xl);
      }
      .two-col-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--layout-gap-lg);
      }
      .unit-selection-grid {
        display: grid;
        grid-template-columns: 180px minmax(0, 1fr);
        align-items: start;
        gap: var(--layout-gap-lg);
      }
      .form-field {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .form-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .required-marker {
        margin-left: var(--layout-gap-2xs);
        color: var(--color-text-danger-default);
      }
      .field-error {
        margin: 0;
        color: var(--color-text-danger-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .evidence-section {
        display: grid;
        gap: var(--layout-gap-md);
      }
      .evidence-section__header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: var(--layout-gap-md);
      }
      .evidence-section__header h2 {
        margin: 0;
        color: var(--color-text-base-default);
        font-family: var(--font-family-heading);
        font-size: var(--font-size-content-caption);
        line-height: var(--font-line-height-content-caption);
      }
      .evidence-section__header p {
        margin: var(--layout-gap-2xs) 0 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .evidence-list {
        display: grid;
        gap: var(--layout-gap-sm);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .evidence-list li {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-sm);
        padding: var(--layout-padding-sm) var(--layout-padding-md);
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-note);
      }
      .evidence-list li > span {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .evidence-list__remove {
        display: grid;
        place-items: center;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-danger-default);
        cursor: pointer;
      }
      .evidence-list__remove:hover {
        background: var(--color-background-neutral-subtle);
      }
      .selected-unit-summary {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-lg);
        padding: var(--layout-padding-md) var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
      }
      .selected-unit-summary__identity,
      .selected-unit-summary__location {
        display: grid;
        gap: var(--layout-gap-2xs);
        min-width: 0;
      }
      .selected-unit-summary p {
        margin: 0;
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-label-small);
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      .selected-unit-summary__identity span {
        display: flex;
        align-items: baseline;
        gap: var(--layout-gap-sm);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
      }
      .selected-unit-summary__identity strong {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
      }
      .selected-unit-summary__location span {
        overflow: hidden;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .selected-unit-summary__divider {
        align-self: stretch;
        width: var(--layout-border-thin);
        background: var(--color-border-divider);
      }
      @media (max-width: 767px) {
        .field-grid,
        .two-col-grid,
        .unit-selection-grid {
          grid-template-columns: 1fr;
        }
        .selected-unit-summary {
          flex-direction: column;
          align-items: stretch;
        }
        .selected-unit-summary__divider {
          width: 100%;
          height: var(--layout-border-thin);
        }
      }
    `,
  ],
})
export class RecoveryCreateDialogComponent {
  protected readonly state = inject(RecoveriesService);
  protected readonly sourceOptions: SelectOption[] = [...this.state.sourceTypeOptions];

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.state.requestSubmission();
  }
  protected asText(value: string | string[]): string {
    return typeof value === 'string' ? value : '';
  }
  protected setField(field: DraftField, value: string): void {
    this.state.setField(field, value);
  }
  protected setSourceType(value: string): void {
    this.state.setSourceType(value as 'aseguradora' | 'persona-natural' | 'otra');
  }
  protected addEvidence(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (file) this.state.addEvidence(file);
  }
  protected removeEvidence(item: RecoveryOrderEvidence): void {
    this.state.removeEvidence(item.fileName);
  }
}
