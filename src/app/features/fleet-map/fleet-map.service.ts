import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AppLayoutState } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  financieraFor,
  FleetTelemetryService,
  type FleetUnit,
} from '../../core/fleet/fleet-telemetry.service';
import type { CaptureFinanciera } from '../../core/orders/mock-capture-orders.service';

export type FleetMapStatusFilter = 'all' | 'route' | 'offline';
export type FleetMapFinancieraFilter = 'all' | CaptureFinanciera;
/**
 * Pestaña activa: 'map' o una unidad abierta en Bitácora o en Seguimiento
 * ("Seguir unidad"). Prefijadas porque la misma unidad puede tener las dos
 * pestañas abiertas a la vez — Bitácora (historial completo) y Seguimiento
 * (solo el mapa centrado en ella, sin el resto de información) son vistas
 * independientes, no una reemplaza a la otra. Ver la aclaración de Enzo
 * (23 sep. 2026): "el problema con ver bitácora es que me arroja mucha
 * información que no necesito... simplemente seguir, seguir unidad".
 */
export type FleetMapTabKey = 'map' | `bitacora:${string}` | `follow:${string}`;

/**
 * Estado compartido de la vista de mapa. Centraliza la búsqueda, los filtros
 * y la unidad seleccionada para que el panel flotante y el lienzo cartográfico
 * trabajen sobre el mismo conjunto de unidades sin prop-drilling.
 */
@Injectable()
export class FleetMapService {
  private readonly telemetry = inject(FleetTelemetryService);
  private readonly layoutState = inject(AppLayoutState);

  readonly query = signal('');
  readonly status = signal<FleetMapStatusFilter>('all');
  readonly financiera = signal<FleetMapFinancieraFilter>('all');
  readonly selectedUnitId = signal<string | null>(null);
  /** UI local, no persiste entre sesiones — "Fijar" desde el menú de la card. */
  readonly pinnedUnitIds = signal<ReadonlySet<string>>(new Set());

  readonly units = this.telemetry.units.asReadonly();
  readonly filteredUnits = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const status = this.status();
    const financiera = this.financiera();
    const pinned = this.pinnedUnitIds();

    const matches = this.units().filter((unit) => {
      const matchesQuery = !query || `${unit.name} ${unit.vehicleCode} ${unit.id}`.toLocaleLowerCase().includes(query);
      const matchesStatus = status === 'all' || (status === 'route' ? unit.status === 'En ruta' : unit.status === 'Sin señal');
      const matchesFinanciera = financiera === 'all' || financieraFor(unit) === financiera;
      return matchesQuery && matchesStatus && matchesFinanciera;
    });
    if (!pinned.size) return matches;
    // Las unidades fijadas suben al inicio de la lista, conservando el orden
    // relativo dentro de cada grupo (fijadas / no fijadas).
    return [...matches].sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
  });
  /**
   * "Fijar" no es solo un orden — el grupo fijado se renderiza aparte para
   * quedar pegado (`position: sticky`) arriba del scroll, como en
   * FloatingMonitor.tsx (C-Locater): las fijadas siguen visibles aunque el
   * operador baje por el resto de la lista.
   */
  readonly pinnedFilteredUnits = computed(() => {
    const pinned = this.pinnedUnitIds();
    return pinned.size ? this.filteredUnits().filter((unit) => pinned.has(unit.id)) : [];
  });
  readonly unpinnedFilteredUnits = computed(() => {
    const pinned = this.pinnedUnitIds();
    return pinned.size ? this.filteredUnits().filter((unit) => !pinned.has(unit.id)) : this.filteredUnits();
  });
  readonly selectedUnit = computed(() => {
    const selectedUnitId = this.selectedUnitId();
    return selectedUnitId ? this.units().find((unit) => unit.id === selectedUnitId) ?? null : null;
  });

  setQuery(value: string): void {
    this.query.set(value);
  }

  setStatus(value: FleetMapStatusFilter): void {
    this.status.set(value);
  }

  setFinanciera(value: FleetMapFinancieraFilter): void {
    this.financiera.set(value);
  }

  selectUnit(unit: FleetUnit): void {
    this.selectedUnitId.set(unit.id);
  }

  deselectUnit(): void {
    this.selectedUnitId.set(null);
  }

  clearFilters(): void {
    this.query.set('');
    this.status.set('all');
    this.financiera.set('all');
  }

  isPinned(unitId: string): boolean {
    return this.pinnedUnitIds().has(unitId);
  }

  togglePin(unitId: string): void {
    this.pinnedUnitIds.update((pinned) => {
      const next = new Set(pinned);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  // ---------------------------------------------------------------------
  // Pestañas: Mapa (fija, siempre presente) + una por cada Bitácora o
  // Seguimiento abiertos. Vive acá (no en una ruta Angular) porque el
  // sistema de pestañas queda acotado a Explorar/Mapa, no es global a la
  // app — ver
  // `docs/epica-a-plan-desarrollo-fleet-operations-bitacora-v1-2026-09-21.md`.
  // ---------------------------------------------------------------------
  readonly openBitacoraUnitIds = signal<string[]>([]);
  readonly openFollowUnitIds = signal<string[]>([]);
  readonly activeTab = signal<FleetMapTabKey>('map');

  /**
   * Bitácora necesita el ancho completo — al abrirla se colapsa el sidebar
   * principal (AppLayoutState, compartido con toda la app) y al volver a
   * Mapa se restaura el estado que tenía antes, en vez de forzarlo siempre
   * expandido.
   */
  private sidebarCollapsedBeforeBitacora: boolean | null = null;
  private readonly syncSidebarWithTab = effect(() => {
    const tab = this.activeTab();
    if (tab === 'map') {
      const previous = this.sidebarCollapsedBeforeBitacora;
      if (previous !== null) {
        this.sidebarCollapsedBeforeBitacora = null;
        this.layoutState.setCollapsed(previous);
      }
    } else {
      if (this.sidebarCollapsedBeforeBitacora === null) {
        this.sidebarCollapsedBeforeBitacora = untracked(() => this.layoutState.collapsed());
      }
      this.layoutState.setCollapsed(true);
    }
  });

  readonly openBitacoraUnits = computed(() => {
    const units = this.units();
    return this.openBitacoraUnitIds()
      .map((id) => units.find((unit) => unit.id === id))
      .filter((unit): unit is FleetUnit => !!unit);
  });
  readonly openFollowUnits = computed(() => {
    const units = this.units();
    return this.openFollowUnitIds()
      .map((id) => units.find((unit) => unit.id === id))
      .filter((unit): unit is FleetUnit => !!unit);
  });
  readonly bitacoraUnit = computed(() => {
    const activeTab = this.activeTab();
    if (!activeTab.startsWith('bitacora:')) return null;
    const unitId = activeTab.slice('bitacora:'.length);
    return this.units().find((unit) => unit.id === unitId) ?? null;
  });
  /** Unidad de la pestaña "Seguir unidad" activa — mapa a pantalla completa sin el resto de Bitácora, ver `follow-unit-view.component.ts`. */
  readonly followUnit = computed(() => {
    const activeTab = this.activeTab();
    if (!activeTab.startsWith('follow:')) return null;
    const unitId = activeTab.slice('follow:'.length);
    return this.units().find((unit) => unit.id === unitId) ?? null;
  });

  /** Abre la bitácora en una pestaña nueva, o cambia a la ya abierta si existe. */
  openBitacora(unit: FleetUnit): void {
    if (!this.openBitacoraUnitIds().includes(unit.id)) {
      this.openBitacoraUnitIds.update((ids) => [...ids, unit.id]);
    }
    this.activeTab.set(`bitacora:${unit.id}`);
    this.selectUnit(unit);
  }

  /**
   * Abre "Seguir unidad" en una pestaña nueva, o cambia a la ya abierta si
   * existe — el mismo patrón de `openBitacora`, pero para la vista liviana
   * de seguimiento (solo mapa, sin posiciones/eventos/orden).
   */
  openFollow(unit: FleetUnit): void {
    if (!this.openFollowUnitIds().includes(unit.id)) {
      this.openFollowUnitIds.update((ids) => [...ids, unit.id]);
    }
    this.activeTab.set(`follow:${unit.id}`);
    this.selectUnit(unit);
  }

  switchTab(tab: FleetMapTabKey): void {
    this.activeTab.set(tab);
  }

  /** Cierra una pestaña de bitácora; si estaba activa, cae a la pestaña previa o a Mapa. */
  closeBitacoraTab(unitId: string): void {
    const ids = this.openBitacoraUnitIds();
    const closingIndex = ids.indexOf(unitId);
    if (closingIndex === -1) return;

    const nextIds = ids.filter((id) => id !== unitId);
    this.openBitacoraUnitIds.set(nextIds);

    if (this.activeTab() === `bitacora:${unitId}`) {
      const fallbackId = nextIds[closingIndex - 1] ?? nextIds[0];
      this.activeTab.set(fallbackId ? `bitacora:${fallbackId}` : 'map');
    }
  }

  /** Cierra una pestaña de seguimiento; si estaba activa, cae a la pestaña previa o a Mapa. */
  closeFollowTab(unitId: string): void {
    const ids = this.openFollowUnitIds();
    const closingIndex = ids.indexOf(unitId);
    if (closingIndex === -1) return;

    const nextIds = ids.filter((id) => id !== unitId);
    this.openFollowUnitIds.set(nextIds);

    if (this.activeTab() === `follow:${unitId}`) {
      const fallbackId = nextIds[closingIndex - 1] ?? nextIds[0];
      this.activeTab.set(fallbackId ? `follow:${fallbackId}` : 'map');
    }
  }

  /** Vuelve a Mapa sin cerrar las bitácoras/seguimientos abiertos — quedan disponibles como pestañas. */
  closeBitacora(): void {
    this.activeTab.set('map');
  }

  // ---------------------------------------------------------------------
  // Mensaje de retroalimentación (toast) — mismo patrón que RecoveriesService/
  // CaptureOrdersService.
  // ---------------------------------------------------------------------
  readonly message = signal('');
  readonly messageKind = signal<'success' | 'error' | 'info'>('success');
  private feedbackTimeout?: number;

  showMessage(kind: 'success' | 'error' | 'info', message: string, duration = 4000): void {
    this.dismissMessage();
    this.messageKind.set(kind);
    this.message.set(message);
    if (kind !== 'error') this.feedbackTimeout = window.setTimeout(() => this.dismissMessage(), duration);
  }

  dismissMessage(): void {
    if (this.feedbackTimeout !== undefined) window.clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = undefined;
    this.message.set('');
  }

  async copyUnitLocation(unit: FleetUnit): Promise<void> {
    const [lat, lng] = unit.position;
    const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const mapsUrl = new URL('https://www.google.com/maps/search/');
    mapsUrl.searchParams.set('api', '1');
    mapsUrl.searchParams.set('query', coordinates);
    if (!(await this.copyText(mapsUrl.toString()))) {
      this.showMessage('error', 'No pudimos copiar el enlace de Google Maps. Inténtalo nuevamente.');
      return;
    }
    this.showMessage('success', `Enlace de Google Maps de la placa ${unit.name} copiado.`, 2000);
  }

  private async copyText(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const copyField = document.createElement('textarea');
      copyField.value = value;
      copyField.style.position = 'fixed';
      copyField.style.opacity = '0';
      document.body.appendChild(copyField);
      copyField.select();
      const copied = document.execCommand('copy');
      copyField.remove();
      return copied;
    }
  }
}
