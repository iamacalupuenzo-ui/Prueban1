import { computed, inject, Injectable, signal } from '@angular/core';
import {
  FleetTelemetryService,
  type FleetUnit,
  type FleetUnitType,
} from '../../core/fleet/fleet-telemetry.service';

export type FleetMapStatusFilter = 'all' | 'route' | 'offline';
export type FleetMapTypeFilter = 'all' | FleetUnitType;

/**
 * Estado compartido de la vista de mapa. Centraliza la búsqueda, los filtros
 * y la unidad seleccionada para que el panel flotante y el lienzo cartográfico
 * trabajen sobre el mismo conjunto de unidades sin prop-drilling.
 */
@Injectable()
export class FleetMapService {
  private readonly telemetry = inject(FleetTelemetryService);

  readonly query = signal('');
  readonly status = signal<FleetMapStatusFilter>('all');
  readonly type = signal<FleetMapTypeFilter>('all');
  readonly selectedUnitId = signal<string | null>(null);

  readonly units = this.telemetry.units.asReadonly();
  readonly filteredUnits = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const status = this.status();
    const type = this.type();

    return this.units().filter((unit) => {
      const matchesQuery = !query || `${unit.name} ${unit.vehicleCode} ${unit.id}`.toLocaleLowerCase().includes(query);
      const matchesStatus = status === 'all' || (status === 'route' ? unit.status === 'En ruta' : unit.status === 'Sin señal');
      const matchesType = type === 'all' || unit.type === type;
      return matchesQuery && matchesStatus && matchesType;
    });
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

  setType(value: FleetMapTypeFilter): void {
    this.type.set(value);
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
    this.type.set('all');
  }
}
