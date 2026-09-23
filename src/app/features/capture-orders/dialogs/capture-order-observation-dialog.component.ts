import { Component, inject } from '@angular/core';
import { Input, Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Diálogo para observar una captura. Extraído de
 * `new-capture-order.page.ts` (el `cs-modal` "Observar captura", líneas
 * ~942-978 del archivo original).
 */
@Component({
  selector: 'app-capture-order-observation-dialog',
  imports: [Input, Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.observationOpen()"
      title="Observar captura"
      width="md"
      [primaryAction]="state.observationPrimaryAction()"
      [secondaryAction]="secondaryAction"
      (primaryActionClick)="state.confirmObservation()"
      (secondaryActionClick)="state.closeObservation()"
      (closed)="state.closeObservation()"
    >
      @if (state.observedOrder(); as order) {
        <div class="dialog-content dialog-content--reason">
          <div class="dialog-copy">
            <p>
              La orden {{ order.id }} pasará a Observado. Describe qué debe corregirse antes
              de continuar.
            </p>
          </div>
          <div class="form-field">
            <label for="observation-reason">Descripción de la observación</label
            ><cs-input
              id="observation-reason"
              fieldSize="md"
              placeholder="Describe la observación"
              [value]="state.observationReason()"
              (valueChange)="state.setObservationReason($event)"
              [invalid]="state.observationReasonError() !== ''"
              [required]="true"
            />
            @if (state.observationReasonError()) {
              <p class="field-error" role="alert">{{ state.observationReasonError() }}</p>
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
export class CaptureOrderObservationDialogComponent {
  protected readonly state = inject(CaptureOrdersService);
  protected readonly secondaryAction = { label: 'Cancelar' };
}
