import { Component, inject } from '@angular/core';
import { Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Diálogo de confirmación para cerrar una captura. Extraído de
 * `new-capture-order.page.ts` (el `cs-modal` "Cerrar captura", líneas
 * ~922-941 del archivo original).
 */
@Component({
  selector: 'app-capture-order-close-dialog',
  imports: [Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.closeOpen()"
      title="Cerrar captura"
      width="sm"
      [primaryAction]="state.closePrimaryAction()"
      [secondaryAction]="secondaryAction"
      (primaryActionClick)="state.confirmClose()"
      (secondaryActionClick)="state.closeCloseConfirmation()"
      (closed)="state.closeCloseConfirmation()"
    >
      @if (state.closingOrder(); as order) {
        <div class="confirmation-content">
          <p>
            Cerrarás la orden {{ order.id }}. Esta acción quedará registrada en el historial y la
            captura ya no admitirá edición ni anulación.
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
export class CaptureOrderCloseDialogComponent {
  protected readonly state = inject(CaptureOrdersService);
  protected readonly secondaryAction = { label: 'Cancelar' };
}
