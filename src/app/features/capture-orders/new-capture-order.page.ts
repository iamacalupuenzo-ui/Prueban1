import { Component, inject } from '@angular/core';
import { Button, Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from './capture-orders.service';
import { CaptureOrderDetailDrawerComponent } from './capture-order-detail-drawer.component';
import { CaptureOrderTableComponent } from './capture-order-table.component';
import { CaptureOrderToolbarComponent } from './capture-order-toolbar.component';
import { CaptureOrderAnnulDialogComponent } from './dialogs/capture-order-annul-dialog.component';
import { CaptureOrderBulkUploadDialogComponent } from './dialogs/capture-order-bulk-upload-dialog.component';
import { CaptureOrderCloseDialogComponent } from './dialogs/capture-order-close-dialog.component';
import { CaptureOrderFormDialogComponent } from './dialogs/capture-order-form-dialog.component';
import { CaptureOrderObservationDialogComponent } from './dialogs/capture-order-observation-dialog.component';

/**
 * Shell de la pantalla de Capturas. Orquesta el layout de la matriz,
 * inyecta `CaptureOrdersService` (única fuente de estado de la pantalla) y
 * compone la toolbar, la tabla, el drawer de detalle y los cinco diálogos.
 *
 * Historial: hasta el 20 de septiembre de 2026 este archivo concentraba
 * ~2750 líneas (filtros, tabla, formulario, cinco diálogos y sus estilos).
 * Ver `docs/arquitectura-new-capture-order.md` para el detalle del split y
 * el registro de decisiones de ejecución.
 */
@Component({
  imports: [
    Button,
    CaptureOrderAnnulDialogComponent,
    CaptureOrderBulkUploadDialogComponent,
    CaptureOrderCloseDialogComponent,
    CaptureOrderDetailDrawerComponent,
    CaptureOrderFormDialogComponent,
    CaptureOrderObservationDialogComponent,
    CaptureOrderTableComponent,
    CaptureOrderToolbarComponent,
    Icon,
  ],
  template: `
    <main class="capture-matrix" aria-labelledby="capture-title">
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
      <section class="matrix-section" aria-labelledby="capture-title">
        <header class="page-header">
          <div class="page-header__content">
            <h1 id="capture-title">Capturas</h1>
            <p class="page-header__description">
              Consulta y gestiona las órdenes de captura registradas para las unidades.
            </p>
          </div>
          <div class="page-header__actions">
            <cs-button variant="default" size="sm" (click)="state.openBulkUpload()"
              ><cs-icon name="layers" [size]="16" aria-hidden="true" />Carga masiva de
              capturas</cs-button
            ><cs-button variant="primary" size="sm" (click)="state.openForm()"
              ><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar captura</cs-button
            >
          </div>
        </header>
        <app-capture-order-toolbar />
        <app-capture-order-table />
      </section>
      <app-capture-order-form-dialog />
      <app-capture-order-bulk-upload-dialog />
      <app-capture-order-close-dialog />
      <app-capture-order-detail-drawer />
      <app-capture-order-annul-dialog />
      <app-capture-order-observation-dialog />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
      .capture-matrix {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: var(--layout-padding-5xl);
        /* Exploración visual: tono cálido inspirado en la referencia compartida. */
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
        .capture-matrix {
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
        .capture-matrix {
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
export class NewCaptureOrderPage {
  protected readonly state = inject(CaptureOrdersService);

  constructor() {
    void this.state.loadFixtureOrders();
  }
}
