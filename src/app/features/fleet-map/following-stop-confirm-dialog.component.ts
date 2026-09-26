import { Component, inject } from '@angular/core';
import { Modal } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetMapService } from './fleet-map.service';

/**
 * Confirmación antes de dejar de seguir una unidad (o cerrar un grupo de
 * seguimiento entero) — pedido explícito de Enzo: un clic en la "x" puede
 * ser un error, y con un grupo lleno cerrar la celda equivocada obliga a
 * volver a buscar y reabrir esa unidad. Mismo patrón que
 * `recovery-confirm-dialog.component.ts` (`cs-modal` con acción
 * primaria/secundaria), montado en `fleet-map.page.ts` porque la
 * confirmación puede dispararse desde cualquier pestaña de seguimiento
 * (siempre visibles en la barra) o desde dentro de la vista activa.
 */
@Component({
  selector: 'app-following-stop-confirm-dialog',
  imports: [Modal],
  template: `
    <cs-modal
      class="capture-surface-modal"
      [isOpen]="!!state.pendingStopTarget()"
      [title]="state.stopFollowingConfirmTitle()"
      appearance="warning"
      width="sm"
      [primaryAction]="{ label: 'Sí, dejar de seguir' }"
      [secondaryAction]="{ label: 'Cancelar' }"
      (primaryActionClick)="state.confirmStopFollowing()"
      (secondaryActionClick)="state.cancelStopFollowing()"
      (closed)="state.cancelStopFollowing()"
    >
      <p>{{ state.stopFollowingConfirmCopy() }}</p>
    </cs-modal>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
    `,
  ],
})
export class FollowingStopConfirmDialogComponent {
  protected readonly state = inject(FleetMapService);
}
