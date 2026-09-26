import { Component, effect, inject, signal } from '@angular/core';
import { Button, Icon, Tab, Tabs, Tag } from '@iamacalupuenzo-ui/comsatel-ds';
import { CAPTURE_DOCUMENT_DEFINITIONS } from '../../core/orders/mock-capture-orders.service';
import { SideDrawerComponent } from '../../shared/side-drawer.component';
import { CaptureOrdersService } from './capture-orders.service';

/**
 * Drawer de detalle de una orden de captura. Mismo patrón que
 * `recoveries-detail-drawer.component.ts`: dos `cs-tab` ("Información" e
 * "Historial") en vez de una sola vista larga — el historial de una orden
 * puede crecer bastante (cada reconciliación de carga masiva agrega
 * entradas) y no debe empujar las acciones fuera de la vista inicial. Qué
 * pestaña está activa es UI local del drawer, se reinicia a "Información"
 * cada vez que cambia la orden seleccionada.
 */
@Component({
  selector: 'app-capture-order-detail-drawer',
  imports: [Button, Icon, SideDrawerComponent, Tab, Tabs, Tag],
  template: `
    <app-side-drawer
      [isOpen]="state.detailsOpen()"
      [title]="state.detailsTitle()"
      surface="canvas"
      (closed)="state.closeDetails()"
    >
      @if (state.selectedOrder(); as order) {
        <cs-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
          <cs-tab class="capture-detail-tab" value="info" label="Información">
            <div class="details-content">
              <section class="detail-section" aria-label="Información de la orden">
                <dl class="detail-data">
                  <div>
                    <dt>Placa</dt>
                    <dd class="detail-data__unit">
                      <cs-icon
                        [name]="state.unitIconOf(order.unitCode)"
                        [size]="16"
                        aria-hidden="true"
                      />
                      {{ order.unitCode }}
                    </dd>
                  </div>
                  <div>
                    <dt>Financiera</dt>
                    <dd>{{ order.financiera }}</dd>
                  </div>
                  <div>
                    <dt>Motor</dt>
                    <dd>{{ state.engineCodeOf(order.unitCode) }}</dd>
                  </div>
                  <div>
                    <dt>Contrato</dt>
                    <dd>
                      <cs-tag
                        [value]="state.contractStatusOf(order.unitCode)"
                        [severity]="state.contractStatusSeverity(state.contractStatusOf(order.unitCode))"
                        [rounded]="true"
                        size="lg"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Expediente</dt>
                    <dd>{{ order.caseNumber }}</dd>
                  </div>
                  <div>
                    <dt>Fecha de registro</dt>
                    <dd>{{ state.createdDateLabel(order.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      <cs-tag
                        [value]="order.status"
                        [severity]="state.statusSeverity(order.status)"
                        [rounded]="true"
                        size="lg"
                      />
                    </dd>
                  </div>
                  @if (order.annulmentReason) {
                    <div class="detail-data__full-width">
                      <dt>Motivo de paralización</dt>
                      <dd>{{ order.annulmentReason }}</dd>
                    </div>
                  }
                  @if (order.observationReason) {
                    <div class="detail-data__full-width">
                      <dt>Observación</dt>
                      <dd class="detail-data__editable">
                        {{ order.observationReason }}
                        <button
                          type="button"
                          class="detail-data__edit"
                          aria-label="Editar observación"
                          (click)="state.openEditObservation(order)"
                        >
                          <cs-icon name="pencil" [size]="12" aria-hidden="true" />
                        </button>
                      </dd>
                    </div>
                  }
                  @if (order.status === 'Capturado') {
                    @if (order.capturedAt) {
                      <div>
                        <dt>Fecha de captura</dt>
                        <dd>{{ state.createdDateLabel(order.capturedAt) }}</dd>
                      </div>
                    }
                    @if (order.captureOfficer) {
                      <div>
                        <dt>Responsable de la captura</dt>
                        <dd class="detail-data__editable">
                          {{ order.captureOfficer }}
                          <button
                            type="button"
                            class="detail-data__edit"
                            aria-label="Editar responsable y ubicación de la captura"
                            (click)="state.openEditCaptureDetails(order)"
                          >
                            <cs-icon name="pencil" [size]="12" aria-hidden="true" />
                          </button>
                        </dd>
                      </div>
                    }
                    @if (order.captureLocation) {
                      <div>
                        <dt>Ubicación de la captura</dt>
                        <dd>{{ order.captureLocation }}</dd>
                      </div>
                    }
                  }
                </dl>
              </section>

              <section class="detail-section detail-documents" aria-labelledby="detail-documents-title">
                <h3 id="detail-documents-title">Documentos de respaldo</h3>
                <ul class="detail-documents-list">
                  @for (definition of documentDefinitions; track definition.type) {
                    <li class="detail-documents-list__item">
                      <button
                        type="button"
                        class="documents-checklist__box"
                        role="checkbox"
                        [attr.aria-checked]="state.hasDocument(order, definition.type)"
                        [attr.aria-label]="
                          (state.hasDocument(order, definition.type) ? 'Quitar ' : 'Marcar ') +
                          definition.label
                        "
                        (click)="state.toggleDocumentMark(order, definition.type)"
                      >
                        @if (state.hasDocument(order, definition.type)) {
                          <cs-icon name="check" [size]="12" aria-hidden="true" />
                        }
                      </button>
                      <span>{{ definition.label }}</span>
                    </li>
                  }
                </ul>
              </section>

              <section class="detail-section detail-location" aria-labelledby="detail-location-title">
                <div class="detail-location__header">
                  <h3 id="detail-location-title">Última ubicación</h3>
                  <div class="detail-location__header-actions">
                    <span
                      class="detail-location__history"
                      aria-label="Historial de ubicaciones: próximamente disponible"
                    >
                      <cs-icon name="history" [size]="16" aria-hidden="true" />Historial
                    </span>
                  </div>
                </div>
                <div class="detail-location__value">
                  <cs-icon name="map-pin" [size]="18" aria-hidden="true" />
                  <div>
                    @if (state.locationOf(order.unitCode); as location) {
                      <span
                        class="detail-location__address copy-on-hover"
                        role="button"
                        tabindex="0"
                        [attr.aria-label]="
                          state.copiedLocation() === location.lastLocation
                            ? 'Ubicación copiada'
                            : 'Copiar última ubicación'
                        "
                        (click)="state.copyLastLocation(location.lastLocation)"
                        (keydown.enter)="state.copyLastLocation(location.lastLocation)"
                        (keydown.space)="
                          $event.preventDefault(); state.copyLastLocation(location.lastLocation)
                        "
                      >
                        {{ location.lastLocation }}
                        <cs-icon name="copy" [size]="12" aria-hidden="true" />
                      </span>
                      <span>Última posición disponible para la unidad.</span>
                    } @else {
                      <strong>Sin posición disponible</strong>
                      <span>La telemetría no reporta una posición para esta unidad.</span>
                    }
                  </div>
                </div>
              </section>

              <section class="detail-actions detail-actions--last" aria-labelledby="detail-actions-title">
                <h3 id="detail-actions-title">Acciones disponibles</h3>
                <div>
                  @if (state.canClose(order)) {
                    <cs-button variant="default" size="sm" (click)="state.closeFromDetails(order)">
                      <cs-icon name="lock" [size]="16" aria-hidden="true" />Marcar como capturado
                    </cs-button>
                  }
                  @if (state.canObserve(order)) {
                    <cs-button variant="default" size="sm" (click)="state.observeFromDetails(order)">
                      <cs-icon name="alert-triangle" [size]="16" aria-hidden="true" />Observar
                      captura
                    </cs-button>
                  }
                  @if (state.canRevertToPending(order)) {
                    <cs-button variant="default" size="sm" (click)="state.revertFromDetails(order)">
                      <cs-icon name="circle-dot" [size]="16" aria-hidden="true" />Volver a
                      pendiente
                    </cs-button>
                  }
                  @if (state.canAnnul(order)) {
                    <cs-button variant="destructive" size="sm" (click)="state.annulFromDetails(order)">
                      <cs-icon name="x" [size]="16" aria-hidden="true" />Paralizar captura
                    </cs-button>
                  }
                  @if (
                    !state.canClose(order) &&
                    !state.canObserve(order) &&
                    !state.canRevertToPending(order) &&
                    !state.canAnnul(order)
                  ) {
                    <p>No hay acciones disponibles para el estado actual.</p>
                  }
                </div>
              </section>
            </div>
          </cs-tab>
          <cs-tab class="capture-detail-tab" value="historial" label="Historial">
            <div class="details-content">
              <section class="status-timeline" aria-label="Historial de la orden">
                <ol>
                  @for (
                    entry of state.statusEntries(order);
                    track entry.action + entry.at;
                    let isCurrent = $last
                  ) {
                    <li [class.is-current]="isCurrent">
                      <span class="status-timeline__marker" aria-hidden="true"></span>
                      <div class="status-timeline__entry">
                        <div class="status-timeline__heading">
                          <strong>{{ entry.action }}</strong>
                          <time>{{ entry.at }}</time>
                        </div>
                        <span>{{ entry.detail }}</span>
                      </div>
                    </li>
                  }
                </ol>
              </section>
            </div>
          </cs-tab>
        </cs-tabs>
      }
    </app-side-drawer>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      /* Con Historial en su propia pestaña, "Acciones disponibles" es la
         última sección de "Información" — el borde inferior de
         .detail-actions (global, compartido con Recuperos) queda huérfano
         sin nada que separar. */
      .detail-actions.detail-actions--last {
        border-block-end: 0;
      }
      .detail-documents-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--layout-gap-md) var(--layout-gap-lg);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .detail-documents-list__item {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-sm);
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .detail-location__header-actions {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-md);
      }
      .detail-data__editable {
        display: inline-flex;
        align-items: center;
        gap: var(--layout-gap-2xs);
      }
      .detail-data__edit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-icon-neutral-subtlest);
        cursor: pointer;
      }
      .detail-data__edit:hover {
        color: var(--color-text-brand-default);
        background: var(--color-background-neutral-subtlest);
      }
      .detail-data__edit:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .status-timeline {
        display: grid;
        gap: var(--layout-gap-md);
      }
      .status-timeline ol {
        display: grid;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .status-timeline li {
        position: relative;
        display: grid;
        grid-template-columns: var(--layout-padding-xl) minmax(0, 1fr);
        column-gap: var(--layout-gap-md);
      }
      .status-timeline li:not(:last-child)::before {
        position: absolute;
        top: var(--layout-padding-lg);
        bottom: calc(var(--layout-padding-lg) * -1);
        left: calc(var(--layout-padding-sm) - var(--layout-border-thin));
        width: var(--layout-border-thin);
        background: var(--color-border-divider);
        content: '';
      }
      .status-timeline__marker {
        z-index: 1;
        align-self: start;
        box-sizing: border-box;
        display: block;
        width: var(--layout-padding-lg);
        height: var(--layout-padding-lg);
        margin-top: var(--layout-padding-2xs);
        border: var(--layout-border-thick) solid var(--color-border-neutral-default);
        border-radius: var(--radius-full);
        background: var(--elevation-surface-default);
      }
      .status-timeline li.is-current .status-timeline__marker {
        border-color: var(--color-border-brand-default);
        background: var(--color-background-brand-default);
      }
      .status-timeline__entry {
        display: grid;
        gap: var(--layout-gap-xs);
        padding-bottom: var(--layout-padding-xl);
      }
      .status-timeline__heading {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: var(--layout-gap-sm);
      }
      .status-timeline li:last-child .status-timeline__entry {
        padding-bottom: 0;
      }
      .status-timeline strong {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .status-timeline span,
      .status-timeline time {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
    `,
  ],
})
export class CaptureOrderDetailDrawerComponent {
  protected readonly state = inject(CaptureOrdersService);
  protected readonly documentDefinitions = CAPTURE_DOCUMENT_DEFINITIONS;
  protected readonly activeTab = signal('info');

  constructor() {
    effect(() => {
      this.state.selectedOrder();
      this.activeTab.set('info');
    });
  }
}
