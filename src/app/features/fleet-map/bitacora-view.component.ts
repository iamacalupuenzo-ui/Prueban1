import { AfterViewInit, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Icon } from '@iamacalupuenzo-ui/comsatel-ds';
import { POSITIONS_PER_DAY, positionHistoryFor, type FleetPositionEntry } from '../../core/fleet/fleet-telemetry.service';
import { DateRangeFilterComponent, type DateRangeFilterValue } from '../../shared/date-range-filter.component';
import { TimePickerComponent } from '../../shared/time-picker.component';
import { FleetMapCanvasComponent } from './fleet-map-canvas.component';
import { CaptureOrderInfoPanelComponent } from './capture-order-info-modal.component';
import { FleetMapService } from './fleet-map.service';
import { TripEventsPanelComponent, type TripEvent } from './trip-events-panel.component';

/**
 * Bitácora individual de una unidad — primera iteración de
 * `docs/epica-a-plan-desarrollo-fleet-operations-bitacora-v1-2026-09-21.md`
 * (HU-bitacora-02/05). El panel de datos del dispositivo GPS e información
 * del vehículo se quitó a pedido; solo queda la lista de posiciones y el
 * mapa embebido.
 *
 * La navegación de vuelta al mapa vive en `fleet-map-tabs.component.ts`
 * (pestaña "Mapa"), ya no en este componente.
 */
@Component({
  selector: 'app-bitacora-view',
  imports: [CaptureOrderInfoPanelComponent, DateRangeFilterComponent, FleetMapCanvasComponent, Icon, TimePickerComponent, TripEventsPanelComponent],
  template: `
    @if (unit(); as unit) {
      <div class="bitacora">
        <div class="bitacora__positions">
          <header class="bitacora__positions-header">
            <cs-icon name="grip-vertical" [size]="14" aria-hidden="true" />
            <h3>Posiciones</h3>
            <span class="bitacora__positions-count">{{ filteredPositions().length }}</span>
          </header>
          <div class="bitacora__positions-filter">
            <app-date-range-filter
              label="Rango de fechas"
              placeholder="Todas las fechas"
              [value]="{ from: dateFrom(), to: dateTo() }"
              (valueChange)="onDateRangeChange($event)"
            />
            <div class="bitacora__positions-time-row">
              <app-time-picker label="Hora desde" [value]="timeFrom()" (valueChange)="timeFrom.set($event)" />
              <app-time-picker label="Hora hasta" [value]="timeTo()" (valueChange)="timeTo.set($event)" />
            </div>
          </div>
          <ol #positionList class="bitacora__position-list" (scroll)="checkScroll()">
            @for (entry of filteredPositions(); track entry.at) {
              <li class="position-card" [class.is-latest]="entry.isLatest" [class.is-selected]="selectedPositionAt() === entry.at">
                <button type="button" class="position-card__main" [attr.aria-pressed]="selectedPositionAt() === entry.at" (click)="selectPosition(entry)">
                  <span class="position-card__body">
                    <strong class="position-card__location"><cs-icon name="map-pin" [size]="14" aria-hidden="true" /><span class="position-card__location-text">{{ entry.label }}</span></strong>
                    <span class="position-card__time">{{ formattedDate(entry.at) }}</span>
                  </span>
                </button>
              </li>
            } @empty {
              <li class="bitacora__positions-empty">Sin posiciones en el rango seleccionado.</li>
            }
          </ol>
          @if (showScrollHint()) {
            <div class="bitacora__scroll-hint" aria-hidden="true">
              <cs-icon name="chevron-down" [size]="16" class="bitacora__scroll-hint-chevron" />
            </div>
          }
        </div>

        <div class="bitacora__map">
          <app-fleet-map-canvas
            [units]="[displayedUnit()!]"
            [focusPosition]="selectedPosition()"
            [trailPositions]="todaysTrail()"
            [eventMarkers]="tripEvents()"
            [selectedEventId]="selectedTripEventId()"
            (eventSelected)="toggleTripEvent($event)"
          />
        </div>
        <div class="bitacora__order-column">
          <app-capture-order-info-panel [unit]="unit" [isOpen]="true" />
          <app-trip-events-panel
            [unit]="unit"
            [dateFrom]="dateFrom()"
            [dateTo]="dateTo()"
            [timeFrom]="timeFrom()"
            [timeTo]="timeTo()"
            [trail]="todaysTrail()"
            [selectedId]="selectedTripEventId()"
            (filteredEventsChange)="tripEvents.set($event)"
            (selectedIdChange)="selectedTripEventId.set($event)"
          />
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
      }
      .bitacora {
        display: flex;
        align-items: stretch;
        gap: var(--layout-padding-md);
        box-sizing: border-box;
        block-size: 100%;
        inline-size: 100%;
        padding: var(--layout-padding-md);
      }
      h3 {
        margin: 0;
      }
      /* Sin esto, el <button> de la tarjeta de posición hereda la fuente de
         sistema del navegador (no la de la app), y font-weight-accent (500)
         no se distingue de regular en esa fuente. Mismo reset que
         fleet-map-search.component.ts para .vehicle-card__main. */
      button {
        font: inherit;
      }
      .bitacora__positions {
        display: flex;
        flex: 0 0 280px;
        flex-direction: column;
        min-block-size: 0;
        overflow: hidden;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
      }
      .bitacora__positions-header {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: var(--layout-gap-xs);
        padding: var(--layout-padding-lg) var(--layout-padding-lg) var(--layout-padding-sm);
        color: var(--color-text-base-subtlest);
      }
      .bitacora__positions-header h3 {
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-emphasis);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .bitacora__positions-count {
        margin-inline-start: auto;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
      }
      .bitacora__positions-filter {
        display: grid;
        flex-shrink: 0;
        gap: var(--layout-gap-sm);
        padding: 0 var(--layout-padding-lg) var(--layout-padding-lg);
        border-bottom: var(--layout-border-thin) solid var(--color-border-divider);
      }
      .bitacora__positions-time-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--layout-gap-xs);
      }
      .bitacora__positions-time-row app-time-picker {
        flex: 1 1 0;
        min-inline-size: 0;
      }
      .bitacora__positions-empty {
        padding: var(--layout-padding-lg);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        text-align: center;
        list-style: none;
      }
      .bitacora__position-list {
        display: grid;
        flex: 1 1 auto;
        min-block-size: 0;
        align-content: start;
        gap: var(--layout-gap-sm);
        margin: 0;
        padding: var(--layout-padding-sm);
        list-style: none;
        overflow-y: auto;
        scrollbar-width: none;
      }
      .bitacora__position-list::-webkit-scrollbar {
        display: none;
      }
      .bitacora__scroll-hint {
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        padding-block: var(--layout-padding-2xs) var(--layout-padding-sm);
        pointer-events: none;
        background: linear-gradient(to bottom, transparent, var(--elevation-surface-default) 55%);
      }
      .bitacora__scroll-hint-chevron {
        color: var(--color-text-base-subtlest);
        animation: bitacora-scroll-hint-bounce 0.9s ease-in-out infinite;
      }
      @keyframes bitacora-scroll-hint-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(5px); }
      }
      /* Mismo estándar visual que .vehicle-card del buscador flotante
         (fleet-map-search.component.ts) — solo cambian los datos: sin
         avatar, título y subtítulo muestran ubicación y hora. */
      .position-card {
        display: block;
        min-block-size: 64px;
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
        transition: border-color var(--motion-duration-fast) var(--motion-easing-standard), box-shadow var(--motion-duration-fast) var(--motion-easing-standard);
      }
      .position-card:has(.position-card__main:hover) {
        border-color: var(--color-border-brand-default);
        box-shadow: var(--shadow-sm);
      }
      .position-card.is-selected,
      .position-card.is-latest {
        border-color: var(--color-border-brand-default);
        box-shadow: var(--shadow-sm);
      }
      .position-card.is-selected {
        background: var(--color-background-brand-subtlest);
      }
      .position-card__main {
        display: block;
        inline-size: 100%;
        min-inline-size: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--color-text-base-default);
        text-align: left;
        cursor: pointer;
      }
      .position-card__body {
        display: grid;
        min-inline-size: 0;
        gap: var(--layout-gap-2xs);
      }
      .position-card__location {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--layout-gap-2xs) + 2px);
        min-inline-size: 0;
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-accent);
        line-height: var(--font-line-height-content-ui);
      }
      .position-card__location cs-icon {
        flex-shrink: 0;
        margin-block-start: 2px;
        color: var(--color-text-base-subtle);
      }
      .position-card__location-text {
        display: -webkit-box;
        overflow: hidden;
        min-inline-size: 0;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .position-card__time {
        margin-inline-start: calc(14px + var(--layout-gap-2xs) + 2px);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .bitacora__map {
        order: 3;
        position: relative;
        flex: 1 1 auto;
        min-inline-size: 0;
        overflow: hidden;
        border-radius: var(--radius-lg);
        background: var(--color-background-neutral-subtlest);
      }
      .bitacora__map app-fleet-map-canvas {
        position: absolute;
        inset: 0;
      }
      .bitacora__order-column {
        display: flex;
        order: 2;
        flex: 0 0 280px;
        flex-direction: column;
        gap: var(--layout-padding-md);
        min-inline-size: 0;
        min-block-size: 0;
      }
      .bitacora__order-column app-capture-order-info-panel {
        flex-shrink: 0;
      }
      .bitacora__order-column app-trip-events-panel {
        flex: 1 1 auto;
        min-block-size: 0;
      }
      @media (max-width: 1080px) {
        .bitacora {
          flex-wrap: wrap;
          overflow-y: auto;
        }
        .bitacora__positions {
          display: none;
        }
        .bitacora__order-column {
          flex: 1 0 100%;
        }
        .bitacora__order-column app-trip-events-panel {
          min-block-size: 320px;
        }
        .bitacora__map {
          flex-basis: 100%;
          min-block-size: 320px;
        }
      }
    `,
  ],
})
export class BitacoraViewComponent implements AfterViewInit {
  @ViewChild('positionList', { read: ElementRef }) private positionListRef?: ElementRef<HTMLElement>;

  protected readonly state = inject(FleetMapService);
  protected readonly orderInfoOpen = signal(false);
  protected readonly unit = this.state.bitacoraUnit;
  protected readonly positions = computed(() => positionHistoryFor(this.unit()!));

  // Sin barra de scroll visible (mismo patrón que fleet-map-search.component.ts).
  protected readonly showScrollHint = signal(false);

  /** Seleccionar una posición centra el mapa embebido ahí — antes esto no existía. */
  protected readonly selectedPositionAt = signal<string | null>(null);
  protected readonly selectedPosition = computed(() => {
    const at = this.selectedPositionAt();
    return at ? this.positions().find((entry) => entry.at === at)?.position ?? null : null;
  });
  /**
   * El pill de la unidad en el mapa embebido se posiciona en la posición
   * seleccionada del historial, no en la posición real actual — así el
   * marcador queda exactamente donde estaba la unidad en ese momento, no
   * solo el mapa centrado ahí con el pill en otro lado.
   */
  protected readonly displayedUnit = computed(() => {
    const unit = this.unit();
    const position = this.selectedPosition();
    return unit && position ? { ...unit, position } : unit;
  });

  /**
   * Trazabilidad de ruta (piloto) — línea pegada a calle en el mapa
   * embebido, conectando el inicio del movimiento del día con la última
   * posición, validando el patrón visual de C-Locater. A pedido explícito,
   * la prueba queda acotada a MTR-3001; quitar `PILOT_TRAIL_VEHICLE_CODES`
   * cuando se confirme el patrón para el resto de la flota.
   */
  private static readonly PILOT_TRAIL_VEHICLE_CODES = ['MTR-3001'];
  protected readonly todaysTrail = computed<[number, number][] | null>(() => {
    const unit = this.unit();
    if (!unit || !BitacoraViewComponent.PILOT_TRAIL_VEHICLE_CODES.includes(unit.vehicleCode)) return null;
    // `positions()` viene ordenado del más reciente al más antiguo; las
    // primeras `POSITIONS_PER_DAY` entradas son las de hoy (ver
    // `positionHistoryFor`). Se invierte para trazar del inicio al final.
    const todays = this.positions().slice(0, POSITIONS_PER_DAY).slice().reverse();
    return todays.length >= 2 ? todays.map((entry) => entry.position) : null;
  });

  /**
   * Filtro de rango de fechas — `app-date-range-filter`, el mismo componente
   * compartido que usa Capturas ("Fecha de registro") en vez de una copia a
   * mano del popover con `cs-calendar`. Estado local: a diferencia de
   * Capturas, nadie más que esta lista necesita el filtro.
   *
   * Es un rango de fecha Y hora: `timeFrom`/`timeTo` acotan el instante
   * exacto dentro de los días seleccionados (sin hora, se asume 00:00 como
   * inicio y 23:59 como fin del día). Por eso el filtro compara instantes
   * completos (`entry.at` vs. fecha+hora) en vez de solo la fecha.
   */
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly timeFrom = signal('');
  protected readonly timeTo = signal('');
  /** Eventos ya filtrados por tipo y por el rango de fecha/hora de arriba — llega desde `app-trip-events-panel` para dibujarse como puntos en el mapa. */
  protected readonly tripEvents = signal<TripEvent[]>([]);
  /** Evento resaltado — compartido entre la lista y el mapa embebido en ambos sentidos (clic en la tarjeta o clic directo sobre el marcador). */
  protected readonly selectedTripEventId = signal<string | null>(null);
  protected readonly filteredPositions = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from && !to) return this.positions();
    const fromInstant = from ? new Date(`${from}T${this.timeFrom() || '00:00'}:00`).getTime() : null;
    const toInstant = to ? new Date(`${to}T${this.timeTo() || '23:59'}:59`).getTime() : null;
    return this.positions().filter((entry) => {
      const at = new Date(entry.at).getTime();
      if (fromInstant !== null && at < fromInstant) return false;
      if (toInstant !== null && at > toInstant) return false;
      return true;
    });
  });

  constructor() {
    effect(() => {
      this.unit();
      this.selectedPositionAt.set(null);
      this.selectedTripEventId.set(null);
      // La trazabilidad del mapa embebido ya es "solo hoy" (ver
      // `todaysTrail`); la lista de Posiciones debe arrancar mostrando lo
      // mismo por defecto, no el historial completo. Sin hora — el pedido
      // fue "las horas no es necesario pero las fechas sí" — solo se fija
      // el día.
      this.setDefaultDateRangeToToday();
      setTimeout(() => this.checkScroll(), 80);
    });
    effect(() => {
      this.filteredPositions();
      setTimeout(() => this.checkScroll(), 0);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 320);
  }

  protected checkScroll(): void {
    const el = this.positionListRef?.nativeElement;
    if (!el) return;
    this.showScrollHint.set(el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }

  protected selectPosition(entry: FleetPositionEntry): void {
    this.selectedPositionAt.update((current) => (current === entry.at ? null : entry.at));
  }

  /** Clic directo sobre un marcador de evento en el mapa — mismo toggle que `app-trip-events-panel` aplica al tocar una tarjeta. */
  protected toggleTripEvent(id: string): void {
    this.selectedTripEventId.update((current) => (current === id ? null : id));
  }

  protected formattedDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  protected onDateRangeChange(value: DateRangeFilterValue): void {
    this.dateFrom.set(value.from);
    this.dateTo.set(value.to);
  }
  /**
   * Filtro por defecto al abrir una bitácora: "hoy" (la fecha local de la
   * posición más reciente), sin hora. "Hoy" es el día de `positions()[0]`,
   * no el reloj real del navegador — es demo, las fechas quedan fijas en
   * el fixture, no corren con el calendario real.
   */
  private setDefaultDateRangeToToday(): void {
    const latest = this.positions()[0];
    const today = latest ? this.toLocalDateString(new Date(latest.at)) : '';
    this.dateFrom.set(today);
    this.dateTo.set(today);
    this.timeFrom.set('');
    this.timeTo.set('');
  }
  /** Arma el 'YYYY-MM-DD' local a partir de un Date, sin pasar por UTC (evita el corrimiento de un día de `new Date('YYYY-MM-DD')`). */
  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
