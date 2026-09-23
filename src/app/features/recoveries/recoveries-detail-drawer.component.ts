import { Component, effect, inject, signal } from '@angular/core';
import { Button, Icon, Tab, Tabs, Tag } from '@iamacalupuenzo-ui/comsatel-ds';
import { SideDrawerComponent } from '../../shared/side-drawer.component';
import { RecoveriesService } from './recoveries.service';

/**
 * Drawer de detalle de una orden de recupero. Mismo patrón que
 * `capture-order-detail-drawer.component.ts`: usa `shared/side-drawer.component.ts`
 * y las clases globales `.details-content`/`.detail-data`/`.detail-location`/
 * `.detail-actions` de `styles.css`, así que no repite esos estilos aquí — solo
 * la línea de tiempo (`.status-timeline`), que tampoco Capturas comparte.
 * El estado de qué orden está seleccionada vive en `RecoveriesService` porque
 * la tabla (quien abre el detalle) y este drawer son componentes hermanos.
 *
 * A diferencia de Capturas, el contenido se divide en dos `cs-tab`
 * ("Información" e "Historial"): con las transiciones de ciclo de vida que
 * agrega `RecoveriesService`, el historial de una orden puede crecer bastante
 * y no tiene sentido que empuje las acciones fuera de la vista inicial. Cuál
 * pestaña está activa es UI local del drawer — se reinicia a "Información"
 * cada vez que cambia la orden seleccionada para no dejar a alguien viendo el
 * historial de un registro distinto sin darse cuenta.
 */
@Component({
  selector: 'app-recoveries-detail-drawer',
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
          <cs-tab class="recoveries-detail-tab" value="info" label="Información">
            <div class="details-content">
          <section class="detail-section" aria-labelledby="detail-information-title">
            <h3 id="detail-information-title">Información del recupero</h3>
            <dl class="detail-data">
              <div>
                <dt>Unidad</dt>
                <dd class="detail-data__unit">
                  <cs-icon [name]="state.unitIconOf(order.unitCode)" [size]="16" aria-hidden="true" />
                  {{ order.unitCode }}
                </dd>
              </div>
              <div>
                <dt>GPS</dt>
                <dd>{{ state.hasGpsOf(order.unitCode) ? 'Disponible' : 'No disponible' }}</dd>
              </div>
              <div>
                <dt>Fuente de solicitud</dt>
                <dd>{{ state.sourceLabelOf(order.sourceType) }} — {{ order.sourceName }}</dd>
              </div>
              <div>
                <dt>Seguro</dt>
                <dd>{{ order.insurerName }}</dd>
              </div>
              <div>
                <dt>Tipo de servicio</dt>
                <dd>{{ order.serviceType }}</dd>
              </div>
              <div>
                <dt>Modalidad de robo</dt>
                <dd>
                  <cs-tag
                    [value]="order.theftModality"
                    [severity]="state.theftModalitySeverity(order.theftModality)"
                    [icon]="state.theftModalityIcon(order.theftModality)"
                    [rounded]="true"
                    size="lg"
                  />
                </dd>
              </div>
              <div>
                <dt>{{ state.referenceLabel(order.sourceType) }}</dt>
                <dd>{{ order.referenceNumber }}</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{{ order.contactName }} · {{ order.contactPhone }}</dd>
              </div>
              <div>
                <dt>Fecha de recuperación</dt>
                <dd>{{ state.recoveredLabel(order) }}</dd>
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
              @if (order.operationalNotes) {
                <div class="detail-data__full-width">
                  <dt>Datos operativos</dt>
                  <dd>{{ order.operationalNotes }}</dd>
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
                  <strong>Sin GPS disponible</strong>
                  <span>Esta unidad no reporta telemetría GPS.</span>
                }
              </div>
            </div>
          </section>

          <section class="detail-actions detail-actions--last" aria-labelledby="detail-actions-title">
            <h3 id="detail-actions-title">Acciones disponibles</h3>
            <div>
              @if (state.canEdit(order)) {
                <cs-button variant="default" size="sm" (click)="state.editFromDetails(order)">
                  <cs-icon name="pencil" [size]="16" aria-hidden="true" />Editar recupero
                </cs-button>
              }
              @if (state.canAdvanceToManagement(order)) {
                <cs-button
                  variant="default"
                  size="sm"
                  (click)="state.advanceToManagementFromDetails(order)"
                >
                  <cs-icon name="route" [size]="16" aria-hidden="true" />Pasar a gestión
                </cs-button>
              }
              @if (state.canMarkRecovered(order)) {
                <cs-button variant="default" size="sm" (click)="state.markRecoveredFromDetails(order)">
                  <cs-icon name="check-circle-2" [size]="16" aria-hidden="true" />Marcar como
                  recuperado
                </cs-button>
              }
              @if (state.canClose(order)) {
                <cs-button variant="default" size="sm" (click)="state.closeFromDetails(order)">
                  <cs-icon name="lock" [size]="16" aria-hidden="true" />Cerrar recupero
                </cs-button>
              }
              @if (state.canAnnul(order)) {
                <cs-button variant="destructive" size="sm" (click)="state.annulFromDetails(order)">
                  <cs-icon name="x" [size]="16" aria-hidden="true" />Anular recupero
                </cs-button>
              }
              @if (
                !state.canEdit(order) &&
                !state.canAdvanceToManagement(order) &&
                !state.canMarkRecovered(order) &&
                !state.canClose(order) &&
                !state.canAnnul(order)
              ) {
                <p>No hay acciones disponibles para el estado actual.</p>
              }
            </div>
          </section>
            </div>
          </cs-tab>
          <cs-tab class="recoveries-detail-tab" value="historial" label="Historial">
            <div class="details-content">
              <section class="status-timeline" aria-labelledby="status-timeline-title">
                <h3 id="status-timeline-title">Historial del recupero</h3>
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
      /* En Capturas "Acciones disponibles" precede a más contenido; aquí, con
         Historial en su propia pestaña, es la última sección del tab
         "Información" — el borde inferior de .detail-actions (global,
         compartido con Capturas) queda huérfano sin nada que separar. */
      .detail-actions.detail-actions--last {
        border-block-end: 0;
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
export class RecoveriesDetailDrawerComponent {
  protected readonly state = inject(RecoveriesService);
  protected readonly activeTab = signal('info');

  constructor() {
    effect(() => {
      this.state.selectedOrder();
      this.activeTab.set('info');
    });
  }
}
