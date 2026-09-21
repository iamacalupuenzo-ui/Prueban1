import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, effect, inject } from '@angular/core';
import * as L from 'leaflet';
import type { FleetUnit, FleetUnitType } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService } from './fleet-map.service';

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

function estimatePillWidth(label: string, secondary: string): number {
  const textWidth = Math.max(label.length * 6.5, secondary.length * 5.5);
  const padStart = 4; // --layout-padding-xs
  const padEnd = 12; // --layout-padding-lg
  const gap = 6; // --layout-gap-sm
  const border = 4; // 2px de cada lado
  return Math.ceil(ICON_CIRCLE_PX + gap + textWidth + padStart + padEnd + border);
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
    <div style="display:inline-flex;flex-direction:column;align-items:center;font-family:var(--font-family-content);">
      <div style="display:inline-flex;align-items:center;gap:var(--layout-gap-sm);padding-block:var(--layout-padding-xs);padding-inline:var(--layout-padding-xs) var(--layout-padding-lg);border-radius:var(--radius-full);background:var(--elevation-surface-default);box-shadow:var(--shadow-md);border:2px solid var(--elevation-surface-default);">
        <div style="position:relative;flex-shrink:0;width:${ICON_CIRCLE_PX}px;height:${ICON_CIRCLE_PX}px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-full);background:var(--color-background-neutral-subtlest);border:1px solid var(--color-border-neutral-subtle);color:var(--color-text-base-subtle);">
          <svg width="${ICON_GLYPH_PX}" height="${ICON_GLYPH_PX}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_ICON_PATH[unit.type]}</svg>
          <div style="position:absolute;top:-1px;right:-1px;width:${STATUS_DOT_PX}px;height:${STATUS_DOT_PX}px;border-radius:var(--radius-full);border:2px solid var(--elevation-surface-default);background:var(--color-map-vehicle-${status});"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--layout-gap-2xs);line-height:1;">
          <span style="font-size:var(--font-size-label-small);font-weight:var(--font-weight-bold);color:var(--color-text-base-boldest);line-height:1;white-space:nowrap;">${unit.name}</span>
          <span style="font-size:var(--font-size-label-micro);font-weight:var(--font-weight-emphasis);color:var(--color-text-base-subtlest);line-height:1;white-space:nowrap;">${secondary}</span>
        </div>
      </div>
      <div style="width:2px;height:${stemHeight}px;background:var(--color-border-neutral-boldest);opacity:.5;"></div>
      <div style="width:${stemDot}px;height:${stemDot}px;border-radius:var(--radius-full);background:var(--color-border-neutral-boldest);"></div>
    </div>`;

  return L.divIcon({ html, className: '', iconSize: [pillWidth, totalHeight], iconAnchor: [pillWidth / 2, totalHeight] });
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

  @ViewChild('mapEl', { static: true }) private mapElRef!: ElementRef<HTMLDivElement>;
  private readonly state = inject(FleetMapService);
  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  constructor() {
    effect(() => {
      const unit = this.state.selectedUnit();
      if (unit && this.map) this.map.flyTo(unit.position, Math.max(this.map.getZoom(), 16));
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
    this.renderUnits();
    const selectedUnit = this.state.selectedUnit();
    if (selectedUnit) this.map.flyTo(selectedUnit.position, Math.max(this.map.getZoom(), 16));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['units'] && this.map) this.renderUnits();
  }

  private renderUnits(): void {
    if (!this.markersLayer) return;
    this.markersLayer.clearLayers();
    for (const unit of this.units) {
      L.marker(unit.position, { icon: createUnitIcon(unit) })
        .on('click', () => this.state.selectUnit(unit))
        .addTo(this.markersLayer);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
