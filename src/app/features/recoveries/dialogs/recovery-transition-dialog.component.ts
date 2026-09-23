import { Component, inject } from '@angular/core';
import { Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveriesService } from '../recoveries.service';

/**
 * Confirmación compartida para las tres transiciones de ciclo de vida sin
 * motivo (Pasar a gestión, Marcar como recuperado, Cerrar recupero). A
 * diferencia de Capturas, que separa cada acción en su propio diálogo
 * (`capture-order-close-dialog.component.ts`, etc.), aquí las tres son
 * estructuralmente idénticas — solo cambia el título, el copy y la acción
 * que dispara `RecoveriesService.confirmTransition()` — así que comparten un
 * solo componente en vez de triplicar el mismo modal. Anular sí tiene su
 * propio diálogo (`recovery-annul-dialog.component.ts`) porque pide un
 * motivo. Borrador de ciclo de vida: ver nota en
 * `TransitionRecoveryOrderResult` (`mock-recovery-orders.service.ts`).
 */
@Component({
  selector: 'app-recovery-transition-dialog',
  imports: [Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.transitionOpen()"
      [title]="state.transitionTitle()"
      width="sm"
      [primaryAction]="state.transitionPrimaryAction()"
      [secondaryAction]="state.transitionSecondaryAction"
      (primaryActionClick)="state.confirmTransition()"
      (secondaryActionClick)="state.closeTransition()"
      (closed)="state.closeTransition()"
    >
      <div class="confirmation-content">
        <p>{{ state.transitionCopy() }}</p>
      </div>
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
export class RecoveryTransitionDialogComponent {
  protected readonly state = inject(RecoveriesService);
}
