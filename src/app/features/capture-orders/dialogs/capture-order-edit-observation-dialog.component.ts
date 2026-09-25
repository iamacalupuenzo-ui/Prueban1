import { Component, inject } from '@angular/core';
import { Input, Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Corrige el texto de una observación ya registrada — el lápiz junto a
 * "Observación" en el drawer de detalle. No repite la transición de estado
 * (`capture-order-observation-dialog.component.ts`), solo actualiza el
 * texto. A pedido de Enzo (23 sep. 2026).
 */
@Component({
  selector: 'app-capture-order-edit-observation-dialog',
  imports: [Input, Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.editObservationOpen()"
      title="Editar observación"
      width="md"
      [primaryAction]="state.editObservationPrimaryAction()"
      [secondaryAction]="secondaryAction"
      (primaryActionClick)="state.confirmEditObservation()"
      (secondaryActionClick)="state.closeEditObservation()"
      (closed)="state.closeEditObservation()"
    >
      @if (state.editingObservationOrder(); as order) {
        <div class="dialog-content dialog-content--reason">
          <div class="dialog-copy">
            <p>Corrige el texto de la observación registrada para la orden {{ order.id }}.</p>
          </div>
          <div class="form-field">
            <label for="edit-observation-reason">Descripción de la observación</label
            ><cs-input
              id="edit-observation-reason"
              fieldSize="md"
              placeholder="Describe la observación"
              [value]="state.editObservationReason()"
              (valueChange)="state.setEditObservationReason($event)"
              [invalid]="state.editObservationReasonError() !== ''"
              [required]="true"
            />
            @if (state.editObservationReasonError()) {
              <p class="field-error" role="alert">{{ state.editObservationReasonError() }}</p>
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
export class CaptureOrderEditObservationDialogComponent {
  protected readonly state = inject(CaptureOrdersService);
  protected readonly secondaryAction = { label: 'Cancelar' };
}
