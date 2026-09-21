import { Component, inject } from '@angular/core';
import { Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveriesService } from '../recoveries.service';

/**
 * Confirmación compartida del registro y la edición de un recupero.
 * Equivalente al `cs-modal` de confirmación que Capturas mantiene dentro de
 * `capture-order-form-dialog.component.ts`; aquí vive aparte porque el plan
 * de Recuperos separa creación, edición y confirmación en tres archivos
 * (`docs/plan-construccion-recuperos.md`). Reutiliza
 * `.capture-surface-modal`, la misma clase de utilidad que ya usan los
 * modales de Capturas para la superficie crema (`styles.css:174-180`) — el
 * nombre viene de ahí, pero el efecto (fondo `--elevation-surface-overlay`
 * local) no es exclusivo de Capturas.
 */
@Component({
  selector: 'app-recovery-confirm-dialog',
  imports: [Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="state.confirmationOpen()"
      [title]="state.confirmationTitle()"
      width="sm"
      [primaryAction]="state.confirmationPrimaryAction()"
      [secondaryAction]="state.confirmationSecondaryAction"
      (primaryActionClick)="state.confirmSubmission()"
      (secondaryActionClick)="state.closeConfirmation()"
      (closed)="state.closeConfirmation()"
    >
      <div class="confirmation-content">
        <p>{{ state.confirmationCopy() }}</p>
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
export class RecoveryConfirmDialogComponent {
  protected readonly state = inject(RecoveriesService);
}
