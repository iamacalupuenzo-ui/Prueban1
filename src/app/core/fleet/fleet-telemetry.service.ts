import { Injectable, signal } from '@angular/core';

export type TelemetryState = 'loading' | 'empty' | 'ready' | 'error' | 'forbidden';
export type FleetUnitType = 'car' | 'truck' | 'bus' | 'motorcycle';

export interface FleetUnit {
  id: string;
  name: string;
  vehicleCode: string;
  type: FleetUnitType;
  status: 'En ruta' | 'Sin señal';
  /** Encendido del motor (Ignition On/Off) — independiente de `status`, que es señal GPS. */
  ignition: 'on' | 'off';
  /** ISO 8601. El buscador del mapa lo formatea con `Intl.DateTimeFormat('es-PE')`. */
  lastUpdate: string;
  position: [number, number];
}

const MOCK_UNITS: FleetUnit[] = [
  { id: 'VHC-3001', name: 'Vehículo 01', vehicleCode: 'MTR-3001', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:14:00', position: [-12.0464, -77.0428] },
  { id: 'TRK-3002', name: 'Vehículo 02', vehicleCode: 'MTR-3002', type: 'truck', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:58:00', position: [-12.0301, -77.0212] },
  { id: 'VAN-3003', name: 'Vehículo 03', vehicleCode: 'MTR-3003', type: 'car', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T08:40:00', position: [-12.0891, -77.0165] },
  { id: 'BUS-3004', name: 'Vehículo 04', vehicleCode: 'MTR-3004', type: 'bus', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:21:00', position: [-12.0654, -77.0842] },
  { id: 'MOT-3005', name: 'Vehículo 05', vehicleCode: 'MTR-3005', type: 'motorcycle', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T07:55:00', position: [-12.1021, -76.9932] },
];

@Injectable({ providedIn: 'root' })
export class FleetTelemetryService {
  readonly state = signal<TelemetryState>('loading');
  readonly units = signal<FleetUnit[]>([]);
  readonly lastUpdated = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    window.setTimeout(() => {
      this.units.set(MOCK_UNITS);
      this.lastUpdated.set(new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()));
      this.state.set('ready');
    }, 300);
  }

  retry(): void {
    this.load();
  }
}
