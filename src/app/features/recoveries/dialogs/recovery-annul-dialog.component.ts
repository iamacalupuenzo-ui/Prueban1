import { Component, inject } from '@angular/core';
import { Input, Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveriesService } from '../recoveries.service';

/**
 * Diálogo para anular un recupero. Espeja
 * `capture-order-annul-dialog.component.ts` — mismo layout, mismo patrón de
 * motivo obligatorio — conectado a `RecoveriesService` en vez de
 * `CaptureOrdersService`. Borrador de ciclo de vida: ver nota en
 * `TransitionRecoveryOrderResult` (`mock-recovery-orders.service.ts`).
 */
@Component({
  selector: 'app-recovery-annul-dialog',
  imports: [Input, Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.annulOpen()"
      title="Anular recupero"
      appearance="danger"
      width="md"
      [primaryAction]="state.annulPrimaryAction()"
      [secondaryAction]="state.annulSecondaryAction"
      (primaryActionClick)="state.confirmAnnulment()"
      (secondaryActionClick)="state.closeAnnulment()"
      (closed)="state.closeAnnulment()"
    >
      @if (state.annulledOrder(); as order) {
        <div class="dialog-content dialog-content--reason">
          <div class="dialog-copy">
            <p>
              Anularás el recupero {{ order.id }}. El registro seguirá disponible para consulta
              junto con el motivo y el historial de esta acción.
            </p>
          </div>
          <div class="form-field">
            <label for="recovery-annulment-reason">Motivo de anulación</label
            ><cs-input
              id="recovery-annulment-reason"
              fieldSize="md"
              placeholder="Describe el motivo"
              [value]="state.annulmentReason()"
              (valueChange)="state.setAnnulmentReason($event)"
              [invalid]="state.annulmentReasonError() !== ''"
              [required]="true"
            />
            @if (state.annulmentReasonError()) {
              <p class="field-error" role="alert">{{ state.annulmentReasonError() }}</p>
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
export class RecoveryAnnulDialogComponent {
  protected readonly state = inject(RecoveriesService);
}
