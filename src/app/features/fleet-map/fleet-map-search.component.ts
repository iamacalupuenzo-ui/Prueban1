import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import {
  Icon,
  InputGroupInput,
  Popover,
  type IconName,
} from '@iamacalupuenzo-ui/comsatel-ds';
import type { FleetUnit, FleetUnitType } from '../../core/fleet/fleet-telemetry.service';
import { FleetMapService, type FleetMapStatusFilter, type FleetMapTypeFilter } from './fleet-map.service';

// El filtro es de estado de señal GPS (no de ruta/movimiento): "En ruta" se
// renombró a "Con señal" para no confundirlo con el estado de encendido.
const STATUS_OPTIONS: readonly { value: FleetMapStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'route', label: 'Con señal' },
  { value: 'offline', label: 'Sin señal' },
];
const TYPE_OPTIONS: readonly { value: FleetMapTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todas las unidades' },
  { value: 'car', label: 'Auto' },
  { value: 'truck', label: 'Camión' },
  { value: 'bus', label: 'Bus' },
  { value: 'motorcycle', label: 'Moto' },
];
const TYPE_ICONS: Record<FleetUnitType, IconName> = { car: 'car', truck: 'truck', bus: 'bus', motorcycle: 'bike' };

/** Buscador flotante adaptado al patrón de C-Locater con tokens FleetOperations. */
@Component({
  selector: 'app-fleet-map-search',
  imports: [Icon, InputGroupInput, Popover],
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
          <button #typeTrigger type="button" class="filter-control" [class.is-active]="state.type() !== 'all'" [attr.aria-expanded]="openFilter() === 'type'" (click)="toggleFilter('type')"><cs-icon name="sliders" [size]="14" aria-hidden="true" /><span>{{ typeLabel() }}</span><cs-icon name="chevron-down" [size]="12" class="filter-control__chevron" aria-hidden="true" /></button>
        </div>

        <cs-popover [isOpen]="openFilter() === 'status'" [triggerRef]="statusTrigger" placement="bottom-start" [offset]="4" role="listbox" ariaLabel="Filtrar por estado" (closed)="openFilter.set(null)"><div class="filter-menu">@for (option of statusOptions; track option.value) { <button type="button" role="option" [attr.aria-selected]="state.status() === option.value" [class.is-selected]="state.status() === option.value" (click)="setStatus(option.value)"><span class="filter-menu__label">{{ option.label }}</span>@if (state.status() === option.value) { <cs-icon name="check" [size]="16" class="filter-menu__check" aria-hidden="true" /> }</button> }</div></cs-popover>
        <cs-popover [isOpen]="openFilter() === 'type'" [triggerRef]="typeTrigger" placement="bottom-start" [offset]="4" role="listbox" ariaLabel="Filtrar por tipo de unidad" (closed)="openFilter.set(null)"><div class="filter-menu">@for (option of typeOptions; track option.value) { <button type="button" role="option" [attr.aria-selected]="state.type() === option.value" [class.is-selected]="state.type() === option.value" (click)="setType(option.value)"><span class="filter-menu__label">{{ option.label }}</span>@if (state.type() === option.value) { <cs-icon name="check" [size]="16" class="filter-menu__check" aria-hidden="true" /> }</button> }</div></cs-popover>

        <div class="monitor__results" role="list" aria-label="Unidades encontradas">
          @for (unit of state.filteredUnits(); track unit.id) {
            <div class="vehicle-card" [class.is-selected]="state.selectedUnitId() === unit.id" role="listitem">
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
                <button type="button" class="vehicle-card__menu" [attr.aria-label]="'Más acciones para ' + unit.name"><cs-icon name="more-horizontal" [size]="18" aria-hidden="true" /></button>
              </span>
            </div>
          } @empty { <p class="monitor__empty" role="status">Sin resultados</p> }
        </div>
      </section>
    } @else {
      <button type="button" class="collapsed-search" (click)="openSearch()"><cs-icon name="search" [size]="16" aria-hidden="true" /><span>Buscar {{ state.units().length }} unidades...</span></button>
    }
  `,
  styles: [`
    :host{position:absolute;z-index:500;top:var(--layout-padding-md);left:var(--layout-padding-md);display:block;inline-size:306px;max-inline-size:calc(100% - (var(--layout-padding-md) * 2))}button{font:inherit}.monitor{border:var(--layout-border-thin) solid var(--color-border-neutral-subtle);border-radius:var(--radius-md);background:#f8f5ed;box-shadow:var(--shadow-lg);display:grid;overflow:hidden}.monitor__search{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto;align-items:center;gap:var(--layout-gap-sm);min-block-size:48px;padding-inline:var(--layout-padding-md);color:var(--color-text-base-subtlest);border-bottom:var(--layout-border-thin) solid var(--color-border-divider)}.monitor__icon-button{display:grid;place-items:center;padding:var(--layout-padding-2xs);border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-subtlest);cursor:pointer}.monitor__icon-button:hover,.filter-control:hover{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.monitor__separator{inline-size:var(--layout-border-thin);block-size:16px;background:var(--color-border-divider)}.monitor__filters{display:flex;align-items:center;gap:var(--layout-gap-xs);padding:var(--layout-padding-sm);border-bottom:var(--layout-border-thin) solid var(--color-border-divider);min-inline-size:0}.monitor__filters .filter-control{flex:1 1 0;min-inline-size:0}.monitor__filters .filter-control span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-inline-size:0}.filter-control__chevron{flex-shrink:0;margin-inline-start:auto}.filter-control{display:inline-flex;align-items:center;gap:var(--layout-gap-xs);min-block-size:28px;padding-inline:var(--layout-padding-sm);border:var(--layout-border-thin) solid var(--color-border-neutral-default);border-radius:var(--radius-sm);background:var(--elevation-surface-default);color:var(--color-text-base-subtlest);font-size:var(--font-size-content-note);font-weight:var(--font-weight-regular);line-height:var(--font-line-height-content-note);cursor:pointer;transition:border-color var(--motion-duration-fast) var(--motion-easing-default)}.filter-control.is-active{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.filter-menu{display:grid;min-inline-size:132px;padding-block:var(--layout-padding-xs);border:var(--layout-border-thin) solid var(--color-border-neutral-default);border-radius:var(--radius-lg);background:var(--color-background-base);box-shadow:var(--shadow-xl)}.filter-menu button{display:flex;align-items:center;gap:var(--layout-gap-sm);margin-inline:var(--layout-padding-xs);block-size:32px;padding-inline:10px;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-default);font-weight:var(--font-weight-accent);font-size:var(--font-size-content-ui);line-height:var(--font-line-height-content-ui);text-align:left;cursor:pointer}.filter-menu button:hover:not(.is-selected){background:var(--color-background-neutral-subtlest-hover)}.filter-menu button.is-selected{font-weight:var(--font-weight-emphasis);color:var(--color-text-brand-bolder);background:var(--color-background-brand-subtlest)}.filter-menu__label{flex:1;min-inline-size:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.filter-menu__check{flex-shrink:0;color:var(--color-text-brand-bolder)}.monitor__results{display:grid;max-block-size:min(420px,calc(100vh - 180px));gap:var(--layout-gap-sm);overflow-y:auto;padding:var(--layout-padding-sm)}.vehicle-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--layout-gap-sm);min-block-size:64px;padding:var(--layout-padding-lg);border:var(--layout-border-thin) solid var(--color-border-divider);border-radius:var(--radius-md);background:var(--elevation-surface-default);transition:border-color var(--motion-duration-fast) var(--motion-easing-standard),box-shadow var(--motion-duration-fast) var(--motion-easing-standard)}.vehicle-card:has(.vehicle-card__main:hover){border-color:var(--color-border-brand-default);box-shadow:var(--shadow-sm)}.vehicle-card.is-selected{border-color:var(--color-border-brand-default);box-shadow:var(--shadow-sm)}.vehicle-card__main{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;gap:var(--layout-gap-md);min-inline-size:0;padding:0;border:0;background:transparent;color:var(--color-text-base-default);text-align:left;cursor:pointer}.vehicle-card__avatar{position:relative;display:grid;place-items:center;inline-size:40px;block-size:40px;border-radius:var(--radius-full);background:var(--color-background-neutral-subtlest);border:1.5px solid var(--color-border-neutral-default);color:var(--color-icon-neutral-default)}.vehicle-card__gps{position:absolute;top:-2px;right:-2px;display:grid;place-items:center;inline-size:16px;block-size:16px;border-radius:var(--radius-full);background:var(--color-map-vehicle-offline);box-shadow:var(--shadow-sm);color:var(--color-text-inverse)}.vehicle-card__gps--on{background:var(--color-map-vehicle-active)}.vehicle-card__ignition{position:absolute;bottom:-2px;left:-2px;display:grid;place-items:center;inline-size:16px;block-size:16px;border-radius:var(--radius-full);background:var(--color-background-danger-default);box-shadow:var(--shadow-sm);color:var(--color-text-inverse)}.vehicle-card__ignition--on{background:var(--color-map-vehicle-active)}.vehicle-card__body{display:grid;min-inline-size:0;gap:var(--layout-gap-2xs)}.vehicle-card__title{display:flex;align-items:baseline;gap:var(--layout-gap-xs);min-inline-size:0}.vehicle-card__title strong{overflow:hidden;font-size:var(--font-size-content-ui);font-weight:var(--font-weight-bold);line-height:var(--font-line-height-content-ui);text-overflow:ellipsis;white-space:nowrap}.vehicle-card__title span{overflow:hidden;color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);line-height:var(--font-line-height-content-note);text-overflow:ellipsis;white-space:nowrap}.vehicle-card__date{color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);line-height:var(--font-line-height-content-note)}.vehicle-card__aside{display:grid;place-items:center;align-self:stretch}.vehicle-card__menu{display:grid;place-items:center;inline-size:var(--layout-size-sm);block-size:var(--layout-size-sm);padding:0;border:0;border-radius:var(--radius-sm);background:transparent;color:var(--color-text-base-subtlest);cursor:pointer;transform:rotate(90deg)}.vehicle-card__menu:hover{background:var(--color-background-neutral-subtle);color:var(--color-text-base-default)}.monitor__empty{margin:0;padding:var(--layout-padding-2xl);color:var(--color-text-base-subtle);font-size:var(--font-size-content-note);text-align:center}.collapsed-search{border:var(--layout-border-thin) solid var(--color-border-neutral-subtle);border-radius:var(--radius-full);background:#f8f5ed;box-shadow:var(--shadow-lg);display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:var(--layout-gap-sm);inline-size:100%;min-block-size:40px;padding-inline:var(--layout-padding-lg);color:var(--color-text-base-subtlest);font-size:var(--font-size-content-ui);text-align:left;cursor:pointer}.collapsed-search:hover{background:var(--color-background-neutral-subtle)}.monitor button:focus-visible,.collapsed-search:focus-visible{outline:var(--layout-border-thick) solid var(--color-border-focused);outline-offset:2px}@media (max-width:767px){:host{top:var(--layout-padding-sm);left:var(--layout-padding-sm);inline-size:calc(100% - (var(--layout-padding-sm) * 2));max-inline-size:none}.monitor__results{max-block-size:min(300px,calc(100vh - 180px))}}
  `],
})
export class FleetMapSearchComponent {
  @ViewChild('searchInput', { read: ElementRef }) private searchInputRef?: ElementRef<HTMLElement>;

  protected readonly state = inject(FleetMapService);
  protected readonly isOpen = signal(true);
  protected readonly openFilter = signal<'status' | 'type' | null>(null);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly statusLabel = computed(() => STATUS_OPTIONS.find((option) => option.value === this.state.status())?.label ?? 'Estado');
  protected readonly typeLabel = computed(() => TYPE_OPTIONS.find((option) => option.value === this.state.type())?.label ?? 'Tipo');
  protected openSearch(): void {
    this.isOpen.set(true);
    // cs-input-group-input renderiza display:contents; el ElementRef del
    // view child apunta al elemento custom, no al <input> real — se busca
    // igual que InputGroupAddon.onClick() en el propio DS (input-group.tsx).
    // setTimeout (no queueMicrotask): el signal aún no pintó el <input> del
    // panel expandido en el mismo tick del click.
    setTimeout(() => this.searchInputRef?.nativeElement.querySelector('input')?.focus());
  }
  protected toggleFilter(filter: 'status' | 'type'): void { this.openFilter.update((open) => open === filter ? null : filter); }
  protected setStatus(value: FleetMapStatusFilter): void { this.state.setStatus(value); this.openFilter.set(null); }
  protected setType(value: FleetMapTypeFilter): void { this.state.setType(value); this.openFilter.set(null); }
  protected typeIcon(unit: FleetUnit): IconName { return TYPE_ICONS[unit.type]; }
  // Mismo formateador que fleet-telemetry.service.ts usa para "Última actualización".
  protected formattedDate(unit: FleetUnit): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(unit.lastUpdate));
  }
}
