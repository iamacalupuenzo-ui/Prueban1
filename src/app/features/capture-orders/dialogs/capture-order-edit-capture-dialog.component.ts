import { Component, inject } from '@angular/core';
import { Input, Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Corrige responsable/ubicación de una captura ya marcada como Capturado —
 * el lápiz junto a esos datos en el drawer de detalle. No repite la
 * transición de estado (`capture-order-close-dialog.component.ts`), solo
 * actualiza el par de campos. A pedido de Enzo (23 sep. 2026).
 */
@Component({
  selector: 'app-capture-order-edit-capture-dialog',
  imports: [Input, Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.editCaptureDetailsOpen()"
      title="Editar datos de la captura"
      width="md"
      [primaryAction]="state.editCaptureDetailsPrimaryAction()"
      [secondaryAction]="state.editCaptureDetailsSecondaryAction"
      (primaryActionClick)="state.confirmEditCaptureDetails()"
      (secondaryActionClick)="state.closeEditCaptureDetails()"
      (closed)="state.closeEditCaptureDetails()"
    >
      @if (state.editingCaptureDetailsOrder(); as order) {
        <div class="dialog-content dialog-content--reason">
          <div class="dialog-copy">
            <p>Corrige el responsable o la ubicación registrados para la orden {{ order.id }}.</p>
          </div>
          <div class="form-field">
            <label for="edit-capture-officer">Responsable de la captura</label
            ><cs-input
              id="edit-capture-officer"
              fieldSize="md"
              placeholder="Nombre del oficial a cargo"
              [value]="state.editCaptureOfficer()"
              (valueChange)="state.setEditCaptureOfficer($event)"
              [invalid]="state.editCaptureOfficerError() !== ''"
              [required]="true"
            />
            @if (state.editCaptureOfficerError()) {
              <p class="field-error" role="alert">{{ state.editCaptureOfficerError() }}</p>
            }
          </div>
          <div class="form-field">
            <label for="edit-capture-location">Ubicación de la captura</label
            ><cs-input
              id="edit-capture-location"
              fieldSize="md"
              placeholder="Dirección o referencia donde se capturó la unidad"
              [value]="state.editCaptureLocation()"
              (valueChange)="state.setEditCaptureLocation($event)"
              [invalid]="state.editCaptureLocationError() !== ''"
              [required]="true"
            />
            @if (state.editCaptureLocationError()) {
              <p class="field-error" role="alert">{{ state.editCaptureLocationError() }}</p>
            }
          </div>
        </div>
      }
    </cs-modal>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .dialog-content--reason {
        display: grid;
        gap: var(--layout-gap-lg);
      }
      .dialog-copy p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
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
      .field-error {
        margin: 0;
        color: var(--color-text-danger-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
    `,
  ],
})
export class CaptureOrderEditCaptureDialogComponent {
  protected readonly state = inject(CaptureOrdersService);
}
