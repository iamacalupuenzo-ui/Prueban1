import { Component, inject } from '@angular/core';
import { Button, Icon, Tag } from '@iamacalupuenzo-ui/comsatel-ds';
import { SideDrawerComponent } from '../../shared/side-drawer.component';
import { CaptureOrdersService } from './capture-orders.service';

/**
 * Drawer de detalle de una orden de captura. Extraído de
 * `new-capture-order.page.ts` (el `app-side-drawer` de detalle, líneas
 * ~993-1139 del archivo original). Usa `shared/side-drawer.component.ts`
 * igual que antes; el estado de qué orden está seleccionada y si el drawer
 * está abierto vive en `CaptureOrdersService` porque la tabla (quien abre
 * el detalle) y este drawer son componentes hermanos, no padre/hijo.
 */
@Component({
  selector: 'app-capture-order-detail-drawer',
  imports: [Button, Icon, SideDrawerComponent, Tag],
  template: `
    <app-side-drawer
      [isOpen]="state.detailsOpen()"
      [title]="state.detailsTitle()"
      surface="canvas"
      (closed)="state.closeDetails()"
    >
      @if (state.selectedOrder(); as order) {
        <div class="details-content">
          <section class="detail-section" aria-labelledby="detail-information-title">
            <h3 id="detail-information-title">Información de la orden</h3>
            <dl class="detail-data">
              <div>
                <dt>Unidad</dt>
                <dd class="detail-data__unit">
                  <cs-icon [name]="state.unitIconOf(order.unitCode)" [size]="16" aria-hidden="true" />
                  {{ order.unitCode }}
                </dd>
              </div>
              <div>
                <dt>Propietario</dt>
                <dd>{{ state.ownerOf(order.unitCode) }}</dd>
              </div>
              <div>
                <dt>Fuente de la orden</dt>
                <dd>{{ order.source }}</dd>
              </div>
              <div>
                <dt>Expediente</dt>
                <dd>{{ order.caseNumber }}</dd>
              </div>
              <div>
                <dt>Fecha de recepción</dt>
                <dd>{{ state.formatReceivedDate(order.receivedOn) }}</dd>
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
                  <dt>Motivo de anulación</dt>
                  <dd>{{ order.annulmentReason }}</dd>
                </div>
              }
              @if (order.observationReason) {
                <div class="detail-data__full-width">
                  <dt>Observación</dt>
                  <dd>{{ order.observationReason }}</dd>
                </div>
              }
            </dl>
          </section>

          <section class="detail-section detail-location" aria-labelledby="detail-location-title">
            <div class="detail-location__header">
              <h3 id="detail-location-title">Última ubicación</h3>
              <span
                class="detail-location__history"
                aria-label="Historial de ubicaciones: próximamente disponible"
              >
                <cs-icon name="history" [size]="16" aria-hidden="true" />Historial
              </span>
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
                    (keydown.space)="$event.preventDefault(); state.copyLastLocation(location.lastLocation)"
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

          <section class="detail-actions" aria-labelledby="detail-actions-title">
            <h3 id="detail-actions-title">Acciones disponibles</h3>
            <div>
              @if (state.canClose(order)) {
                <cs-button variant="default" size="sm" (click)="state.closeFromDetails(order)">
                  <cs-icon name="lock" [size]="16" aria-hidden="true" />Cerrar captura
                </cs-button>
              }
              @if (state.canObserve(order)) {
                <cs-button variant="default" size="sm" (click)="state.observeFromDetails(order)">
                  <cs-icon name="alert-triangle" [size]="16" aria-hidden="true" />Observar captura
                </cs-button>
              }
              @if (state.canAnnul(order)) {
                <cs-button variant="destructive" size="sm" (click)="state.annulFromDetails(order)">
                  <cs-icon name="x" [size]="16" aria-hidden="true" />Anular captura
                </cs-button>
              }
              @if (!state.canClose(order) && !state.canObserve(order) && !state.canAnnul(order)) {
                <p>No hay acciones disponibles para el estado actual.</p>
              }
            </div>
          </section>

          <section class="status-timeline" aria-labelledby="status-timeline-title">
            <h3 id="status-timeline-title">Historial de la orden</h3>
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
      }
    </app-side-drawer>
  `,
  styles: [
    `
      :host {
        display: contents;
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
}
