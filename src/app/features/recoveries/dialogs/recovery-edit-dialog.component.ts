import { Component, inject } from '@angular/core';
import { Button, Icon, Input, Select, SelectOption, type IconName } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveryOrderEvidence } from '../../../core/recoveries/mock-recovery-orders.service';
import { SideDrawerComponent } from '../../../shared/side-drawer.component';
import { UnitAutocompleteComponent } from '../../../shared/unit-autocomplete.component';
import { UnitTypeMultiSelectComponent } from '../../../shared/unit-type-multi-select.component';
import { DraftField, RecoveriesService } from '../recoveries.service';

/**
 * Formulario de edición de un recupero. Mismos campos que
 * `recovery-create-dialog.component.ts` — se duplica el formulario en vez
 * de compartirlo porque el plan de Recuperos
 * (`docs/plan-construccion-recuperos.md`) los lista como archivos
 * distintos, y porque `docs/arquitectura-new-capture-order.md` documenta
 * esa misma duplicación para los diálogos de Capturas en vez de extraer una
 * hoja de estilos o un componente compartido. Solo se habilita
 * (`state.openEdit`) cuando `state.canEdit(order)` es verdadero.
 */
@Component({
  selector: 'app-recovery-edit-dialog',
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
      [isOpen]="state.formOpen() && !!state.editingOrder()"
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
                inputId="recovery-edit-unit-type"
                label="Tipo de unidad"
                placeholder="Todos los tipos"
                [options]="state.unitTypeOptions"
                [value]="state.unitTypeFilter()"
                (valueChange)="state.setUnitTypeFilter($event)"
              />
              <app-unit-autocomplete
                inputId="recovery-edit-unit-code"
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
            <div class="two-col-grid">
              <div class="form-field">
                <cs-select
                  class="recovery-service-type-select"
                  label="Tipo de servicio"
                  placeholder="Selecciona un tipo de servicio"
                  size="md"
                  [options]="serviceTypeOptions"
                  [value]="state.draft().serviceType"
                  (valueChange)="setField('serviceType', asText($event))"
                  [required]="true"
                />
                @if (state.errors().serviceType) {
                  <p class="field-error" role="alert">{{ state.errors().serviceType }}</p>
                }
              </div>
              <div class="form-field">
                <cs-select
                  class="recovery-theft-modality-select"
                  label="Modalidad de robo"
                  placeholder="Selecciona una modalidad"
                  size="md"
                  [options]="theftModalityOptions"
                  [value]="state.draft().theftModality"
                  (valueChange)="setField('theftModality', asText($event))"
                  [required]="true"
                />
                @if (state.errors().theftModality) {
                  <p class="field-error" role="alert">{{ state.errors().theftModality }}</p>
                }
              </div>
            </div>
            <div class="two-col-grid">
              <div class="form-field">
                <cs-select
                  class="recovery-insurer-select"
                  label="Seguro"
                  placeholder="Selecciona un seguro"
                  size="md"
                  [options]="insurerOptions"
                  [value]="state.draft().insurerName"
                  (valueChange)="setField('insurerName', asText($event))"
                  [required]="true"
                />
                @if (state.errors().insurerName) {
                  <p class="field-error" role="alert">{{ state.errors().insurerName }}</p>
                }
              </div>
              <div class="form-field">
                <label for="recovery-edit-reference">{{ state.referenceLabel(state.draft().sourceType) }} <span class="required-marker" aria-hidden="true">*</span></label>
                <cs-input
                  id="recovery-edit-reference"
                  name="recovery-edit-reference"
                  fieldSize="md"
                  autocomplete="off"
                  [placeholder]="'Ingresa ' + state.referenceLabel(state.draft().sourceType).toLocaleLowerCase()"
                  [value]="state.draft().referenceNumber"
                  (valueChange)="setField('referenceNumber', $event)"
                  [invalid]="state.errors().referenceNumber !== ''"
                  aria-errormessage="recovery-edit-reference-error"
                  [required]="true"
                />
                @if (state.errors().referenceNumber) {
                  <p id="recovery-edit-reference-error" class="field-error" role="alert">{{ state.errors().referenceNumber }}</p>
                }
              </div>
            </div>
            <div class="form-field">
              <cs-select
                class="recovery-source-select"
                label="Fuente de solicitud"
                placeholder="Selecciona una fuente"
                size="md"
                [options]="sourceOptions"
                [value]="state.draft().sourceType"
                (valueChange)="setField('sourceType', asText($event))"
                [required]="true"
              />
              @if (state.errors().sourceType) {
                <p class="field-error" role="alert">{{ state.errors().sourceType }}</p>
              }
            </div>
            <div class="two-col-grid">
              <div class="form-field">
                <label for="recovery-edit-contact-name">Nombre de contacto</label>
                <cs-input
                  id="recovery-edit-contact-name"
                  name="recovery-edit-contact-name"
                  fieldSize="md"
                  autocomplete="off"
                  placeholder="Ingresa el nombre de contacto"
                  [value]="state.draft().contactName"
                  (valueChange)="setField('contactName', $event)"
                />
              </div>
              <div class="form-field">
                <label for="recovery-edit-contact-phone">Teléfono de contacto</label>
                <cs-input
                  id="recovery-edit-contact-phone"
                  name="recovery-edit-contact-phone"
                  type="tel"
                  fieldSize="md"
                  autocomplete="off"
                  placeholder="Ingresa el teléfono de contacto"
                  [value]="state.draft().contactPhone"
                  (valueChange)="setField('contactPhone', $event)"
                />
              </div>
            </div>
            <div class="form-field">
              <label for="recovery-edit-notes">Datos operativos y requisitos</label>
              <cs-input
                id="recovery-edit-notes"
                name="recovery-edit-notes"
                fieldSize="md"
                autocomplete="off"
                placeholder="Notas para coordinar el recupero"
                [value]="state.draft().operationalNotes"
                (valueChange)="setField('operationalNotes', $event)"
              />
            </div>

            <section class="evidence-section" aria-labelledby="evidence-edit-title">
              <div class="evidence-section__header">
                <div>
                  <h2 id="evidence-edit-title">Evidencias</h2>
                  <p>Adjunta fotos, videos o documentos que respalden el recupero. Es opcional.</p>
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
                      @if (item.url) {
                        <a class="evidence-list__link" [href]="item.url" target="_blank" rel="noopener noreferrer" [attr.aria-label]="'Abrir ' + item.fileName + ' en una nueva pestaña'">
                          <cs-icon [name]="evidenceIcon(item.fileName)" [size]="16" aria-hidden="true" />
                          <span>{{ item.fileName }}</span>
                        </a>
                      } @else {
                        <div class="evidence-list__file">
                          <cs-icon [name]="evidenceIcon(item.fileName)" [size]="16" aria-hidden="true" />
                          <span>{{ item.fileName }}</span>
                        </div>
                      }
                      <button type="button" class="evidence-list__remove" [attr.aria-label]="'Quitar ' + item.fileName" (click)="removeEvidence(item)">
                        <cs-icon name="trash-2" [size]="14" aria-hidden="true" />
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="evidence-empty">Todavía no adjuntaste ninguna evidencia.</p>
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
        gap: var(--layout-gap-lg);
        margin-top: var(--layout-gap-md);
        min-width: 0;
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
        margin: var(--layout-gap-xs) 0 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .evidence-empty {
        margin: 0;
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) dashed var(--color-border-divider);
        border-radius: var(--radius-md);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        text-align: center;
      }
      .evidence-list {
        display: grid;
        gap: var(--layout-gap-sm);
        margin: 0;
        padding: 0;
        min-width: 0;
        list-style: none;
      }
      .evidence-list li {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        gap: 0;
        padding: var(--layout-padding-sm) var(--layout-padding-md);
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-note);
      }
      .evidence-list__link,
      .evidence-list__file {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        gap: var(--layout-gap-sm);
      }
      .evidence-list__link {
        color: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      .evidence-list__link:hover span {
        text-decoration: underline;
      }
      .evidence-list__link:focus-visible {
        outline: none;
        border-radius: var(--radius-sm);
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .evidence-list__link > span,
      .evidence-list__file > span {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .evidence-list__remove {
        flex: 0 0 auto;
        margin-left: var(--layout-gap-lg);
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
        align-items: flex-start;
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
      .selected-unit-summary__identity {
        flex: 0 0 auto;
      }
      .selected-unit-summary__location {
        flex: 1 1 0;
      }
      .selected-unit-summary p {
        margin: 0;
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        letter-spacing: var(--font-letter-spacing-content);
      }
      .selected-unit-summary__identity span {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--layout-gap-2xs);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .selected-unit-summary__identity strong {
        color: var(--color-text-base-default);
        font-size: inherit;
        font-weight: var(--font-weight-accent);
      }
      .selected-unit-summary__location span {
        overflow: hidden;
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
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
export class RecoveryEditDialogComponent {
  protected readonly state = inject(RecoveriesService);
  protected readonly sourceOptions: SelectOption[] = [...this.state.sourceTypeOptions];
  protected readonly insurerOptions: SelectOption[] = [...this.state.insurerOptions];
  protected readonly serviceTypeOptions: SelectOption[] = [...this.state.serviceTypeOptions];
  protected readonly theftModalityOptions: SelectOption[] = [...this.state.theftModalityOptions];

  protected evidenceIcon(fileName: string): IconName {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'picture-in-picture-2';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) return 'activity';
    return 'file-text';
  }

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
