import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import {
  DropdownItemComponent,
  Icon,
  InputGroupInput,
  Popover,
  type DropdownItem,
  type IconName,
} from '@iamacalupuenzo-ui/comsatel-ds';
import type { FleetUnit, FleetUnitType } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService, type FleetMapFinancieraFilter, type FleetMapStatusFilter } from './fleet-map.service';

// El filtro es de estado de señal GPS (no de ruta/movimiento): "En ruta" se
// renombró a "Con señal" para no confundirlo con el estado de encendido.
const STATUS_OPTIONS: readonly { value: FleetMapStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'route', label: 'Con señal' },
  { value: 'offline', label: 'Sin señal' },
];
/**
 * Reemplaza al filtro de tipo de unidad (Auto/Camión/Bus/Moto) — a pedido
 * de Enzo (23 sep. 2026): junto con Estado, la financiera (aseguradora
 * dueña de la unidad) es uno de los dos filtros que realmente importan acá.
 */
const FINANCIERA_OPTIONS: readonly { value: FleetMapFinancieraFilter; label: string }[] = [
  { value: 'all', label: 'Todas las financieras' },
  { value: 'Santander', label: 'Santander' },
  { value: 'Mapfre', label: 'Mapfre' },
];
const TYPE_ICONS: Record<FleetUnitType, IconName> = { car: 'car', truck: 'truck', bus: 'bus', motorcycle: 'bike' };

/** Buscador flotante adaptado al patrón de C-Locater con tokens FleetOperations. */
@Component({
  selector: 'app-fleet-map-search',
  imports: [DropdownItemComponent, Icon, InputGroupInput, NgTemplateOutlet, Popover],
  template: `
    @if (isOpen()) {
      <section class="monitor" aria-label="Buscar y filtrar unidades">
        <div class="monitor__search">
          <cs-icon name="search" [size]="16" aria-hidden="true" />
          <cs-input-group-input #searchInput fieldSize="md" type="text" autocomplete="off" [placeholder]="'Buscar ' + state.units().length + ' unidades...'" aria-label="Buscar por nombre o código de unidad" [value]="state.query()" (valueChange)="state.setQuery($event)" />
          @if (state.query()) { <button type="button" class="monitor__icon-button" aria-label="Limpiar búsqueda" (click)="state.setQuery('')"><cs-icon name="x" [size]="14" aria-hidden="true" /></button> }
          <span class="monitor__separator" aria-hidden="true"></span>
          <button type="button" class="monitor__icon-button" aria-label="Contraer buscador" (click)="isOpen.set(false)"><cs-icon name="x" [size]="16" aria-hidden="true" /></button>
        </div>

        <div class="monitor__filters" aria-label="Filtros de unidades">
          <button #statusTrigger type="button" class="filter-control" [class.is-active]="state.status() !== 'all'" [attr.aria-expanded]="openFilter() === 'status'" (click)="toggleFilter('status')"><cs-icon name="tag" [size]="14" aria-hidden="true" /><span>{{ statusLabel() }}</span><cs-icon name="chevron-down" [size]="12" class="filter-control__chevron" aria-hidden="true" /></button>
          <button #financieraTrigger type="button" class="filter-control" [class.is-active]="state.financiera() !== 'all'" [attr.aria-expanded]="openFilter() === 'financiera'" (click)="toggleFilter('financiera')"><cs-icon name="sliders" [size]="14" aria-hidden="true" /><span>{{ financieraLabel() }}</span><cs-icon name="chevron-down" [size]="12" class="filter-control__chevron" aria-hidden="true" /></button>
        </div>

        <cs-popover [isOpen]="openFilter() === 'status'" [triggerRef]="statusTrigger" placement="bottom-start" [offset]="4" role="listbox" ariaLabel="Filtrar por estado" (closed)="openFilter.set(null)"><div class="filter-menu">@for (option of statusOptions; track option.value) { <button type="button" role="option" [attr.aria-selected]="state.status() === option.value" [class.is-selected]="state.status() === option.value" (click)="setStatus(option.value)"><span class="filter-menu__label">{{ option.label }}</span>@if (state.status() === option.value) { <cs-icon name="check" [size]="16" class="filter-menu__check" aria-hidden="true" /> }</button> }</div></cs-popover>
        <cs-popover [isOpen]="openFilter() === 'financiera'" [triggerRef]="financieraTrigger" placement="bottom-start" [offset]="4" role="listbox" ariaLabel="Filtrar por financiera" (closed)="openFilter.set(null)"><div class="filter-menu">@for (option of financieraOptions; track option.value) { <button type="button" role="option" [attr.aria-selected]="state.financiera() === option.value" [class.is-selected]="state.financiera() === option.value" (click)="setFinanciera(option.value)"><span class="filter-menu__label">{{ option.label }}</span>@if (state.financiera() === option.value) { <cs-icon name="check" [size]="16" class="filter-menu__check" aria-hidden="true" /> }</button> }</div></cs-popover>

        <div #resultsList class="monitor__results" role="list" aria-label="Unidades encontradas" (scroll)="checkScroll()">
          @if (state.pinnedFilteredUnits().length) {
            <div class="vehicle-card-group--pinned">
              @for (unit of state.pinnedFilteredUnits(); track unit.id) {
                <ng-container [ngTemplateOutlet]="vehicleCard" [ngTemplateOutletContext]="{ $implicit: unit }" />
              }
              <div class="vehicle-card-group__divider" aria-hidden="true"></div>
            </div>
          }
          @for (unit of state.unpinnedFilteredUnits(); track unit.id) {
            <ng-container [ngTemplateOutlet]="vehicleCard" [ngTemplateOutletContext]="{ $implicit: unit }" />
          } @empty {
            @if (!state.pinnedFilteredUnits().length) { <p class="monitor__empty" role="status">Sin resultados</p> }
          }
        </div>
        @if (showScrollHint()) {
          <div class="scroll-hint" aria-hidden="true">
            <cs-icon name="chevron-down" [size]="16" class="scroll-hint__chevron" />
          </div>
        }
      </section>
    } @else {
      <button type="button" class="collapsed-search" (click)="openSearch()"><cs-icon name="search" [size]="16" aria-hidden="true" /><span>Buscar {{ state.units().length }} unidades...</span></button>
    }

    <ng-template #vehicleCard let-unit>
      <div class="vehicle-card" [class.is-selected]="state.selectedUnitId() === unit.id" [class.is-pinned]="state.isPinned(unit.id)" role="listitem">
        <button type="button" class="vehicle-card__main" [attr.aria-pressed]="state.selectedUnitId() === unit.id" (click)="state.selectUnit(unit)">
          <span class="vehicle-card__avatar">
            <cs-icon [name]="typeIcon(unit)" [size]="20" aria-hidden="true" />
            <span class="vehicle-card__gps" [class.vehicle-card__gps--on]="unit.status === 'En ruta'" aria-hidden="true"><cs-icon name="satellite" [size]="10" /></span>
            <span class="vehicle-card__ignition" [class.vehicle-card__ignition--on]="unit.ignition === 'on'" aria-hidden="true"><cs-icon [name]="unit.ignition === 'on' ? 'activity' : 'power-off'" [size]="10" /></span>
          </span>
          <span class="vehicle-card__body">
            <span class="vehicle-card__title"><strong>{{ unit.name }}</strong><span>{{ unit.vehicleCode }}</span></span>
            <span class="vehicle-card__date">{{ formattedDate(unit) }}</span>
          </span>
        </button>
        <span class="vehicle-card__aside">
          <span #menuTrigger class="vehicle-card__menu-trigger">
            <button type="button" class="vehicle-card__menu" [attr.aria-expanded]="openActionMenuUnitId() === unit.id" [attr.aria-label]="'Más acciones para ' + unit.name" (click)="toggleActionMenu(unit.id)"><cs-icon name="more-horizontal" [size]="18" aria-hidden="true" /></button>
          </span>
          <cs-popover [isOpen]="openActionMenuUnitId() === unit.id" [triggerRef]="menuTrigger" placement="bottom-end" [offset]="4" role="menu" [ariaLabel]="'Acciones para ' + unit.name" (closed)="closeActionMenu()">
            <div class="vehicle-card-menu">
              @for (item of actionItems(unit); track item.value) {
                <cs-dropdown-item [item]="item" size="sm" selectionMode="none" (itemSelect)="runAction(unit, $event)" />
              }
            </div>
          </cs-popover>
        </span>
      </div>
    </ng-template>
  `,
  styles: [`
    :host{position:absolute;z-index:500;top:var(--layout-padding-md);bottom:var(--layout-padding-md);left:var(--layout-padding-md);display:block;inline-size:306px;max-inline-size:calc(100% - (var(--layout-padding-md) * 2));overflow:hidden;pointer-events:none}button{font:inherit}.monitor{pointer-events:auto;border:var(--layout-border-thin) solid var(--color-border-neutral-subtle);border-radius:var(--radius-md);background:#f8f5ed;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;block-size:100%;overflow:hidden}.monitor__search{display:grid;flex-shrink:0;grid-template-columns:auto minmax(0,1fr) auto auto auto;align-items:center;gap:var(--layout-gap-sm);min-block-size:48px;padding-inline:var(--layout-padding-md);color:var(--color-text-base-subtlest);border-bottom:var(--layout-border-thin) solid var(--color-border-divider)}.monitor__icon-button{display:grid;place-items:center;padding:var(--layout-padding-2xs);border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-subtlest);cursor:pointer}.monitor__icon-button:hover,.filter-control:hover{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.monitor__separator{inline-size:var(--layout-border-thin);block-size:16px;background:var(--color-border-divider)}.monitor__filters{display:flex;flex-shrink:0;align-items:center;gap:var(--layout-gap-xs);padding:var(--layout-padding-sm);border-bottom:var(--layout-border-thin) solid var(--color-border-divider);min-inline-size:0}.monitor__filters .filter-control{flex:1 1 0;min-inline-size:0}.monitor__filters .filter-control span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-inline-size:0}.filter-control__chevron{flex-shrink:0;margin-inline-start:auto}.filter-control{display:inline-flex;align-items:center;gap:var(--layout-gap-xs);min-block-size:28px;padding-inline:var(--layout-padding-sm);border:var(--layout-border-thin) solid var(--color-border-neutral-default);border-radius:var(--radius-sm);background:var(--elevation-surface-default);color:var(--color-text-base-subtlest);font-size:var(--font-size-content-note);font-weight:var(--font-weight-regular);line-height:var(--font-line-height-content-note);cursor:pointer;transition:border-color var(--motion-duration-fast) var(--motion-easing-default)}.filter-control.is-active{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.filter-menu{display:grid;min-inline-size:132px;padding-block:var(--layout-padding-xs);border:var(--layout-border-thin) solid var(--color-border-neutral-default);border-radius:var(--radius-lg);background:var(--color-background-base);box-shadow:var(--shadow-xl)}.filter-menu button{display:flex;align-items:center;gap:var(--layout-gap-sm);margin-inline:var(--layout-padding-xs);block-size:32px;padding-inline:10px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-default);font-weight:var(--font-weight-accent);font-size:var(--font-size-content-ui);line-height:var(--font-line-height-content-ui);text-align:left;cursor:pointer}.filter-menu button:hover:not(.is-selected){background:var(--color-background-neutral-subtlest-hover)}.filter-menu button.is-selected{font-weight:var(--font-weight-emphasis);color:var(--color-text-brand-bolder);background:var(--color-background-brand-subtlest)}.filter-menu__label{flex:1;min-inline-size:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.filter-menu__check{flex-shrink:0;color:var(--color-text-brand-bolder)}.monitor__results{display:grid;flex:1 1 auto;min-block-size:0;align-content:start;gap:var(--layout-gap-sm);overflow-y:auto;padding:var(--layout-padding-sm);scrollbar-width:none}.monitor__results::-webkit-scrollbar{display:none}.vehicle-card-group--pinned{position:sticky;top:calc(var(--layout-padding-sm) * -1);z-index:1;display:grid;gap:var(--layout-gap-sm);margin-top:calc(var(--layout-padding-sm) * -1);padding-top:var(--layout-padding-sm);padding-bottom:var(--layout-gap-2xs);background:#f8f5ed}.vehicle-card-group__divider{block-size:var(--layout-border-thin);margin-inline:var(--layout-padding-sm);background:var(--color-border-divider)}.scroll-hint{position:sticky;bottom:0;left:0;right:0;flex-shrink:0;display:flex;justify-content:center;padding-block:var(--layout-padding-2xs) var(--layout-padding-sm);pointer-events:none;background:linear-gradient(to bottom,transparent,#f8f5ed 55%)}.scroll-hint__chevron{color:var(--color-text-base-subtlest);animation:scroll-hint-bounce .9s ease-in-out infinite}@keyframes scroll-hint-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}.vehicle-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--layout-gap-sm);min-block-size:64px;padding:var(--layout-padding-lg);border:var(--layout-border-thin) solid var(--color-border-divider);border-radius:var(--radius-md);background:var(--elevation-surface-default);transition:border-color var(--motion-duration-fast) var(--motion-easing-standard),box-shadow var(--motion-duration-fast) var(--motion-easing-standard)}.vehicle-card:has(.vehicle-card__main:hover){border-color:var(--color-border-brand-default);box-shadow:var(--shadow-sm)}.vehicle-card.is-selected{border-color:var(--color-border-brand-default);box-shadow:var(--shadow-sm)}.vehicle-card.is-pinned{background:var(--color-background-brand-subtlest)}.vehicle-card__main{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:var(--layout-gap-md);min-inline-size:0;padding:0;border:0;background:transparent;color:var(--color-text-base-default);text-align:left;cursor:pointer}.vehicle-card__avatar{position:relative;display:grid;place-items:center;inline-size:40px;block-size:40px;border-radius:var(--radius-full);background:var(--color-background-neutral-subtlest);border:1.5px solid var(--color-border-neutral-default);color:var(--color-icon-neutral-default)}.vehicle-card__gps{position:absolute;top:-2px;right:-2px;display:grid;place-items:center;inline-size:16px;block-size:16px;border-radius:var(--radius-full);background:var(--color-map-vehicle-offline);box-shadow:var(--shadow-sm);color:var(--color-text-inverse)}.vehicle-card__gps--on{background:var(--color-map-vehicle-active)}.vehicle-card__ignition{position:absolute;bottom:-2px;left:-2px;display:grid;place-items:center;inline-size:16px;block-size:16px;border-radius:var(--radius-full);background:var(--color-background-danger-default);box-shadow:var(--shadow-sm);color:var(--color-text-inverse)}.vehicle-card__ignition--on{background:var(--color-map-vehicle-active)}.vehicle-card__body{display:grid;min-inline-size:0;gap:var(--layout-gap-2xs)}.vehicle-card__title{display:flex;align-items:baseline;gap:var(--layout-gap-xs);min-inline-size:0}.vehicle-card__title strong{overflow:hidden;font-size:var(--font-size-content-ui);font-weight:var(--font-weight-bold);line-height:var(--font-line-height-content-ui);text-overflow:ellipsis;white-space:nowrap}.vehicle-card__title span{overflow:hidden;color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);line-height:var(--font-line-height-content-note);text-overflow:ellipsis;white-space:nowrap}.vehicle-card__date{color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);line-height:var(--font-line-height-content-note)}.vehicle-card__aside{display:grid;place-items:center;align-self:stretch}.vehicle-card__menu-trigger{display:inline-flex}.vehicle-card__menu{display:grid;place-items:center;inline-size:var(--layout-size-sm);block-size:var(--layout-size-sm);padding:0;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-subtlest);cursor:pointer;transform:rotate(90deg)}.vehicle-card__menu:hover{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.vehicle-card-menu{display:grid;min-inline-size:180px;padding:var(--layout-padding-xs);border:var(--layout-border-thin) solid var(--color-border-neutral-default);border-radius:var(--radius-lg);background:var(--color-background-base);box-shadow:var(--shadow-xl)}.monitor__empty{margin:0;padding:var(--layout-padding-2xl);color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);text-align:center}.collapsed-search{pointer-events:auto;border:var(--layout-border-thin) solid var(--color-border-neutral-subtle);border-radius:var(--radius-full);background:#f8f5ed;box-shadow:var(--shadow-lg);display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:var(--layout-gap-sm);inline-size:100%;min-block-size:40px;padding-inline:var(--layout-padding-lg);color:var(--color-text-base-subtlest);font-size:var(--font-size-content-ui);text-align:left;cursor:pointer}.collapsed-search:hover{background:var(--color-background-neutral-subtle)}.monitor button:focus-visible,.collapsed-search:focus-visible{outline:var(--layout-border-thick) solid var(--color-border-focused);outline-offset:2px}@media (max-width:767px){:host{top:var(--layout-padding-sm);bottom:var(--layout-padding-sm);left:var(--layout-padding-sm);inline-size:calc(100% - (var(--layout-padding-sm) * 2));max-inline-size:none}}
  `],
})
export class FleetMapSearchComponent implements AfterViewInit {
  @ViewChild('searchInput', { read: ElementRef }) private searchInputRef?: ElementRef<HTMLElement>;
  @ViewChild('resultsList', { read: ElementRef }) private resultsListRef?: ElementRef<HTMLElement>;

  protected readonly state = inject(FleetMapService);
  protected readonly isOpen = signal(true);
  protected readonly openFilter = signal<'status' | 'financiera' | null>(null);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly financieraOptions = FINANCIERA_OPTIONS;
  protected readonly statusLabel = computed(() => STATUS_OPTIONS.find((option) => option.value === this.state.status())?.label ?? 'Estado');
  protected readonly financieraLabel = computed(() => FINANCIERA_OPTIONS.find((option) => option.value === this.state.financiera())?.label ?? 'Financiera');
  // Sin barra de scroll visible (patrón de C-Locater, FloatingMonitor.tsx):
  // este chevron animado es la única señal de que hay más unidades debajo.
  protected readonly showScrollHint = signal(false);

  constructor() {
    // Recalcula cuando cambia el conjunto filtrado (búsqueda, filtros, fijar)
    // — el DOM recién termina de pintar la nueva lista un tick después.
    effect(() => {
      this.state.filteredUnits();
      setTimeout(() => this.checkScroll(), 80);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 320);
  }

  protected checkScroll(): void {
    const el = this.resultsListRef?.nativeElement;
    if (!el) return;
    this.showScrollHint.set(el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  }

  protected openSearch(): void {
    this.isOpen.set(true);
    // cs-input-group-input renderiza display:contents; el ElementRef del
    // view child apunta al elemento custom, no al <input> real — se busca
    // igual que InputGroupAddon.onClick() en el propio DS (input-group.tsx).
    // setTimeout (no queueMicrotask): el signal aún no pintó el <input> del
    // panel expandido en el mismo tick del click.
    setTimeout(() => this.searchInputRef?.nativeElement.querySelector('input')?.focus());
    setTimeout(() => this.checkScroll(), 320);
  }
  protected toggleFilter(filter: 'status' | 'financiera'): void { this.openFilter.update((open) => open === filter ? null : filter); }
  protected setStatus(value: FleetMapStatusFilter): void { this.state.setStatus(value); this.openFilter.set(null); }
  protected setFinanciera(value: FleetMapFinancieraFilter): void { this.state.setFinanciera(value); this.openFilter.set(null); }
  protected typeIcon(unit: FleetUnit): IconName { return TYPE_ICONS[unit.type]; }
  // Mismo formateador que fleet-telemetry.service.ts usa para "Última actualización".
  protected formattedDate(unit: FleetUnit): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(unit.lastUpdate));
  }

  // ---------------------------------------------------------------------
  // Menú de acciones por unidad (botón "..." de cada card)
  // ---------------------------------------------------------------------
  protected readonly openActionMenuUnitId = signal<string | null>(null);
  protected toggleActionMenu(unitId: string): void {
    this.openActionMenuUnitId.update((activeId) => (activeId === unitId ? null : unitId));
  }
  protected closeActionMenu(): void {
    this.openActionMenuUnitId.set(null);
  }
  protected actionItems(unit: FleetUnit): DropdownItem[] {
    return [
      this.state.isPinned(unit.id)
        ? { label: 'Desfijar', value: 'unpin', icon: 'star' }
        : { label: 'Fijar', value: 'pin', icon: 'star' },
      { label: 'Ver bitácora', value: 'bitacora', icon: 'file-text' },
      // Distinto de Bitácora (que trae posiciones, eventos y datos de
      // orden): esto solo centra el mapa en la unidad, en su propia
      // pestaña, para quien únicamente quiere ver cómo se mueve — a pedido
      // de Enzo (23 sep. 2026).
      { label: 'Seguir unidad', value: 'follow', icon: 'eye' },
      { label: 'Centrar en mapa', value: 'center', icon: 'locate-fixed' },
      { label: 'Copiar ubicación', value: 'copy', icon: 'copy' },
    ];
  }
  protected runAction(unit: FleetUnit, item: DropdownItem): void {
    this.closeActionMenu();
    if (item.value === 'pin' || item.value === 'unpin') this.state.togglePin(unit.id);
    if (item.value === 'bitacora') this.state.openBitacora(unit);
    if (item.value === 'follow') this.state.openFollow(unit);
    if (item.value === 'center') this.state.selectUnit(unit);
    if (item.value === 'copy') void this.state.copyUnitLocation(unit);
  }
}
