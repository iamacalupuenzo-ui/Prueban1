import { Component, inject } from '@angular/core';
import { Button, Icon, Input, Modal, Select, SelectOption } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CaptureDocumentType,
  CaptureOrderDocument,
} from '../../../core/orders/mock-capture-orders.service';
import { SideDrawerComponent } from '../../../shared/side-drawer.component';
import { CaptureOrdersService, DraftField } from '../capture-orders.service';
import { UnitAutocompleteComponent } from '../../../shared/unit-autocomplete.component';
import { UnitTypeMultiSelectComponent } from '../../../shared/unit-type-multi-select.component';

const DOCUMENT_DEFINITIONS: ReadonlyArray<{
  type: CaptureDocumentType;
  label: string;
  description: string;
}> = [
  {
    type: 'resolution',
    label: 'Resolución',
    description: 'Documento que sustenta la medida emitida.',
  },
  { type: 'oficio', label: 'Oficio', description: 'Comunicación oficial vinculada a la captura.' },
  {
    type: 'transit-notification',
    label: 'Notificación a Tránsito',
    description: 'Constancia de la notificación a la autoridad de tránsito.',
  },
  {
    type: 'requisition',
    label: 'Requisitoria',
    description: 'Documento de requisitoria correspondiente.',
  },
];

/**
 * Formulario de registro/edición de una orden de captura, incluida su
 * modal de confirmación. Extraído de `new-capture-order.page.ts` (el
 * `app-side-drawer` de registro y el `cs-modal` de confirmación que le
 * sigue, líneas ~609-992 del archivo original).
 *
 * Se mantienen juntos en un solo componente porque son dos pasos del mismo
 * flujo (`requestSubmission` abre la confirmación, `closeConfirmation`
 * regresa al formulario) y ya comparten estado en `CaptureOrdersService`
 * (`draft`, `errors`, `editingOrder`); separarlos en dos archivos no
 * reduciría acoplamiento real, solo lo movería a más `@Input`/`@Output`.
 */
@Component({
  selector: 'app-capture-order-form-dialog',
  imports: [
    Button,
    Icon,
    Input,
    Modal,
    Select,
    SideDrawerComponent,
    UnitAutocompleteComponent,
    UnitTypeMultiSelectComponent,
  ],
  template: `
    <app-side-drawer
      [isOpen]="state.formOpen()"
      [title]="state.dialogTitle()"
      surface="canvas"
      [primaryAction]="state.primaryAction()"
      [secondaryAction]="state.secondaryAction"
      (primaryActionClick)="state.requestSubmission()"
      (secondaryActionClick)="state.closeForm()"
      (closed)="state.closeForm()"
    >
      <div class="dialog-content">
        <form class="capture-form" (submit)="onSubmit($event)" novalidate>
          <div class="field-grid">
            <div class="unit-selection-grid">
              <app-unit-type-multi-select
                inputId="unit-type"
                label="Tipo de unidad"
                placeholder="Todos los tipos"
                [options]="state.unitTypeOptions"
                [value]="state.unitTypeFilter()"
                (valueChange)="state.setUnitTypeFilter($event)"
              />
              <app-unit-autocomplete
                inputId="unit-code"
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
                  <p>Última ubicación</p>
                  <span>{{ unit.lastLocation }}</span>
                </div>
              </div>
            }
            <div class="form-field">
              <cs-select
                class="capture-source-select"
                label="Fuente de la orden"
                placeholder="Selecciona una fuente"
                size="md"
                [options]="sourceOptions"
                [value]="state.draft().source"
                (valueChange)="setField('source', asText($event))"
                [required]="true"
              />
              @if (state.errors().source) {
                <p class="field-error" role="alert">{{ state.errors().source }}</p>
              }
            </div>
            <div class="case-received-grid">
              <div class="form-field">
                <label for="case-number"
                  >N.º de expediente
                  <span class="required-marker" aria-hidden="true">*</span></label
                ><cs-input
                  id="case-number"
                  name="case-number"
                  fieldSize="md"
                  placeholder="{{ state.caseNumberPrefix }}0000"
                  autocomplete="off"
                  [value]="state.draft().caseNumber"
                  (valueChange)="setCaseNumber($event)"
                  [invalid]="state.errors().caseNumber !== ''"
                  aria-errormessage="case-number-error"
                  [required]="true"
                />
                @if (state.errors().caseNumber) {
                  <p id="case-number-error" class="field-error">{{ state.errors().caseNumber }}</p>
                }
              </div>
              <div class="form-field">
                <label for="received-on"
                  >Fecha de recepción
                  <span class="required-marker" aria-hidden="true">*</span></label
                ><cs-input
                  id="received-on"
                  name="received-on"
                  type="date"
                  fieldSize="md"
                  [max]="state.today"
                  [value]="state.draft().receivedOn"
                  (valueChange)="setField('receivedOn', $event)"
                  [invalid]="state.errors().receivedOn !== ''"
                  aria-errormessage="received-on-error"
                  [required]="true"
                />
                @if (state.errors().receivedOn) {
                  <p id="received-on-error" class="field-error">{{ state.errors().receivedOn }}</p>
                }
              </div>
            </div>
            <section
              class="document-section"
              aria-labelledby="documents-title"
              [class.has-error]="state.errors().documents !== ''"
            >
              <div class="document-section__header">
                <div class="document-section__copy">
                  <h2 id="documents-title">
                    Documentos de respaldo
                    <span class="required-marker" aria-hidden="true">*</span>
                  </h2>
                  <p>Adjunta un PDF por cada documento. Tamaño máximo: 10 MB.</p>
                </div>
                <span class="document-section__count" aria-live="polite"
                  >{{ state.draft().documents.length }} de
                  {{ documentDefinitions.length }} adjuntos</span
                >
              </div>
              <div class="document-list">
                @for (document of documentDefinitions; track document.type) {
                  @let uploaded = uploadedDocument(document.type);
                  <article class="document-upload" [class.document-upload--complete]="uploaded">
                    <div class="document-upload__icon" aria-hidden="true">
                      <cs-icon [name]="uploaded ? 'check-circle-2' : 'file-text'" [size]="18" />
                    </div>
                    <div class="document-upload__content">
                      <h3>{{ document.label }}</h3>
                      @if (uploaded) {
                        <p class="document-upload__file" [title]="uploaded.fileName">
                          {{ uploaded.fileName }}
                          <span>· {{ formatFileSize(uploaded.fileSize) }}</span>
                        </p>
                      } @else {
                        <p>{{ document.description }}</p>
                      }
                    </div>
                    <input
                      #documentInput
                      class="document-upload__input"
                      [id]="'document-' + document.type"
                      type="file"
                      accept="application/pdf,.pdf"
                      [attr.aria-describedby]="'document-' + document.type + '-help'"
                      (change)="selectDocument(document.type, $event)"
                    />
                    <div class="document-upload__actions">
                      @if (uploaded) {
                        <cs-button
                          variant="subtle"
                          size="sm"
                          [aria-label]="'Reemplazar ' + document.label"
                          (click)="documentInput.click()"
                          ><cs-icon
                            name="folder"
                            [size]="16"
                            aria-hidden="true"
                          />Reemplazar</cs-button
                        ><cs-button
                          variant="subtle"
                          size="sm"
                          [aria-label]="'Quitar ' + document.label"
                          (click)="removeDocument(document.type)"
                          ><cs-icon
                            class="document-upload__remove-icon"
                            name="trash-2"
                            [size]="16"
                            aria-hidden="true"
                        /></cs-button>
                      } @else {
                        <cs-button
                          variant="default"
                          size="sm"
                          [aria-label]="'Adjuntar ' + document.label"
                          (click)="documentInput.click()"
                          ><cs-icon
                            name="plus"
                            [size]="16"
                            aria-hidden="true"
                          />Adjuntar</cs-button
                        >
                      }
                    </div>
                    <span class="visually-hidden" [id]="'document-' + document.type + '-help'"
                      >Solo se acepta un archivo PDF de hasta 10 MB.</span
                    >
                  </article>
                }
              </div>
              @if (state.errors().documents) {
                <p class="field-error" role="alert">{{ state.errors().documents }}</p>
              }
            </section>
          </div>
        </form>
      </div>
    </app-side-drawer>
    <cs-modal
      class="capture-confirmation-modal capture-surface-modal"
      [isOpen]="state.confirmationOpen()"
      [title]="state.confirmationTitle()"
      width="sm"
      [primaryAction]="state.confirmationPrimaryAction()"
      [secondaryAction]="state.confirmationSecondaryAction"
      (primaryActionClick)="state.confirmSubmission()"
      (secondaryActionClick)="state.closeConfirmation()"
      (closed)="state.closeConfirmation()"
      ><div class="confirmation-content">
        <p>{{ state.confirmationCopy() }}</p>
      </div></cs-modal
    >
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
      .confirmation-content p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .capture-form {
        margin: 0;
      }
      .field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--layout-gap-xl);
      }
      .unit-selection-grid,
      .case-received-grid {
        display: grid;
        grid-template-columns: 180px minmax(0, 1fr);
        align-items: start;
        gap: var(--layout-gap-lg);
      }
      .case-received-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
      @media (max-width: 767px) {
        .field-grid,
        .unit-selection-grid,
        .case-received-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CaptureOrderFormDialogComponent {
  protected readonly state = inject(CaptureOrdersService);

  protected readonly sourceOptions: SelectOption[] = [
    { label: 'Centro de operaciones', value: 'Centro de operaciones' },
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Autoridad competente', value: 'Autoridad competente' },
    { label: 'Operación en campo', value: 'Operación en campo' },
  ];
  protected readonly documentDefinitions = DOCUMENT_DEFINITIONS;

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
  protected setCaseNumber(value: string): void {
    const prefix = this.state.caseNumberPrefix;
    const suffix = value.startsWith(prefix)
      ? value.slice(prefix.length)
      : value.replace(/^EXP-\d{4}-?/i, '');
    this.state.setField('caseNumber', `${prefix}${suffix.replace(/\D/g, '')}`);
  }
  protected uploadedDocument(type: CaptureDocumentType): CaptureOrderDocument | undefined {
    return this.state.draft().documents.find((document) => document.type === type);
  }
  protected selectDocument(type: CaptureDocumentType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.state.errors.update((errors) => ({
        ...errors,
        documents: 'Adjunta documentos en formato PDF.',
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.state.errors.update((errors) => ({
        ...errors,
        documents: 'Cada documento puede tener un tamaño máximo de 10 MB.',
      }));
      return;
    }
    const nextDocument: CaptureOrderDocument = { type, fileName: file.name, fileSize: file.size };
    this.state.draft.update((draft) => ({
      ...draft,
      documents: [...draft.documents.filter((document) => document.type !== type), nextDocument],
    }));
    this.state.errors.update((errors) => ({ ...errors, documents: '' }));
  }
  protected removeDocument(type: CaptureDocumentType): void {
    this.state.draft.update((draft) => ({
      ...draft,
      documents: draft.documents.filter((document) => document.type !== type),
    }));
  }
  protected formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
