import { Component, effect, inject, input } from '@angular/core';
import type { FleetUnit } from '../../core/fleet/fleet-telemetry.service';
import { CaptureOrderInfoCardComponent } from './capture-order-info-card.component';
import { FleetMapCanvasComponent } from './fleet-map-canvas.component';
import { FleetMapService } from './fleet-map.service';

/**
 * "Seguir unidad" — mapa a pantalla completa centrado únicamente en la
 * unidad seleccionada, sin el resto de información de Bitácora (posiciones,
 * eventos del viaje, panel de orden). Vive en su propia pestaña (ver
 * `fleet-map-tabs.component.ts`/`fleet-map.service.ts#openFollow`),
 * independiente de Bitácora.
 *
 * A pedido de Enzo (23 sep. 2026): "el problema con ver bitácora es que me
 * arroja mucha información que no necesito... lo único que quieren es ver a
 * la unidad cómo se mueve". `app-fleet-map-canvas` ya centra el mapa en
 * `FleetMapService.selectedUnit()` cada vez que cambia (ver su constructor)
 * — al abrir esta pestaña la unidad queda seleccionada
 * (`FleetMapService.openFollow`), así que el mapa la sigue automáticamente
 * si su posición se actualiza, sin lógica extra acá.
 *
 * La misma tarjeta "Información de la orden" que aparece al seleccionar una
 * unidad en el mapa principal se lleva a esta vista — a pedido de Enzo
 * (23 sep. 2026) — reutilizando `app-capture-order-info-card` en vez de
 * duplicar su contenido, con `side="left"` porque acá no compite con el
 * buscador flotante (que solo existe en el mapa principal). Esa tarjeta lee
 * `FleetMapService.selectedUnit()`, así que el effect de abajo mantiene la
 * selección sincronizada con la unidad de esta pestaña — necesario porque
 * cambiar de pestaña con la barra superior no pasa por `openFollow()`.
 */
@Component({
  selector: 'app-follow-unit-view',
  imports: [CaptureOrderInfoCardComponent, FleetMapCanvasComponent],
  template: `
    <div class="follow-view">
      <app-fleet-map-canvas [units]="[unit()]" />
      <app-capture-order-info-card side="left" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
        inline-size: 100%;
      }
      .follow-view {
        position: relative;
        block-size: 100%;
        inline-size: 100%;
        overflow: hidden;
        border-radius: var(--radius-lg);
      }
      .follow-view app-fleet-map-canvas {
        position: absolute;
        inset: 0;
      }
    `,
  ],
})
export class FollowUnitViewComponent {
  readonly unit = input.required<FleetUnit>();
  private readonly state = inject(FleetMapService);

  constructor() {
    effect(() => this.state.selectUnit(this.unit()));
  }
}
