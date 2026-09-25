import { Component, inject } from '@angular/core';
import { Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Confirmación para volver una orden a Pendiente. Antes esta transición
 * ocurría sin diálogo (solo era alcanzable desde Observado, un cambio de
 * bajo riesgo). Desde que cualquier estado puede volver a Pendiente (ver
 * `capture-orders.service.ts#canRevertToPending`), Enzo pidió que también
 * quede notificada con una confirmación explícita — mismo patrón que
 * "Marcar como capturado"/"Observar"/"Paralizar", sin campos adicionales
 * porque no hace falta pedir ningún dato para este cambio.
 */
@Component({
  selector: 'app-capture-order-revert-dialog',
  imports: [Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.revertOpen()"
      title="Volver a pendiente"
      width="sm"
      [primaryAction]="state.revertPrimaryAction()"
      [secondaryAction]="state.revertSecondaryAction"
      (primaryActionClick)="state.confirmRevertToPending()"
      (secondaryActionClick)="state.closeRevertConfirmation()"
      (closed)="state.closeRevertConfirmation()"
    >
      @if (state.revertingOrder(); as order) {
        <div class="confirmation-content">
          <p>
            La orden {{ order.id }} volverá a Pendiente. Esta acción quedará registrada en el
            historial.
          </p>
        </div>
      }
    </cs-modal>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .confirmation-content p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
    `,
  ],
})
export class CaptureOrderRevertDialogComponent {
  protected readonly state = inject(CaptureOrdersService);
}
