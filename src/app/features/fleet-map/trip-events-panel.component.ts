import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { Icon, type IconName } from '@iamacalupuenzo-ui/comsatel-ds';
import type { FleetUnit } from '../../core/fleet/fleet-telemetry.service';
import { UnitTypeMultiSelectComponent, type UnitTypeFilterOption } from '../../shared/unit-type-multi-select.component';

type TripEventType = 'speeding' | 'acceleration' | 'braking' | 'lateral';

export interface TripEvent {
  id: string;
  at: string;
  label: string;
  type: TripEventType;
  position: [number, number];
  /**
   * Posición 0..1 a lo largo de la trazabilidad del día, cronológica (0 =
   * inicio del viaje). `fleet-map-canvas.component.ts` la usa para ubicar el
   * marcador sobre SU línea ya dibujada (`trailPath`, pegada a calle vía
   * OSRM) en vez de la recta que interpola este panel — de lo contrario el
   * punto queda al costado de la línea real en las curvas, no encima.
   * `null` cuando la unidad no tiene trazabilidad (no es piloto): ahí
   * `position` (con jitter) es la única fuente.
   */
  trailFraction: number | null;
}

const EVENT_META: Record<TripEventType, { icon: IconName; label: string; className: string }> = {
  speeding: { icon: 'gauge', label: 'Exceso de velocidad', className: 'is-speeding' },
  acceleration: { icon: 'arrow-up', label: 'Aceleración brusca', className: 'is-acceleration' },
  braking: { icon: 'arrow-down', label: 'Frenado brusco', className: 'is-braking' },
  lateral: { icon: 'alert-triangle', label: 'Giro/lateral brusco', className: 'is-lateral' },
};
/** Sin opción "Todos" a mano: `UnitTypeMultiSelectComponent` ya trata "todo marcado" como equivalente a "sin filtro" (ver `triggerText`). */
const EVENT_TYPE_OPTIONS: UnitTypeFilterOption[] = (Object.keys(EVENT_META) as TripEventType[]).map((type) => ({
  label: EVENT_META[type].label,
  value: type,
}));
const EVENT_SEQUENCE: TripEventType[] = [
  'acceleration',
  'speeding',
  'acceleration',
  'lateral',
  'speeding',
  'acceleration',
  'braking',
  'speeding',
  'lateral',
  'acceleration',
  'braking',
  'speeding',
];

const DEMO_STREETS = ['Av. Túpac Amaru', 'Av. Independencia', 'Puente El Ejército', 'Av. Universitaria', 'Av. Perú'];
const DEMO_DISTRICTS = ['Comas', 'Independencia Sur', 'Rímac', 'Cercado Norte', 'Los Olivos'];

/**
 * Eventos del viaje — mismo estándar visual que "Posiciones"
 * (`bitacora-view.component.ts`): tarjeta con ícono sin fondo junto al
 * texto, fecha y hora debajo. Sin badges de valor (velocidad/g) — se quitó
 * a pedido, el ícono ya distingue el tipo de evento. Demo determinística
 * por unidad, como el resto de la Bitácora: no hay telemetría real de
 * eventos de conducción todavía.
 */
@Component({
  selector: 'app-trip-events-panel',
  imports: [Icon, UnitTypeMultiSelectComponent],
  template: `
    <div class="trip-events">
      <header class="trip-events__header">
        <cs-icon name="grip-vertical" [size]="14" aria-hidden="true" />
        <h3>Eventos del viaje</h3>
        <span class="trip-events__count">{{ filteredEvents().length }}</span>
      </header>
      <div class="trip-events__filter">
        <app-unit-type-multi-select
          inputId="trip-events-type"
          label="Tipo de evento"
          placeholder="Todos los eventos"
          [options]="typeOptions"
          [value]="typeFilter()"
          (valueChange)="typeFilter.set($event)"
        />
      </div>
      <ol #eventList class="trip-events__list" (scroll)="checkScroll()">
        @for (event of filteredEvents(); track event.id) {
          <li class="event-card" [class.is-selected]="selectedId() === event.id">
            <button type="button" class="event-card__main" [attr.aria-pressed]="selectedId() === event.id" (click)="selectEvent(event)">
              <strong class="event-card__location"
                ><cs-icon [name]="icon(event.type)" [size]="14" [class]="meta(event.type).className" aria-hidden="true" /><span
                  class="event-card__location-text"
                  >{{ event.label }}</span
                ></strong
              >
              <span class="event-card__time">{{ formattedDate(event.at) }}</span>
            </button>
          </li>
        } @empty {
          <li class="trip-events__empty">Sin eventos para el filtro seleccionado.</li>
        }
      </ol>
      @if (showScrollHint()) {
        <div class="trip-events__scroll-hint" aria-hidden="true">
          <cs-icon name="chevron-down" [size]="16" class="trip-events__scroll-hint-chevron" />
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
        min-block-size: 0;
      }
      .trip-events {
        display: flex;
        flex-direction: column;
        block-size: 100%;
        min-block-size: 0;
        overflow: hidden;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
      }
      .trip-events__header {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: var(--layout-gap-xs);
        padding: var(--layout-padding-lg);
        color: var(--color-text-base-subtlest);
      }
      .trip-events__header h3 {
        margin: 0;
        color: var(--color-text-base-subtlest);
        font-size: var(--font-size-content-note);
        font-weight: var(--font-weight-emphasis);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .trip-events__count {
        margin-inline-start: auto;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
      }
      .trip-events__filter {
        flex-shrink: 0;
        padding: 0 var(--layout-padding-lg) var(--layout-padding-lg);
        border-bottom: var(--layout-border-thin) solid var(--color-border-divider);
      }
      .trip-events__list {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
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
      .trip-events__list::-webkit-scrollbar {
        display: none;
      }
      .trip-events__empty {
        padding: var(--layout-padding-lg);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        text-align: center;
      }
      .trip-events__scroll-hint {
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
      .trip-events__scroll-hint-chevron {
        color: var(--color-text-base-subtlest);
        animation: trip-events-scroll-hint-bounce 0.9s ease-in-out infinite;
      }
      @keyframes trip-events-scroll-hint-bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(5px);
        }
      }
      /* Idéntico a .position-card (bitacora-view.component.ts): ícono sin
         fondo junto al texto, fecha y hora debajo, seleccionable con el
         mismo estándar visual (borde + fondo brand-subtlest) para que al
         tocar una tarjeta se distinga cuál quedó resaltada en el mapa. */
      .event-card {
        display: block;
        min-inline-size: 0;
        min-block-size: 64px;
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-divider);
        border-radius: var(--radius-md);
        background: var(--elevation-surface-default);
        transition:
          border-color var(--motion-duration-fast) var(--motion-easing-standard),
          box-shadow var(--motion-duration-fast) var(--motion-easing-standard);
      }
      .event-card:has(.event-card__main:hover) {
        border-color: var(--color-border-brand-default);
        box-shadow: var(--shadow-sm);
      }
      .event-card.is-selected {
        border-color: var(--color-border-brand-default);
        background: var(--color-background-brand-subtlest);
        box-shadow: var(--shadow-sm);
      }
      .event-card__main {
        display: block;
        inline-size: 100%;
        min-inline-size: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--color-text-base-default);
        text-align: left;
        cursor: pointer;
        font: inherit;
      }
      .event-card__location {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--layout-gap-2xs) + 2px);
        min-inline-size: 0;
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        font-weight: var(--font-weight-accent);
        line-height: var(--font-line-height-content-ui);
      }
      .event-card__location cs-icon {
        flex-shrink: 0;
        margin-block-start: 2px;
        color: var(--color-text-base-subtle);
      }
      /* El ícono cambia de color según el tipo de evento — la única señal
         visual del tipo ahora que se quitó el badge de valor. */
      .event-card__location cs-icon.is-speeding {
        color: var(--color-text-danger-default);
      }
      .event-card__location cs-icon.is-acceleration {
        color: var(--color-text-warning-default);
      }
      .event-card__location cs-icon.is-braking {
        color: var(--color-text-success-default);
      }
      .event-card__location cs-icon.is-lateral {
        color: var(--color-text-brand-default);
      }
      .event-card__location-text {
        overflow: hidden;
        min-inline-size: 0;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .event-card__time {
        margin-inline-start: calc(14px + var(--layout-gap-2xs) + 2px);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
    `,
  ],
})
export class TripEventsPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('eventList', { read: ElementRef }) private eventListRef?: ElementRef<HTMLElement>;
  readonly unit = input<FleetUnit | null>(null);
  /** Mismo rango de fecha/hora que filtra "Posiciones" (`bitacora-view.component.ts`) — un solo filtro para todo el panel derecho, no uno por lista. */
  readonly dateFrom = input('');
  readonly dateTo = input('');
  readonly timeFrom = input('');
  readonly timeTo = input('');
  /**
   * Trazabilidad de ruta del día (`todaysTrail()` en
   * `bitacora-view.component.ts`) — cuando existe, los eventos se ubican
   * SOBRE esa línea (interpolados por orden cronológico) en vez de
   * dispersos alrededor de la unidad, siguiendo el patrón validado en
   * C-Locater (los eventos de un viaje quedan pegados a la ruta recorrida,
   * no flotando al costado).
   */
  readonly trail = input<[number, number][] | null>(null);
  /** Para dibujar los eventos filtrados como puntos en el mapa (`fleet-map-canvas.component.ts`), que vive fuera de este componente. */
  readonly filteredEventsChange = output<TripEvent[]>();
  /** Evento resaltado — banana-in-box con `fleet-map-canvas.component.ts` vía `bitacora-view.component.ts`, así seleccionar desde la lista o desde el propio marcador en el mapa terminan en el mismo estado. */
  readonly selectedId = input<string | null>(null);
  readonly selectedIdChange = output<string | null>();

  protected readonly events = computed<TripEvent[]>(() => {
    const unit = this.unit();
    if (!unit) return [];
    const seed = this.seedFrom(unit.id);
    const baseTime = new Date(unit.lastUpdate).getTime();
    const [lat, lng] = unit.position;
    const trail = this.trail();
    const hasTrail = !!trail && trail.length >= 2;
    const lastIndex = EVENT_SEQUENCE.length - 1;
    // Del más reciente al más antiguo — mismo orden que "Posiciones".
    return EVENT_SEQUENCE.map((type, i) => {
      const fraction = i / lastIndex;
      const position = hasTrail ? this.pointOnTrail(trail!, fraction) : this.jitteredPosition(lat, lng, seed, i);
      return {
        id: `${unit.id}-ev-${i}`,
        at: new Date(baseTime - (EVENT_SEQUENCE.length - i) * 22 * 60 * 1000).toISOString(),
        label: this.demoAddress(seed, i),
        type,
        position,
        trailFraction: hasTrail ? fraction : null,
      };
    }).reverse();
  });

  /** Filtro multi-select por tipo de evento — mismo componente que "Tipo de unidad" en Capturas/Recuperos. Sin selección = sin filtro (todos). */
  protected readonly typeOptions = EVENT_TYPE_OPTIONS;
  protected readonly typeFilter = signal<string[]>([]);
  protected readonly filteredEvents = computed(() => {
    const selected = this.typeFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const fromInstant = from ? new Date(`${from}T${this.timeFrom() || '00:00'}:00`).getTime() : null;
    const toInstant = to ? new Date(`${to}T${this.timeTo() || '23:59'}:59`).getTime() : null;
    return this.events().filter((event) => {
      if (selected.length && !selected.includes(event.type)) return false;
      const at = new Date(event.at).getTime();
      if (fromInstant !== null && at < fromInstant) return false;
      if (toInstant !== null && at > toInstant) return false;
      return true;
    });
  });

  // Mismo patrón que Posiciones (bitacora-view.component.ts): sin barra de
  // scroll visible, con un chevron que avisa que hay más para bajar.
  protected readonly showScrollHint = signal(false);
  private readonly zone = inject(NgZone);
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      this.filteredEvents();
      setTimeout(() => this.checkScroll(), 80);
    });
    effect(() => {
      this.filteredEventsChange.emit(this.filteredEvents());
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 320);
    const el = this.eventListRef?.nativeElement;
    if (!el) return;
    // La altura de este panel depende de la de "Información" (variable:
    // con orden, sin orden, cargando), no solo del propio contenido — un
    // ResizeObserver corre fuera del zone de Angular, así que sin
    // `zone.run(...)` el signal cambia pero la vista nunca se repinta.
    this.resizeObserver = new ResizeObserver(() => this.zone.run(() => this.checkScroll()));
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected checkScroll(): void {
    const el = this.eventListRef?.nativeElement;
    if (!el) return;
    this.showScrollHint.set(el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }

  protected selectEvent(event: TripEvent): void {
    this.selectedIdChange.emit(this.selectedId() === event.id ? null : event.id);
  }

  protected icon(type: TripEventType): IconName {
    return EVENT_META[type].icon;
  }

  protected meta(type: TripEventType) {
    return EVENT_META[type];
  }

  protected formattedDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  /** Interpola un punto a lo largo de `trail` (recta entre tramos, no pegada a calle — suficiente para ubicar el evento sobre el trazo visible). */
  private pointOnTrail(trail: readonly [number, number][], t: number): [number, number] {
    const clamped = Math.min(1, Math.max(0, t));
    const scaled = clamped * (trail.length - 1);
    const index = Math.floor(scaled);
    const fraction = scaled - index;
    const start = trail[index];
    const end = trail[Math.min(index + 1, trail.length - 1)];
    return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
  }

  private jitteredPosition(lat: number, lng: number, seed: number, index: number): [number, number] {
    const jitter = ((seed + index * 97) % 200) / 20000;
    const sign = index % 2 === 0 ? 1 : -1;
    return [lat + sign * jitter * index, lng - sign * jitter * index];
  }

  private seedFrom(unitId: string): number {
    let seed = 0;
    for (let i = 0; i < unitId.length; i++) seed = (seed * 31 + unitId.charCodeAt(i)) >>> 0;
    return seed;
  }

  private demoAddress(seed: number, index: number): string {
    const street = DEMO_STREETS[(seed + index * 7) % DEMO_STREETS.length];
    const district = DEMO_DISTRICTS[(seed + index * 13) % DEMO_DISTRICTS.length];
    const km = 1 + ((seed + index * 41) % 8);
    return index % 3 === 0 ? `${street} Km ${km}, ${district}` : `${street}, ${district}`;
  }
}
