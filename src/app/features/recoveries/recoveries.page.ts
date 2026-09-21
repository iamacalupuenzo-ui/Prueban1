import { Component, inject } from '@angular/core';
import { Button, Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveriesService } from './recoveries.service';
import { RecoveriesDetailDrawerComponent } from './recoveries-detail-drawer.component';
import { RecoveriesTableComponent } from './recoveries-table.component';
import { RecoveriesToolbarComponent } from './recoveries-toolbar.component';
import { RecoveryConfirmDialogComponent } from './dialogs/recovery-confirm-dialog.component';
import { RecoveryCreateDialogComponent } from './dialogs/recovery-create-dialog.component';
import { RecoveryEditDialogComponent } from './dialogs/recovery-edit-dialog.component';

/**
 * Shell de la pantalla de Recuperos. Orquesta el layout de la matriz, inyecta
 * `RecoveriesService` (única fuente de estado de la pantalla) y compone la
 * toolbar, la tabla, el drawer de detalle y los tres diálogos. Mismo patrón
 * que `new-capture-order.page.ts`, sin lógica de negocio propia — ver
 * `docs/plan-construccion-recuperos.md` para el alcance del módulo. No hay
 * acción de carga masiva: solo "Registrar recupero" como acción primaria.
 */
@Component({
  imports: [
    Button,
    Icon,
    RecoveriesDetailDrawerComponent,
    RecoveriesTableComponent,
    RecoveriesToolbarComponent,
    RecoveryConfirmDialogComponent,
    RecoveryCreateDialogComponent,
    RecoveryEditDialogComponent,
  ],
  template: `
    <main class="recovery-matrix" aria-labelledby="recovery-title">
      @if (state.message()) {
        <div
          class="feedback-toast"
          [class.is-error]="state.messageKind() === 'error'"
          [class.is-info]="state.messageKind() === 'info'"
          [attr.role]="state.messageKind() === 'error' ? 'alert' : 'status'"
          aria-live="polite"
        >
          <cs-icon
            [name]="
              state.messageKind() === 'error'
                ? 'circle-alert'
                : state.messageKind() === 'info'
                  ? 'circle-help'
                  : 'circle-check'
            "
            [size]="20"
            aria-hidden="true"
          />
          <p>{{ state.message() }}</p>
          <button
            type="button"
            class="feedback-toast__close"
            aria-label="Cerrar notificación"
            (click)="state.dismissMessage()"
          >
            <cs-icon name="x" [size]="16" aria-hidden="true" />
          </button>
        </div>
      }
      <section class="matrix-section" aria-labelledby="recovery-title">
        <header class="page-header">
          <div class="page-header__content">
            <h1 id="recovery-title">Recuperos</h1>
            <p class="page-header__description">
              Consulta y gestiona las órdenes de recupero registradas para las unidades.
            </p>
          </div>
          <div class="page-header__actions">
            <cs-button variant="primary" size="sm" (click)="state.openCreate()"
              ><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar recupero</cs-button
            >
          </div>
        </header>
        <app-recoveries-toolbar />
        <app-recoveries-table />
      </section>
      <app-recovery-create-dialog />
      <app-recovery-edit-dialog />
      <app-recovery-confirm-dialog />
      <app-recoveries-detail-drawer />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
      .recovery-matrix {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: var(--layout-padding-5xl);
        background: #f8f5ed;
      }
      .page-header,
      .page-header__actions {
        display: flex;
        align-items: center;
      }
      .page-header {
        justify-content: space-between;
        gap: var(--layout-gap-xl);
        margin-bottom: var(--layout-gap-xs);
      }
      .page-header__content {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .page-header__actions {
        gap: var(--layout-gap-md);
      }
      h1,
      p {
        margin: 0;
      }
      h1 {
        color: var(--color-text-base-default);
        font-family: var(--font-family-heading);
        font-size: var(--font-size-heading-small);
        line-height: var(--font-line-height-heading-small);
      }
      .page-header__description {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .matrix-section {
        display: grid;
        grid-template-rows: auto auto auto minmax(min-content, 1fr);
        flex: 1;
        gap: var(--layout-gap-2xl);
      }
      .feedback-toast {
        position: fixed;
        top: var(--layout-padding-2xl);
        right: var(--layout-padding-2xl);
        z-index: var(--elevation-z-index-toast);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: start;
        gap: var(--layout-gap-md);
        width: min(420px, calc(100vw - var(--layout-padding-4xl)));
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-success-default);
        border-radius: var(--radius-lg);
        background: var(--color-background-success-subtlest);
        box-shadow: var(--shadow-xl);
        color: var(--color-text-success-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .feedback-toast > p {
        margin: 0;
      }
      .feedback-toast.is-error {
        border-color: var(--color-border-danger-default);
        background: var(--color-background-danger-subtlest);
        color: var(--color-text-danger-default);
      }
      .feedback-toast.is-info {
        border-color: var(--color-border-brand-default);
        background: var(--color-background-brand-subtlest);
        color: var(--color-text-brand-default);
      }
      .feedback-toast__close {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .feedback-toast__close:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      @media (max-width: 960px) {
        .recovery-matrix {
          padding-inline: var(--layout-padding-3xl);
        }
        .page-header {
          align-items: stretch;
          flex-direction: column;
        }
        .page-header__actions {
          justify-content: flex-start;
        }
      }
      @media (max-width: 767px) {
        .recovery-matrix {
          padding: var(--layout-padding-xl);
        }
        .page-header__actions {
          align-items: stretch;
          flex-direction: column;
        }
        .page-header cs-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class RecoveriesPage {
  protected readonly state = inject(RecoveriesService);

  constructor() {
    void this.state.loadFixtureOrders();
  }
}
