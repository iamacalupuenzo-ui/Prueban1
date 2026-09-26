import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { FleetMapCanvasComponent } from './fleet-map-canvas.component';
import { FleetMapService } from './fleet-map.service';

const REORDER_ANIMATION_MS = 200;

/**
 * Contenido de UNA pestaña de "Seguimiento" — renderiza el grupo ACTIVO
 * (`FleetMapService.activeFollowingUnits`), hasta `MAX_UNITS_PER_FOLLOWING_GROUP`
 * unidades a la vez, cada una con su propio mini-mapa en vivo. El usuario
 * puede tener varios grupos de seguimiento abiertos en paralelo (una
 * pestaña por grupo, ver `fleet-map-tabs.component.ts`) — este componente
 * solo conoce el que está activo, igual que `bitacora-view.component.ts`
 * solo conoce la bitácora activa. Reemplaza la primera versión
 * (chip/mini-mapa flotando dentro del mapa principal, `fleet-map.page.ts`):
 * validado en vivo con Enzo (2026-09-25), un solo seguimiento cabía
 * flotando, pero varias a la vez necesitan el espacio real de una pestaña
 * propia — mismo patrón que Bitácora.
 *
 * Grilla pedida explícitamente (no genérica): siempre 2 columnas (salvo 1
 * sola unidad, que ocupa todo). Con 3, la primera prueba las apiló en 3
 * filas completas, pero en un monitor ancho quedaban muy achatadas —
 * ajustado a 2x2 con la tercera celda ocupando el ancho completo de la
 * fila de abajo. Con 4, 2x2 parejo.
 *
 * Título de celda: mismo estándar visual que "Posiciones"/"Información"/
 * "Eventos del viaje" de Bitácora (`bitacora-view.component.ts`) — ícono
 * `grip-vertical` + texto en mayúsculas. Acá el ícono además cumple una
 * segunda función: es el handle de arrastre para reordenar las celdas
 * (pedido explícito, "solo en Seguimiento") — Bitácora no lo necesita
 * porque sus secciones no se reordenan.
 *
 * El reordenamiento se aplica EN VIVO durante el arrastre (no solo al
 * soltar, pedido explícito para que "los otros contenedores se vayan
 * moviendo también"), con una animación FLIP manual: como CSS Grid no
 * anima solo por reordenar el DOM, se mide la posición de cada celda antes
 * y después del cambio y se anima la diferencia con `transform`.
 */
@Component({
  selector: 'app-following-view',
  imports: [FleetMapCanvasComponent, Icon],
  template: `
    <div #grid class="following-view" [style.grid-template-columns]="gridColumns()" [style.grid-template-rows]="gridRows()">
      @for (unit of state.activeFollowingUnits(); track unit.id; let i = $index) {
        <section
          class="following-view__cell"
          [class.following-view__cell--span]="state.activeFollowingUnits().length === 3 && i === 2"
          [attr.aria-label]="'Seguimiento de ' + unit.vehicleCode"
          (dragover)="onDragOver(i, $event)"
          (drop)="onDrop($event)"
        >
          <header
            class="following-view__cell-header"
            [class.following-view__cell-header--dragging]="draggedUnitId() === unit.id"
            draggable="true"
            (dragstart)="onDragStart(unit.id, $event)"
            (dragend)="onDragEnd()"
          >
            <cs-icon name="grip-vertical" [size]="14" aria-hidden="true" />
            <h3>{{ unit.name }} · {{ unit.vehicleCode }}</h3>
            <button type="button" aria-label="Dejar de seguir esta unidad" (click)="state.requestStopFollowing(unit)">
              <cs-icon name="x" [size]="14" aria-hidden="true" />
            </button>
          </header>
          <app-fleet-map-canvas class="following-view__cell-map" [units]="[unit]" [focusPosition]="unit.position" />
        </section>
      } @empty {
        <p class="following-view__empty">No hay unidades en seguimiento.</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
      }
      h3 {
        margin: 0;
      }
      .following-view {
        display: grid;
        gap: var(--layout-padding-md);
        box-sizing: border-box;
        block-size: 100%;
        inline-size: 100%;
        padding: var(--layout-padding-md);
      }
      .following-view__cell {
        position: relative;
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: hidden;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background: var(--color-background-neutral-subtlest);
      }
      /* Mismo estándar visual que .bitacora__positions-header
         (bitacora-view.component.ts): ícono + texto en mayúsculas, sin el
         h3 visible como encabezado de sección aparte. */
      .following-view__cell-header {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: var(--layout-gap-xs);
        padding: var(--layout-padding-sm) var(--layout-padding-sm) var(--layout-padding-sm) var(--layout-padding-md);
        border-bottom: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        background: var(--elevation-surface-default);
        color: var(--color-text-base-subtlest);
        cursor: grab;
      }
      .following-view__cell-header:active {
        cursor: grabbing;
      }
      .following-view__cell-header--dragging {
        opacity: 0.4;
      }
      .following-view__cell-header h3 {
        min-inline-size: 0;
        overflow: hidden;
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-emphasis);
        line-height: var(--font-line-height-content-note);
        text-overflow: ellipsis;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      .following-view__cell-header button {
        display: grid;
        flex-shrink: 0;
        place-items: center;
        margin-inline-start: auto;
        inline-size: 24px;
        block-size: 24px;
        padding: 0;
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .following-view__cell-header button:hover {
        background: var(--color-background-neutral-subtle);
        color: var(--color-text-base-default);
      }
      .following-view__cell-header button:focus-visible {
        outline: var(--layout-border-thick) solid var(--color-border-focused);
        outline-offset: 1px;
      }
      .following-view__cell-map {
        position: relative;
        flex: 1 1 auto;
        min-block-size: 0;
      }
      .following-view__cell--span {
        grid-column: 1 / -1;
      }
      .following-view__empty {
        display: grid;
        place-items: center;
        grid-column: 1 / -1;
        color: var(--color-text-base-subtle);
      }
    `,
  ],
})
export class FollowingViewComponent {
  protected readonly state = inject(FleetMapService);

  @ViewChild('grid', { static: true }) private gridRef!: ElementRef<HTMLElement>;

  protected readonly draggedUnitId = signal<string | null>(null);

  protected gridColumns(): string {
    return this.state.activeFollowingUnits().length === 1 ? '1fr' : '1fr 1fr';
  }

  protected gridRows(): string {
    return this.state.activeFollowingUnits().length >= 3 ? '1fr 1fr' : '1fr';
  }

  protected onDragStart(unitId: string, event: DragEvent): void {
    this.draggedUnitId.set(unitId);
    event.dataTransfer?.setData('text/plain', unitId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * `dragover` se dispara docenas de veces por segundo mientras el mouse
   * está sobre una celda, aunque no se mueva. Comparar `fromIndex ===
   * targetIndex` no alcanza para frenarlo: al reordenar, el DOM se
   * reacomoda BAJO el cursor (el hit-test de arrastre sigue la posición
   * visual, que por el propio FLIP queda animándose unos frames), así que
   * el mismo punto de pantalla puede terminar apuntando a una celda
   * distinta antes de que la animación anterior termine — eso producía
   * varios reordenamientos encadenados (a veces oscilando de un lado a
   * otro) mientras el usuario se quedaba quieto, y la animación se veía
   * entrecortada por pisarse a sí misma. Un cooldown del largo de la
   * animación evita aceptar un nuevo reordenamiento hasta que el anterior
   * terminó de asentarse.
   */
  private reorderLocked = false;

  protected onDragOver(targetIndex: number, event: DragEvent): void {
    const draggedId = this.draggedUnitId();
    if (!draggedId) return;
    event.preventDefault();
    if (this.reorderLocked) return;
    const ids = this.state.activeFollowingUnits().map((unit) => unit.id);
    const fromIndex = ids.indexOf(draggedId);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    this.reorderLocked = true;
    this.animateReorder(() => this.state.reorderFollowing(fromIndex, targetIndex));
    window.setTimeout(() => { this.reorderLocked = false; }, REORDER_ANIMATION_MS + 60);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggedUnitId.set(null);
  }

  protected onDragEnd(): void {
    this.draggedUnitId.set(null);
  }

  /**
   * FLIP manual (First-Last-Invert-Play): CSS Grid no anima solo por
   * reordenar el DOM (a diferencia de `transform`, `grid-template` no es
   * animable), así que se mide la posición de cada celda antes de mutar el
   * arreglo y, un frame después de que Angular repinta con el nuevo orden,
   * se calcula la diferencia y se anima desde ahí hasta 0. Las celdas se
   * ubican por `unit.id` (no por índice) porque el `track` del `@for` ya
   * asegura que Angular reutiliza el mismo nodo del DOM al reordenar, en
   * vez de recrearlo.
   */
  private animateReorder(mutate: () => void): void {
    const container = this.gridRef.nativeElement;
    const cells = Array.from(container.querySelectorAll<HTMLElement>(':scope > .following-view__cell'));
    const firstRects = new Map(cells.map((cell) => [cell, cell.getBoundingClientRect()] as const));

    mutate();

    // Angular repinta el nuevo orden en un microtask/macrotask propio de
    // zone.js, no en el mismo tick síncrono en que se escribe la señal. Un
    // solo `requestAnimationFrame` a veces corría ANTES de que ese repintado
    // ocurriera (mide el DOM viejo, delta ~0, sin animación) — eso era la
    // causa real de que se viera entrecortada/intermitente. `setTimeout`
    // encola una macrotarea, que sí espera a que zone.js termine de
    // procesar el cambio pendiente antes de ejecutarse.
    window.setTimeout(() => {
      for (const cell of cells) {
        const first = firstRects.get(cell);
        if (!first) continue;
        const last = cell.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        if (!deltaX && !deltaY) continue;
        cell.style.transition = 'none';
        cell.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        // Fuerza un reflow síncrono entre fijar la posición de arranque y
        // habilitar la transición — sin esto el navegador puede fusionar
        // ambos cambios de estilo en un solo paint y la animación no corre.
        void cell.offsetHeight;
        cell.style.transition = `transform ${REORDER_ANIMATION_MS}ms ease`;
        cell.style.transform = '';
      }
    });
  }
}
