import { Component, computed, inject, input, output } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { deviceInfoFor, type FleetUnit } from '../../core/fleet/fleet-telemetry.service';
import { CAPTURE_DOCUMENT_DEFINITIONS, MockCaptureOrdersService, sapContractStatusFor, type CaptureContractStatus } from '../../core/orders/mock-capture-orders.service';

/** Panel expandible de captura dentro de la Bitácora, sin salir del mapa. */
@Component({
  selector: 'app-capture-order-info-panel',
  imports: [Icon],
  template: `
    @if (isOpen() && unit(); as selectedUnit) {
      <aside class="order-panel" aria-labelledby="bitacora-info-title">
        <header class="order-panel__header"><cs-icon name="grip-vertical" [size]="14" aria-hidden="true" /><h3 id="bitacora-info-title">Información</h3></header>
        @if (captures.fixturesLoading()) { <p class="modal-feedback" role="status">Cargando información de captura…</p> }
        @else if (captures.fixturesError()) { <p class="modal-feedback" role="status">{{ captures.fixturesError() }}</p> }
        @else if (order(); as captureOrder) {
          <dl class="order-details">
            <div><dt>Fecha de registro</dt><dd>{{ captureOrder.createdAt }}</dd></div>
            <div><dt>Placa</dt><dd class="plate"><cs-icon name="car" [size]="16" aria-hidden="true" />{{ captureOrder.unitCode }}</dd></div>
            <div><dt>Motor</dt><dd>{{ deviceInfoFor(selectedUnit).engineCode }}</dd></div>
            <div><dt>Financiera</dt><dd>{{ captureOrder.financiera }}</dd></div>
            <div><dt>Contrato</dt><dd><span class="status status--contract">{{ contractStatus(selectedUnit) }}</span></dd></div>
            <div><dt>Estado</dt><dd><span class="status">{{ captureOrder.status }}</span></dd></div>
            <div class="order-details__documents"><dt>Documentos</dt><dd><strong>{{ readyDocumentsCount(captureOrder) }}/{{ totalDocuments }}</strong> Documentos listos</dd></div>
          </dl>
        } @else { <p class="modal-feedback" role="status">La unidad {{ selectedUnit.id }} no tiene una orden de captura registrada.</p> }
      </aside>
    }
  `,
  styles: [`
    :host { display: block; block-size: auto; min-block-size: 0; }
    .order-panel { block-size: auto; max-block-size: calc(100dvh - 120px); overflow: auto; padding: var(--layout-padding-lg); border: var(--layout-border-thin) solid var(--color-border-neutral-subtle); border-radius: var(--radius-md); background: var(--elevation-surface-default); }
    .order-panel__header { display: flex; align-items: center; gap: var(--layout-gap-xs); margin-bottom: var(--layout-padding-lg); color: var(--color-text-base-subtlest); }
    .order-panel__header h3 { margin: 0; font-size: var(--font-size-content-note); font-weight: var(--font-weight-emphasis); line-height: var(--font-line-height-content-note); letter-spacing: .04em; text-transform: uppercase; }
    .order-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-md); margin: 0; }
    .order-details div { min-inline-size: 0; }
    .order-details dt { margin-bottom: var(--layout-gap-2xs); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .order-details dd { display: flex; align-items: center; gap: var(--layout-gap-xs); margin: 0; overflow-wrap: anywhere; color: var(--color-text-base-default); font-size: var(--font-size-content-ui); font-weight: var(--font-weight-accent); line-height: var(--font-line-height-content-ui); }
    .order-details__documents { grid-column: 1 / -1; }
    .order-details__documents strong { font-weight: var(--font-weight-emphasis); }
    .plate { color: var(--color-text-brand-default); font-weight: var(--font-weight-bold) !important; }
    .status { display: inline-flex; min-block-size: 24px; align-items: center; padding-inline: var(--layout-padding-sm); border: var(--layout-border-thin) solid var(--color-border-brand-default); border-radius: var(--radius-full); background: var(--color-background-brand-subtlest); color: var(--color-text-brand-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .status--contract { border-color: var(--color-border-warning-default); background: var(--color-background-warning-subtlest); color: var(--color-text-warning-default); }
    .modal-feedback { margin: 0; color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
  `],
})
export class CaptureOrderInfoPanelComponent {
  readonly unit = input<FleetUnit | null>(null);
  readonly isOpen = input(false);
  readonly closed = output<void>();
  protected readonly captures = inject(MockCaptureOrdersService);
  protected readonly totalDocuments = CAPTURE_DOCUMENT_DEFINITIONS.length;
  protected readonly deviceInfoFor = deviceInfoFor;
  protected readonly order = computed(() => {
    const unit = this.unit();
    if (!unit) return null;
    const ids = new Set([unit.id, unit.vehicleCode].map((value) => value.toUpperCase()));
    return [...this.captures.orders(), ...this.captures.fixtureOrders()].find((candidate) => ids.has(candidate.unitCode.toUpperCase())) ?? null;
  });
  constructor() { void this.captures.loadFixtureOrders(); }
  protected readyDocumentsCount(order: { documents?: ReadonlyArray<{ type: string }> }): number {
    const attachedTypes = new Set((order.documents ?? []).map((document) => document.type));
    return CAPTURE_DOCUMENT_DEFINITIONS.filter((document) => attachedTypes.has(document.type)).length;
  }
  protected contractStatus(unit: FleetUnit): CaptureContractStatus {
    return sapContractStatusFor(unit.vehicleCode, deviceInfoFor(unit).engineCode);
  }
}
