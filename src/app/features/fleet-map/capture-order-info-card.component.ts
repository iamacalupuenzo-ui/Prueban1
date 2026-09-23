import { computed, Component, inject } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_DOCUMENT_DEFINITIONS,
  MockCaptureOrdersService,
  type CaptureContractStatus,
} from '../../core/orders/mock-capture-orders.service';
import { deviceInfoFor } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService } from './fleet-map.service';

/**
 * Contexto de captura de la unidad seleccionada. Los datos de la orden vienen
 * de la misma fuente simulada que la matriz de Capturas; los datos técnicos
 * siguen siendo los de telemetría mientras no exista integración de inventario.
 */
@Component({
  selector: 'app-capture-order-info-card',
  imports: [Icon],
  template: `
    @if (unit(); as selectedUnit) {
      <aside class="order-card" aria-labelledby="capture-order-title">
        <header class="order-card__header">
          <div>
            <p class="order-card__eyebrow">Unidad seleccionada</p>
            <h2 id="capture-order-title">Información de la orden</h2>
          </div>
          <button type="button" class="order-card__close" (click)="state.deselectUnit()" aria-label="Cerrar información de la orden">
            <cs-icon name="x" [size]="18" aria-hidden="true" />
          </button>
        </header>

        @if (captures.fixturesLoading()) {
          <p class="order-card__feedback" role="status">Cargando información de captura…</p>
        } @else if (captures.fixturesError()) {
          <p class="order-card__feedback" role="status">{{ captures.fixturesError() }}</p>
        } @else if (order(); as captureOrder) {
          <dl class="order-card__details">
            <div><dt>Placa</dt><dd class="order-card__plate"><cs-icon name="car" [size]="16" aria-hidden="true" />{{ captureOrder.unitCode }}</dd></div>
            <div><dt>Financiera</dt><dd>{{ captureOrder.financiera }}</dd></div>
            <div><dt>Motor</dt><dd>{{ deviceInfoFor(selectedUnit).engineCode }}</dd></div>
            <div><dt>Contrato</dt><dd><span class="contract-status" [class.contract-status--active]="contractStatus(selectedUnit) === 'Activo'" [class.contract-status--warn]="contractStatus(selectedUnit) === 'No vigente'">{{ contractStatus(selectedUnit) }}</span></dd></div>
            <div><dt>Propietario</dt><dd>{{ deviceInfoFor(selectedUnit).owner }}</dd></div>
            <div><dt>Expediente</dt><dd>{{ captureOrder.caseNumber }}</dd></div>
            <div><dt>Fecha de registro</dt><dd>{{ captureOrder.createdAt }}</dd></div>
            <div><dt>Estado</dt><dd><span class="capture-status" [class.capture-status--observed]="captureOrder.status === 'Observado'" [class.capture-status--complete]="captureOrder.status === 'Capturado'">{{ captureOrder.status }}</span></dd></div>
          </dl>

          <section class="order-card__documents" aria-labelledby="capture-documents-title">
            <h3 id="capture-documents-title">Documentos de respaldo</h3>
            <ul>
              @for (document of documents; track document.type) {
                <li><cs-icon [name]="hasDocument(captureOrder, document.type) ? 'check-square' : 'square'" [size]="18" aria-hidden="true" />{{ document.label }}</li>
              }
            </ul>
          </section>
        } @else {
          <p class="order-card__feedback" role="status">La unidad {{ selectedUnit.id }} no tiene una orden de captura registrada.</p>
        }
      </aside>
    }
  `,
  styles: [`
    :host { position: absolute; z-index: 500; top: var(--layout-padding-md); right: var(--layout-padding-md); display: block; inline-size: 408px; max-inline-size: calc(100% - 346px); pointer-events: none; }
    .order-card { pointer-events: auto; overflow: hidden; border: var(--layout-border-thin) solid var(--color-border-neutral-subtle); border-radius: var(--radius-md); background: #f8f5ed; box-shadow: var(--shadow-lg); color: var(--color-text-base-default); }
    .order-card__header { display: flex; align-items: start; justify-content: space-between; gap: var(--layout-gap-md); padding: var(--layout-padding-xl) var(--layout-padding-xl) var(--layout-padding-lg); }
    .order-card__eyebrow { margin: 0 0 var(--layout-gap-2xs); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); font-weight: var(--font-weight-accent); line-height: var(--font-line-height-content-note); }
    h2, h3, p { margin: 0; } h2 { font-size: var(--font-size-heading-xs); line-height: var(--font-line-height-heading-xs); font-weight: var(--font-weight-bold); } h3 { font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); font-weight: var(--font-weight-bold); }
    .order-card__close { display: grid; place-items: center; flex: 0 0 auto; inline-size: 32px; block-size: 32px; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-base-subtlest); cursor: pointer; }.order-card__close:hover { background: var(--color-background-neutral-subtle); color: var(--color-text-base-default); }.order-card__close:focus-visible { outline: var(--layout-border-thick) solid var(--color-border-focused); outline-offset: 2px; }
    .order-card__details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-lg) var(--layout-gap-xl); margin: 0; padding: 0 var(--layout-padding-xl) var(--layout-padding-xl); }.order-card__details div { min-inline-size: 0; }.order-card__details dt { margin-bottom: var(--layout-gap-2xs); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }.order-card__details dd { display: flex; align-items: center; gap: var(--layout-gap-xs); margin: 0; overflow-wrap: anywhere; font-size: var(--font-size-content-ui); font-weight: var(--font-weight-accent); line-height: var(--font-line-height-content-ui); }.order-card__plate { color: var(--color-text-brand-default); font-weight: var(--font-weight-bold) !important; }
    .contract-status, .capture-status { display: inline-flex; align-items: center; min-block-size: 24px; padding-inline: var(--layout-padding-sm); border: var(--layout-border-thin) solid var(--color-border-warning-default); border-radius: var(--radius-full); background: var(--color-background-warning-subtlest); color: var(--color-text-warning-default); font-size: var(--font-size-content-note); font-weight: var(--font-weight-accent); line-height: var(--font-line-height-content-note); }.contract-status--active { border-color: var(--color-border-success-default); background: var(--color-background-success-subtlest); color: var(--color-text-success-default); }.contract-status--warn { border-color: var(--color-border-warning-default); }.capture-status { border-color: var(--color-border-brand-default); background: var(--color-background-brand-subtlest); color: var(--color-text-brand-default); }.capture-status--observed { border-color: var(--color-border-warning-default); background: var(--color-background-warning-subtlest); color: var(--color-text-warning-default); }.capture-status--complete { border-color: var(--color-border-success-default); background: var(--color-background-success-subtlest); color: var(--color-text-success-default); }
    .order-card__documents { border-top: var(--layout-border-thin) solid var(--color-border-divider); padding: var(--layout-padding-lg) var(--layout-padding-xl) var(--layout-padding-xl); }.order-card__documents ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-sm) var(--layout-gap-lg); margin: var(--layout-gap-md) 0 0; padding: 0; list-style: none; }.order-card__documents li { display: flex; align-items: center; gap: var(--layout-gap-sm); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }.order-card__feedback { padding: 0 var(--layout-padding-xl) var(--layout-padding-xl); color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
    @media (max-width: 767px) { :host { top: auto; right: var(--layout-padding-sm); bottom: var(--layout-padding-sm); left: var(--layout-padding-sm); inline-size: auto; max-inline-size: none; }.order-card__details { gap: var(--layout-gap-md); }.order-card__header { padding: var(--layout-padding-lg); }.order-card__details { padding-inline: var(--layout-padding-lg); padding-bottom: var(--layout-padding-lg); }.order-card__documents { padding-inline: var(--layout-padding-lg); padding-bottom: var(--layout-padding-lg); } }
  `],
})
export class CaptureOrderInfoCardComponent {
  protected readonly state = inject(FleetMapService);
  protected readonly captures = inject(MockCaptureOrdersService);
  protected readonly unit = this.state.selectedUnit;
  protected readonly documents = CAPTURE_DOCUMENT_DEFINITIONS;
  protected readonly deviceInfoFor = deviceInfoFor;
  protected readonly order = computed(() => {
    const unit = this.unit();
    if (!unit) return null;
    const normalizedIds = new Set([unit.id, unit.vehicleCode].map((value) => value.toUpperCase()));
    return [...this.captures.orders(), ...this.captures.fixtureOrders()].find((candidate) => normalizedIds.has(candidate.unitCode.toUpperCase())) ?? null;
  });

  constructor() { void this.captures.loadFixtureOrders(); }

  protected hasDocument(order: { documents?: ReadonlyArray<{ type: string }> }, type: string): boolean {
    return (order.documents ?? []).some((document) => document.type === type);
  }
  protected contractStatus(unit: { id: string }): CaptureContractStatus {
    let seed = 0;
    for (const character of unit.id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
    return seed % 3 === 0 ? 'Sin contrato' : seed % 3 === 1 ? 'Activo' : 'No vigente';
  }
}
