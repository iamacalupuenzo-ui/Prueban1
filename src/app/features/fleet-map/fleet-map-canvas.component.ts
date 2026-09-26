import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, effect, inject } from '@angular/core';
import * as L from 'leaflet';
import { isUnitStationaryOverThreshold, type FleetUnit, type FleetUnitType } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService } from './fleet-map.service';
import type { TripEvent } from './trip-events-panel.component';

const LIMA_CENTER: L.LatLngTuple = [-12.0464, -77.0428];
const DEFAULT_ZOOM = 13;

// CartoDB Voyager exige API key desde el cambio de política de CARTO
// (confirmado en pantalla: tiles con watermark "API KEY REQUIRED" antes de
// agregarla). La key es de cuota por cuenta, no de control de acceso: viaja
// en la URL del tile y queda visible en la pestaña de red de cualquiera que
// abra la app, igual que cualquier key pública de mapas — no es un secreto
// de backend. Tier gratuito: 5 millones de tiles/mes, sin tarjeta
// (carto.com/basemaps/apikey). Pendiente: restringir la key por dominio en
// el dashboard de CARTO cuando exista el dominio real de producción.
const CARTO_API_KEY = 'cb1_3rrt_1_53af94a2aae6cd553ffefe48';
const TILE_URL = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Voyager es un raster real renderizado nativamente hasta z20; limitarlo
// antes de eso (como quedó heredado de Esri, que solo llega a z16) hace que
// Leaflet estire el último tile disponible y se vea pixelado al acercarse.
const MAX_ZOOM = 20;

// ---------------------------------------------------------------------
// Marcador de unidad — replica fiel de `vehicle-pill.html`/`.css` de
// D:\Investigacion\Comsatel-DS-Angular\src\app\pages\markers-demo\, la
// página de referencia oficial "Mapa / Marcadores" del sistema de diseño
// (esa página documenta el marcador exacto que ya usa C-Locater en
// producción). No es una exportación de comsatel-ds ni un componente
// Leaflet: es HTML crudo para L.divIcon, así que se reconstruye la misma
// estructura y los mismos tokens en vez de instanciar <app-vehicle-pill>
// (que no se puede montar dentro de un string de innerHTML fuera del
// compilador de Angular).
// ---------------------------------------------------------------------

const VEHICLE_ICON_PATH: Record<FleetUnitType, string> = {
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" />',
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />',
  bus: '<path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" />',
  motorcycle:
    '<circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" />',
};

// Tier "sm" de ICON_TIER en vehicle-pill.ts: --layout-size-sm (24px de
// círculo), ícono de 16px, punto de estado de 9px.
const ICON_CIRCLE_PX = 24;
const ICON_GLYPH_PX = 16;
const STATUS_DOT_PX = 9;

// --color-map-vehicle-{status}: mismo getter que dotColorVar() en
// vehicle-pill.ts. 'active'/'stopped'/'offline' son los estados reales del
// token; FleetUnit hoy solo modela dos, mapeados 1:1.
const STATUS_TOKEN: Record<FleetUnit['status'], 'active' | 'offline'> = {
  'En ruta': 'active',
  'Sin señal': 'offline',
};

const STATIONARY_ALERT_RADIUS_METERS = 110;

function estimatePillWidth(label: string, secondary: string): number {
  const textWidth = Math.max(label.length * 6.5, secondary.length * 5.5);
  const padStart = 4; // --layout-padding-xs
  const padEnd = 12; // --layout-padding-lg
  const gap = 6; // --layout-gap-sm
  const border = 4; // 2px de cada lado
  return Math.ceil(ICON_CIRCLE_PX + gap + textWidth + padStart + padEnd + border);
}

// ---------------------------------------------------------------------
// Trazabilidad de ruta — piloto de validación (Bitácora, vehículo MTR-3001
// por ahora, ver `bitacora-view.component.ts`). Referencia visual:
// C-Locater, línea punteada azul entre un marcador "A" (inicio de
// movimiento del día) y la posición actual de la unidad, con flechas de
// dirección repartidas a lo largo de la línea — necesarias porque en una
// avenida con dos sentidos la línea sola no dice hacia dónde iba la unidad.
// ---------------------------------------------------------------------
const TRAIL_START_ICON_PX = 24;

function createTrailStartIcon(color: string): L.DivIcon {
  const html = `
    <div style="display:flex;align-items:center;justify-content:center;width:${TRAIL_START_ICON_PX}px;height:${TRAIL_START_ICON_PX}px;border-radius:var(--radius-full);background:${color};border:2px solid var(--elevation-surface-default);box-shadow:var(--shadow-sm);color:var(--color-text-inverse);font-family:var(--font-family-content);font-size:var(--font-size-label-small);font-weight:var(--font-weight-bold);line-height:1;">A</div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [TRAIL_START_ICON_PX, TRAIL_START_ICON_PX],
    iconAnchor: [TRAIL_START_ICON_PX / 2, TRAIL_START_ICON_PX / 2],
  });
}

// ---------------------------------------------------------------------
// Puntos de "Eventos del viaje" (`trip-events-panel.component.ts`) — ícono
// de color por evento (mismo color que la tarjeta en el panel) sobre la
// ruta. Estándar visual tomado de C-Locater (referencia real del producto
// en /c/Users/emacalupu/Documents/Proyectos/CLocater/C-Locater,
// `VehicleTrackingMap.tsx`): cuadrado redondeado con el glifo dentro (no un
// simple punto de color, que se leía plano y no distinguía el tipo sin
// abrir el panel), y al seleccionar uno desde la lista o el propio mapa se
// agranda con un anillo animado mientras el resto se atenúa — así se
// distingue del resto en vez de quedar todos con el mismo peso visual.
// ---------------------------------------------------------------------
const EVENT_MARKER_COLOR: Record<TripEvent['type'], string> = {
  speeding: 'var(--color-text-danger-default)',
  acceleration: 'var(--color-text-warning-default)',
  braking: 'var(--color-text-success-default)',
  lateral: 'var(--color-text-brand-default)',
};

// Glifos mínimos (Lucide 24x24, trazo blanco) — mismo lenguaje que los
// íconos del panel (arrow-up/arrow-down/alert-triangle), más un
// chevrons-up simple para "exceso de velocidad".
const EVENT_MARKER_GLYPH: Record<TripEvent['type'], string> = {
  speeding: '<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>',
  acceleration: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  braking: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  lateral:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};

function createEventMarkerIcon(type: TripEvent['type'], selected: boolean, dimmed: boolean): L.DivIcon {
  const color = EVENT_MARKER_COLOR[type];
  const size = selected ? 26 : 18;
  const half = size / 2;
  const glyphSize = Math.round(size * 0.55);
  const radius = Math.round(size * 0.32);
  const ring = selected
    ? `<div class="fleet-event-marker-ring" style="position:absolute;inset:-2px;border-radius:${radius + 2}px;border:1.5px solid ${color};pointer-events:none;"></div>`
    : '';
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;opacity:${dimmed ? 0.35 : 1};">
      ${ring}
      <div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${color};border:2px solid var(--elevation-surface-default);box-shadow:var(--shadow-sm);display:flex;align-items:center;justify-content:center;">
        <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${EVENT_MARKER_GLYPH[type]}</svg>
      </div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [half, half] });
}

const TRAIL_ARROW_ICON_PX = 14;
/**
 * Separación deseada entre flechas EN PÍXELES de pantalla, no en metros: a
 * un espaciado fijo en metros, alejar el zoom las junta todas (como se vio
 * en la validación — a 3+ km de distancia visible se amontonaban). Con un
 * espaciado en píxeles, `metersPerPixelAtZoom()` lo convierte al espaciado
 * en metros que corresponde a cada nivel de zoom, así que se ven igual de
 * separadas estés cerca o lejos.
 */
const TRAIL_ARROW_SPACING_PX = 42;

/** Metros por píxel en Web Mercator para un zoom y latitud dados (fórmula estándar de OSM/Leaflet). */
function metersPerPixelAtZoom(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** `delaySeconds` desfasa la animación de cada flecha para que la cascada de opacidad se lea como flujo a lo largo de la línea, no como parpadeo sincronizado. */
function createTrailArrowIcon(bearingDeg: number, color: string, delaySeconds: number): L.DivIcon {
  // El div interno rota (dirección real del tramo) y `fleet-trail-arrow`
  // (styles.css) anima su opacidad — dos transforms/propiedades distintas,
  // no se pisan entre sí.
  const html = `<div class="fleet-trail-arrow" style="width:${TRAIL_ARROW_ICON_PX}px;height:${TRAIL_ARROW_ICON_PX}px;transform:rotate(${bearingDeg}deg);animation-delay:-${delaySeconds}s;"><svg width="${TRAIL_ARROW_ICON_PX}" height="${TRAIL_ARROW_ICON_PX}" viewBox="0 0 14 14"><path d="M7 1 L12.5 12 L7 9 L1.5 12 Z" fill="${color}" stroke="var(--elevation-surface-default)" stroke-width="1" stroke-linejoin="round" /></svg></div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [TRAIL_ARROW_ICON_PX, TRAIL_ARROW_ICON_PX],
    iconAnchor: [TRAIL_ARROW_ICON_PX / 2, TRAIL_ARROW_ICON_PX / 2],
  });
}

const EARTH_RADIUS_METERS = 6371000;
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function distanceMeters(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function bearingDegrees(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Reparte puntos con rumbo cada `spacingMeters` a lo largo de una polilínea
 * (sea la línea recta de respaldo o la ruta pegada a calle de OSRM), para
 * poner una flecha de dirección en cada uno.
 */
function sampleDirectionPoints(
  points: readonly [number, number][],
  spacingMeters: number,
): { position: [number, number]; bearingDeg: number }[] {
  const samples: { position: [number, number]; bearingDeg: number }[] = [];
  let distanceSinceLastArrow = spacingMeters; // primera flecha cerca del inicio, no exactamente en él
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const segmentLength = distanceMeters(start, end);
    if (segmentLength === 0) continue;
    const bearingDeg = bearingDegrees(start, end);
    let distanceIntoSegment = spacingMeters - distanceSinceLastArrow;
    while (distanceIntoSegment < segmentLength) {
      const ratio = distanceIntoSegment / segmentLength;
      samples.push({
        position: [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio],
        bearingDeg,
      });
      distanceIntoSegment += spacingMeters;
    }
    distanceSinceLastArrow = segmentLength - (distanceIntoSegment - spacingMeters);
  }
  return samples;
}

function createUnitIcon(unit: FleetUnit): L.DivIcon {
  const status = STATUS_TOKEN[unit.status];
  const secondary = unit.vehicleCode;
  const pillWidth = estimatePillWidth(unit.name, secondary);
  const pillHeight = 36; // icon-wrap(24) + padding-block(4*2) + border(2*2)
  const stemHeight = 12; // --layout-gap-lg
  const stemDot = 6;
  const totalHeight = pillHeight + stemHeight + stemDot;

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;width:${pillWidth}px;height:${totalHeight}px;box-sizing:border-box;font-family:var(--font-family-content);">
      <div style="display:inline-flex;flex:none;align-items:center;height:${pillHeight}px;box-sizing:border-box;gap:var(--layout-gap-sm);padding-block:var(--layout-padding-xs);padding-inline:var(--layout-padding-xs) var(--layout-padding-lg);border-radius:var(--radius-full);background:var(--elevation-surface-default);box-shadow:var(--shadow-md);border:2px solid var(--elevation-surface-default);">
        <div style="position:relative;flex-shrink:0;width:${ICON_CIRCLE_PX}px;height:${ICON_CIRCLE_PX}px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-full);background:var(--color-background-neutral-subtlest);border:1px solid var(--color-border-neutral-subtle);color:var(--color-text-base-subtle);">
          <svg width="${ICON_GLYPH_PX}" height="${ICON_GLYPH_PX}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_ICON_PATH[unit.type]}</svg>
          <div style="position:absolute;top:-1px;right:-1px;width:${STATUS_DOT_PX}px;height:${STATUS_DOT_PX}px;border-radius:var(--radius-full);border:2px solid var(--elevation-surface-default);background:var(--color-map-vehicle-${status});"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--layout-gap-2xs);line-height:1;">
          <span style="font-size:var(--font-size-label-small);font-weight:var(--font-weight-bold);color:var(--color-text-base-boldest);line-height:1;white-space:nowrap;">${unit.name}</span>
          <span style="font-size:var(--font-size-label-micro);font-weight:var(--font-weight-emphasis);color:var(--color-text-base-subtlest);line-height:1;white-space:nowrap;">${secondary}</span>
        </div>
      </div>
      <div style="flex:none;width:2px;height:${stemHeight}px;background:var(--color-border-neutral-boldest);opacity:.5;"></div>
      <div style="flex:none;width:${stemDot}px;height:${stemDot}px;border-radius:var(--radius-full);background:var(--color-border-neutral-boldest);"></div>
    </div>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [pillWidth, totalHeight],
    // La coordenada de Leaflet debe caer en el centro del punto terminal,
    // no en su borde inferior.
    iconAnchor: [pillWidth / 2, totalHeight - stemDot / 2],
  });
}

/**
 * Fondo cartográfico real de la vista de Explorar/Mapa. Interactivo:
 * arrastre, zoom con rueda/gestos/teclado. Sin control de zoom de Leaflet
 * (queda pendiente el control con el estándar visual propio del producto,
 * como el que ya usa C-Locater). Marcadores por unidad: pill con ícono de
 * tipo de vehículo + nombre + punto de estado, siguiendo la página de
 * referencia "Mapa / Marcadores" del sistema de diseño.
 */
@Component({
  selector: 'app-fleet-map-canvas',
  template: `<div #mapEl class="fleet-map-canvas" role="region" aria-label="Mapa interactivo de la operación"></div>`,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
        inline-size: 100%;
      }
      .fleet-map-canvas {
        block-size: 100%;
        inline-size: 100%;
      }
    `,
  ],
})
export class FleetMapCanvasComponent implements OnInit, OnChanges, OnDestroy {
  @Input() units: FleetUnit[] = [];
  /** Centra el mapa en una coordenada puntual (p. ej. una posición del historial de Bitácora), sin depender de `FleetMapService.selectedUnit`. */
  @Input() focusPosition: [number, number] | null = null;
  /**
   * Trazabilidad de ruta (piloto) — lista de posiciones en orden
   * cronológico (más antigua primero). `null`/vacío no dibuja nada; ver
   * nota en `bitacora-view.component.ts` sobre el alcance acotado a 3
   * unidades mientras se valida.
   */
  @Input() trailPositions: [number, number][] | null = null;
  /** Eventos del viaje ya filtrados (`trip-events-panel.component.ts`) — un ícono de color por evento en su posición real. */
  @Input() eventMarkers: TripEvent[] | null = null;
  /** Evento resaltado — banana-in-box con `app-trip-events-panel` vía `bitacora-view.component.ts`. */
  @Input() selectedEventId: string | null = null;
  /** Clic directo sobre un marcador de evento en el mapa, para que el resaltado funcione en ambos sentidos (lista → mapa y mapa → lista). */
  @Output() readonly eventSelected = new EventEmitter<string>();

  @ViewChild('mapEl', { static: true }) private mapElRef!: ElementRef<HTMLDivElement>;
  private readonly state = inject(FleetMapService);
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;
  private stationaryLayer?: L.LayerGroup;
  private trailLayer?: L.LayerGroup;
  private eventsLayer?: L.LayerGroup;
  private trailRequestSeq = 0;
  /** Último trazo dibujado (recto o pegado a calle) — se reusa en cada `zoomend` para no volver a pedir la ruta a OSRM. */
  private trailPath: [number, number][] | null = null;
  private trailArrowColor: string | null = null;
  private trailArrowMarkers: L.Marker[] = [];
  private stationaryRefreshInterval?: number;
  /**
   * Leaflet mide su contenedor una sola vez, al crearse — si después cambia
   * de tamaño por CSS/layout (no por una acción propia del mapa, ej. la
   * grilla de `following-view.component.ts` reacomodándose de 2x2 a "una
   * fila ocupa el ancho completo" cuando se deja de seguir una unidad), el
   * lienzo interno se queda con el tamaño viejo y la mitad se ve gris. Se
   * detecta con ResizeObserver en vez de escuchar un evento propio porque
   * el resize lo dispara un vecino del grid, no este componente.
   */
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      const unit = this.state.selectedUnit();
      if (unit && this.map && !this.focusPosition) this.map.flyTo(unit.position, Math.max(this.map.getZoom(), 16));
    });
  }

  ngOnInit(): void {
    this.map = L.map(this.mapElRef.nativeElement, {
      center: LIMA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      attributionControl: true,
      keyboard: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: MAX_ZOOM, maxNativeZoom: MAX_ZOOM }).addTo(
      this.map,
    );
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.stationaryLayer = L.layerGroup().addTo(this.map);
    this.trailLayer = L.layerGroup().addTo(this.map);
    this.eventsLayer = L.layerGroup().addTo(this.map);
    // 'moveend' cubre tanto pan como zoom (a diferencia de solo 'zoomend'),
    // así las flechas también se recalculan al arrastrar el mapa a zoom
    // alto, donde el viewport cubre una porción chica del trazo.
    this.map.on('moveend', this.redrawTrailArrows);
    this.renderUnits();
    // La señal de inactividad puede cruzar el umbral mientras el mapa sigue
    // abierto; actualizar el anillo sin esperar a que llegue otra posición.
    this.stationaryRefreshInterval = window.setInterval(() => this.renderUnits(), 60_000);
    this.renderTrail();
    this.renderEvents();
    const selectedUnit = this.state.selectedUnit();
    if (selectedUnit) this.map.flyTo(selectedUnit.position, Math.max(this.map.getZoom(), 16));
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapElRef.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['units'] && this.map) this.renderUnits();
    if (changes['trailPositions'] && this.map) this.renderTrail();
    if ((changes['eventMarkers'] || changes['selectedEventId']) && this.map) this.renderEvents();
    if (changes['focusPosition'] && this.map && this.focusPosition) {
      this.map.flyTo(this.focusPosition, Math.max(this.map.getZoom(), 16));
    }
  }

  private renderEvents(): void {
    if (!this.eventsLayer) return;
    this.eventsLayer.clearLayers();
    const events = this.eventMarkers ?? [];
    const selectedEvent = events.find((event) => event.id === this.selectedEventId);
    const hasSelection = !!selectedEvent;
    for (const event of events) {
      const selected = hasSelection && event.id === this.selectedEventId;
      // Al seleccionar uno, solo se atenúan los de OTRO tipo — los del
      // mismo tipo que el seleccionado se quedan igual de visibles (pedido
      // explícito: antes se opacaban todos menos el seleccionado).
      const dimmed = hasSelection && event.type !== selectedEvent!.type;
      const position = this.eventPosition(event);
      L.marker(position, {
        icon: createEventMarkerIcon(event.type, selected, dimmed),
        zIndexOffset: selected ? 1000 : 0,
      })
        .bindTooltip(event.label, { direction: 'top', offset: [0, -8] })
        .on('click', () => this.eventSelected.emit(event.id))
        .addTo(this.eventsLayer);
    }
    // Igual que en C-Locater: seleccionar un evento (desde la lista o el
    // propio mapa) centra el mapa ahí, así el usuario no tiene que ubicarlo
    // a ojo entre el resto de puntos atenuados.
    if (selectedEvent) {
      this.map?.flyTo(this.eventPosition(selectedEvent), Math.max(this.map.getZoom(), 16));
    }
  }

  /**
   * Usa `trailFraction` sobre `trailPath` — la línea que este componente ya
   * está dibujando (recta o pegada a calle vía OSRM) — en vez de la
   * posición que calculó `trip-events-panel.component.ts` de forma
   * independiente: si el evento se ubicara por su cuenta, en las curvas del
   * trazo pegado a calle quedaría al costado de la línea real, no encima.
   */
  private eventPosition(event: TripEvent): [number, number] {
    if (event.trailFraction === null || !this.trailPath || this.trailPath.length < 2) return event.position;
    return this.pointOnPath(this.trailPath, event.trailFraction);
  }

  private pointOnPath(path: readonly [number, number][], t: number): [number, number] {
    const clamped = Math.min(1, Math.max(0, t));
    const scaled = clamped * (path.length - 1);
    const index = Math.floor(scaled);
    const fraction = scaled - index;
    const start = path[index];
    const end = path[Math.min(index + 1, path.length - 1)];
    return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
  }

  private renderUnits(): void {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();
    this.stationaryLayer?.clearLayers();
    for (const unit of this.units) {
      if (isUnitStationaryOverThreshold(unit)) {
        L.circle(unit.position, {
          radius: STATIONARY_ALERT_RADIUS_METERS,
          color: '#c62828',
          weight: 2,
          opacity: 0.9,
          dashArray: '7 8',
          lineCap: 'round',
          fillColor: '#ef5350',
          fillOpacity: 0.09,
          interactive: true,
        })
          .on('click', () => this.state.selectUnit(unit))
          .addTo(this.stationaryLayer!);
      }
      L.marker(unit.position, { icon: createUnitIcon(unit) })
        .bindTooltip(`Última ubicación: ${unit.position[0].toFixed(6)}, ${unit.position[1].toFixed(6)}`, {
          direction: 'top',
          offset: [0, -60],
        })
        .on('click', () => this.state.selectUnit(unit))
        .addTo(this.markersLayer);
    }
  }

  private renderTrail(): void {
    if (!this.trailLayer) return;
    this.trailLayer.clearLayers();
    this.trailArrowMarkers = [];
    this.trailPath = null;
    const points = this.trailPositions;
    if (!points || points.length < 2) return;
    const brandColor =
      getComputedStyle(document.documentElement).getPropertyValue('--color-border-brand-default').trim() ||
      '#1b4079';
    // Rojo de alarma del mapa para las flechas: distinto del azul de la
    // línea, para que la dirección se lea de un vistazo (pedido explícito
    // tras validar el patrón — antes las flechas eran del mismo azul).
    this.trailArrowColor =
      getComputedStyle(document.documentElement).getPropertyValue('--color-map-alarm').trim() || '#f63d68';
    const endPoint = points[points.length - 1];
    L.marker(points[0], { icon: createTrailStartIcon(brandColor) }).addTo(this.trailLayer);
    // Línea recta mientras se resuelve la ruta pegada a calle — evita dejar
    // el mapa vacío si `fetchRoadRoute` tarda o falla.
    let line = this.drawTrailLine(points, brandColor);
    this.trailPath = points;
    this.redrawTrailArrows();

    const requestId = ++this.trailRequestSeq;
    void this.fetchRoadRoute(points).then((roadPoints) => {
      if (requestId !== this.trailRequestSeq || !this.map || !this.trailLayer || !roadPoints) return;
      this.trailLayer.removeLayer(line);
      // Se agrega `endPoint` al final para que la línea termine exacto en la
      // posición de la unidad, aunque el snapping a calle del último tramo
      // del ruteo quede a unos metros del pin.
      const roadPath = [...roadPoints, endPoint];
      line = this.drawTrailLine(roadPath, brandColor);
      this.trailPath = roadPath;
      this.redrawTrailArrows();
      // Los eventos se posicionaron con la recta inicial (o no se
      // posicionaron si aún no había `trailPath`); una vez que llega el
      // trazo pegado a calle hay que recalcularlos sobre ESE trazo.
      this.renderEvents();
    });
  }

  private drawTrailLine(points: [number, number][], color: string): L.Polyline {
    return L.polyline(points, { color, weight: 3, dashArray: '6, 6', className: 'fleet-trail-line' }).addTo(
      this.trailLayer!,
    );
  }

  /**
   * Recalcula y vuelve a dibujar solo las flechas (no la línea) con el
   * espaciado que corresponde al zoom actual — se llama al terminar de
   * dibujar la línea y en cada `moveend` (pan Y zoom) del mapa.
   *
   * Antes muestreaba TODO el trazo (`trailPath` completo, ~19 km de calles
   * pegadas con OSRM) sin importar cuánto de eso se veía en pantalla: a
   * zoom alto el espaciado en metros se reduce mucho (para mantener el
   * espaciado en píxeles), así que esos 19 km terminaban generando miles de
   * marcadores — cada uno con su propia animación CSS — y eso es lo que se
   * sentía lento. Ahora solo se muestrean puntos dentro del viewport actual
   * (con margen), así la cantidad de flechas queda acotada por lo que
   * realmente se ve, no por el largo total del recorrido.
   */
  private readonly redrawTrailArrows = (): void => {
    if (!this.trailLayer || !this.map || !this.trailPath || !this.trailArrowColor) return;
    this.trailArrowMarkers.forEach((arrow) => this.trailLayer!.removeLayer(arrow));
    const lat = this.trailPath[0][0];
    const spacingMeters = TRAIL_ARROW_SPACING_PX * metersPerPixelAtZoom(lat, this.map.getZoom());
    const visibleBounds = this.map.getBounds().pad(0.25);
    this.trailArrowMarkers = sampleDirectionPoints(this.trailPath, spacingMeters)
      .filter(({ position }) => visibleBounds.contains(position))
      .map(({ position, bearingDeg }, index) =>
        L.marker(position, { icon: createTrailArrowIcon(bearingDeg, this.trailArrowColor!, index * 0.25) }).addTo(
          this.trailLayer!,
        ),
      );
  };

  /**
   * Pega la trazabilidad a las calles reales usando el servidor demo
   * público de OSRM (sin API key, gratuito, sin SLA — aceptable mientras
   * el resto de la app también trabaja con datos demo). Si falla o no hay
   * ruta, `renderTrail` se queda con la línea recta entre puntos.
   */
  private async fetchRoadRoute(points: readonly [number, number][]): Promise<[number, number][] | null> {
    try {
      const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      const geometry = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
      if (!Array.isArray(geometry) || geometry.length < 2) return null;
      return geometry.map(([lng, lat]) => [lat, lng]);
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    if (this.stationaryRefreshInterval !== undefined) window.clearInterval(this.stationaryRefreshInterval);
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
