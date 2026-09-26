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
 * Pestaña activa: 'map', una Bitácora abierta, o `follow:<groupId>`
 * (Seguimiento). Primera versión de "Seguir unidad" (2026-09-25) probó un
 * mini-mapa flotando DENTRO del mapa principal; validado en vivo con Enzo
 * quedó chico para más de una unidad. La segunda versión pasó a una
 * pestaña propia, pero era UNA sola para toda la operación (hasta 4
 * unidades) — ajustado otra vez (2026-09-25) a VARIOS grupos de
 * seguimiento independientes, cada uno con su propia pestaña y hasta
 * `MAX_UNITS_PER_FOLLOWING_GROUP` unidades, mismo patrón que Bitácora
 * (una pestaña por cada bitácora abierta) — ver `following-view.component.ts`.
 */
export type FleetMapTabKey = 'map' | `bitacora:${string}` | `follow:${string}`;

/** Máximo de unidades por grupo de seguimiento — acotado por el espacio real disponible en pantalla (grilla 2x2 de `following-view.component.ts`), no un límite arbitrario de negocio. El usuario puede abrir varios grupos en paralelo si necesita seguir más unidades. */
export const MAX_UNITS_PER_FOLLOWING_GROUP = 4;

/** Un grupo de seguimiento abierto — su propia pestaña, con sus propias unidades y su propio orden de celdas. */
export interface FollowingGroup {
  readonly id: string;
  readonly unitIds: string[];
  /** Nombre personalizado (doble clic en la pestaña, como renombrar una hoja de Excel) — `undefined` usa el nombre automático "Seguimiento N" según su posición. */
  readonly name?: string;
}

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
  readonly activeTab = signal<FleetMapTabKey>('map');
  /**
   * Grupos de seguimiento abiertos, en el orden en que se crearon — cada
   * uno es su propia pestaña `follow:<id>` con hasta
   * `MAX_UNITS_PER_FOLLOWING_GROUP` unidades. Cada celda de
   * `following-view.component.ts` centra su propio mini-mapa vía
   * `[focusPosition]`, no depende de `selectedUnit` — por eso `openFollow`
   * no llama a `selectUnit`.
   */
  readonly followingGroups = signal<FollowingGroup[]>([]);

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
  readonly bitacoraUnit = computed(() => {
    const activeTab = this.activeTab();
    if (!activeTab.startsWith('bitacora:')) return null;
    const unitId = activeTab.slice('bitacora:'.length);
    return this.units().find((unit) => unit.id === unitId) ?? null;
  });
  /** El grupo de seguimiento de la pestaña activa — `null` si la pestaña activa no es una de seguimiento. */
  readonly activeFollowingGroup = computed<FollowingGroup | null>(() => {
    const tab = this.activeTab();
    if (!tab.startsWith('follow:')) return null;
    const groupId = tab.slice('follow:'.length);
    return this.followingGroups().find((group) => group.id === groupId) ?? null;
  });
  /** Unidades del grupo de seguimiento activo, en el orden en que se agregaron/reordenaron. */
  readonly activeFollowingUnits = computed<FleetUnit[]>(() => {
    const group = this.activeFollowingGroup();
    if (!group) return [];
    const units = this.units();
    return group.unitIds.map((id) => units.find((unit) => unit.id === id)).filter((unit): unit is FleetUnit => !!unit);
  });

  isFollowing(unitId: string): boolean {
    return this.followingGroups().some((group) => group.unitIds.includes(unitId));
  }

  /** Hay al menos un grupo de seguimiento abierto con espacio para una unidad más (sin contar crear uno nuevo). */
  hasFollowingGroupWithRoom(): boolean {
    return this.followingGroups().some((group) => group.unitIds.length < MAX_UNITS_PER_FOLLOWING_GROUP);
  }

  /** Reordena las celdas del grupo de seguimiento activo — arrastrar y soltar en `following-view.component.ts`, único lugar donde el orden de las unidades es relevante para el usuario. */
  reorderFollowing(fromIndex: number, toIndex: number): void {
    const group = this.activeFollowingGroup();
    if (!group) return;
    const ids = [...group.unitIds];
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return;
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);
    this.followingGroups.update((groups) => groups.map((g) => (g.id === group.id ? { ...g, unitIds: ids } : g)));
  }

  /** Abre la bitácora en una pestaña nueva, o cambia a la ya abierta si existe. */
  openBitacora(unit: FleetUnit): void {
    if (!this.openBitacoraUnitIds().includes(unit.id)) {
      this.openBitacoraUnitIds.update((ids) => [...ids, unit.id]);
    }
    this.activeTab.set(`bitacora:${unit.id}`);
    this.selectUnit(unit);
  }

  /**
   * Agrega la unidad a un grupo de seguimiento y cambia a esa pestaña. Si
   * ya se estaba siguiendo, solo cambia a su pestaña (no la duplica ni
   * crea un grupo nuevo). Si no, entra en el grupo activo si tiene
   * espacio; si no hay uno activo con espacio, en el último grupo abierto
   * que sí tenga; y si ninguno tiene espacio (o no hay ninguno abierto
   * todavía), abre un grupo nuevo — el usuario ya no se queda bloqueado al
   * llenar un grupo, simplemente empieza otro.
   */
  openFollow(unit: FleetUnit): void {
    const existingGroup = this.followingGroups().find((group) => group.unitIds.includes(unit.id));
    if (existingGroup) {
      this.activeTab.set(`follow:${existingGroup.id}`);
      return;
    }

    const active = this.activeFollowingGroup();
    if (active && active.unitIds.length < MAX_UNITS_PER_FOLLOWING_GROUP) {
      this.addUnitToGroup(active.id, unit.id);
      return;
    }

    const groups = this.followingGroups();
    const groupWithRoom = [...groups].reverse().find((group) => group.unitIds.length < MAX_UNITS_PER_FOLLOWING_GROUP);
    if (groupWithRoom) {
      this.addUnitToGroup(groupWithRoom.id, unit.id);
      this.activeTab.set(`follow:${groupWithRoom.id}`);
      return;
    }

    this.openNewFollowingGroup(unit);
  }

  /** Abre un grupo de seguimiento NUEVO con esta unidad, aunque ya exista otro grupo con espacio — acción explícita del menú "Seguir en un grupo nuevo". */
  openNewFollowingGroup(unit: FleetUnit): void {
    const id = `follow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    this.followingGroups.update((groups) => [...groups, { id, unitIds: [unit.id] }]);
    this.activeTab.set(`follow:${id}`);
  }

  private addUnitToGroup(groupId: string, unitId: string): void {
    this.followingGroups.update((groups) =>
      groups.map((group) => (group.id === groupId ? { ...group, unitIds: [...group.unitIds, unitId] } : group)),
    );
  }

  /** Deja de seguir una unidad puntual; si era la última del grupo, cierra el grupo entero. */
  stopFollowing(unitId: string): void {
    const group = this.followingGroups().find((g) => g.unitIds.includes(unitId));
    if (!group) return;
    this.removeUnitFromGroup(group.id, unitId);
  }

  private removeUnitFromGroup(groupId: string, unitId: string): void {
    const groups = this.followingGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const nextUnitIds = group.unitIds.filter((id) => id !== unitId);
    const nextGroups = nextUnitIds.length
      ? groups.map((g) => (g.id === groupId ? { ...g, unitIds: nextUnitIds } : g))
      : groups.filter((g) => g.id !== groupId);
    this.followingGroups.set(nextGroups);
    if (!nextUnitIds.length) this.fallbackFromClosedFollowingGroup(groupId, groups);
  }

  /**
   * Renombra un grupo de seguimiento — doble clic en el texto de su
   * pestaña, mismo patrón que renombrar una hoja de Excel (pedido
   * explícito). Un nombre vacío (tras recortar espacios) vuelve al nombre
   * automático "Seguimiento N", no deja una pestaña sin texto.
   */
  renameFollowingGroup(groupId: string, name: string): void {
    const trimmed = name.trim();
    this.followingGroups.update((groups) =>
      groups.map((group) => (group.id === groupId ? { ...group, name: trimmed || undefined } : group)),
    );
  }

  /** Cierra un grupo de seguimiento entero (botón de cerrar de su pestaña). */
  closeFollowingGroup(groupId: string): void {
    const groups = this.followingGroups();
    if (!groups.some((g) => g.id === groupId)) return;
    this.followingGroups.set(groups.filter((g) => g.id !== groupId));
    this.fallbackFromClosedFollowingGroup(groupId, groups);
  }

  /** Si la pestaña cerrada estaba activa, cae al grupo de seguimiento anterior o a Mapa — mismo criterio que `closeBitacoraTab`. */
  private fallbackFromClosedFollowingGroup(closedGroupId: string, groupsBeforeClose: FollowingGroup[]): void {
    if (this.activeTab() !== `follow:${closedGroupId}`) return;
    const closingIndex = groupsBeforeClose.findIndex((g) => g.id === closedGroupId);
    const remaining = groupsBeforeClose.filter((g) => g.id !== closedGroupId);
    const fallback = remaining[closingIndex - 1] ?? remaining[0];
    this.activeTab.set(fallback ? `follow:${fallback.id}` : 'map');
  }

  // ---------------------------------------------------------------------
  // Confirmación antes de dejar de seguir — pedido explícito: un clic en la
  // "x" (de una celda o de una pestaña entera) puede ser un error, sobre
  // todo con un grupo lleno, donde cerrar una unidad para abrir otra es un
  // flujo normal pero cerrar la equivocada es costoso (hay que volver a
  // buscarla y abrirla de nuevo). `requestStopFollowing*` abre la
  // confirmación en vez de cerrar directo; `stopFollowing`/
  // `closeFollowingGroup` siguen siendo los que de verdad mutan el estado,
  // recién al confirmar.
  // ---------------------------------------------------------------------
  readonly pendingStopTarget = signal<
    | { kind: 'unit'; unitId: string; unitLabel: string }
    | { kind: 'group'; groupId: string; count: number }
    | null
  >(null);

  readonly stopFollowingConfirmTitle = computed(() =>
    this.pendingStopTarget()?.kind === 'group' ? 'Cerrar seguimiento' : 'Dejar de seguir unidad',
  );
  readonly stopFollowingConfirmCopy = computed(() => {
    const target = this.pendingStopTarget();
    if (!target) return '';
    return target.kind === 'group'
      ? `¿Seguro que quieres cerrar el seguimiento de las ${target.count} unidades de este grupo? Vas a tener que volver a abrirlas una por una.`
      : `¿Seguro que quieres dejar de seguir a ${target.unitLabel}?`;
  });

  requestStopFollowing(unit: FleetUnit): void {
    this.pendingStopTarget.set({ kind: 'unit', unitId: unit.id, unitLabel: `${unit.name} · ${unit.vehicleCode}` });
  }

  requestCloseFollowingGroup(groupId: string): void {
    const group = this.followingGroups().find((g) => g.id === groupId);
    if (!group) return;
    this.pendingStopTarget.set({ kind: 'group', groupId, count: group.unitIds.length });
  }

  confirmStopFollowing(): void {
    const target = this.pendingStopTarget();
    this.pendingStopTarget.set(null);
    if (!target) return;
    if (target.kind === 'unit') this.stopFollowing(target.unitId);
    else this.closeFollowingGroup(target.groupId);
  }

  cancelStopFollowing(): void {
    this.pendingStopTarget.set(null);
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

  /** Vuelve a Mapa sin cerrar las bitácoras abiertas — quedan disponibles como pestañas. */
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
