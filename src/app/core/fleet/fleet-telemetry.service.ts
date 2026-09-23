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

/**
 * Datos de dispositivo GPS de ejemplo — la Bitácora todavía no tiene una
 * integración real de dispositivos (ver `docs/epica-a-plan-desarrollo-fleet-
 * operations-bitacora-v1-2026-09-21.md`, HU-bitacora-05). Se generan de forma
 * determinística a partir de la unidad, no vienen de un fixture escrito a
 * mano, para no fingir que representan inventario real.
 */
export interface FleetUnitDevice {
  deviceType: 'Estándar' | 'Contingencia';
  imei: string;
  line: string;
  group: string;
  odometerKm: number;
  fuelPercent: number;
  connectionAt: string;
  alarmCount: number;
  owner: string;
  plate: string;
  engineCode: string;
}

export interface FleetPositionEntry {
  at: string;
  label: string;
  position: [number, number];
  isLatest?: boolean;
}

const DEMO_GROUPS = ['Banco Pichincha — Flota Sur', 'Distribuidora Andina', 'Logística Costa Verde', 'Transportes Rápidos del Sur SAC'];
const DEMO_OWNERS = ['Transportes Rápidos del Sur SAC', 'Distribuidora Andina EIRL', 'Logística Costa Verde SAC', 'Grupo Vial Perú SAC'];

function seedFrom(unitId: string): number {
  let seed = 0;
  for (let i = 0; i < unitId.length; i++) seed = (seed * 31 + unitId.charCodeAt(i)) >>> 0;
  return seed;
}

/** Demo determinística: misma unidad siempre produce el mismo dispositivo. */
export function deviceInfoFor(unit: FleetUnit): FleetUnitDevice {
  const seed = seedFrom(unit.id);
  const digits = unit.vehicleCode.replace(/\D/g, '');
  return {
    deviceType: seed % 4 === 0 ? 'Contingencia' : 'Estándar',
    imei: `49001237${digits.padStart(6, '0')}`,
    line: `+51 9${String(500000000 + (seed % 99999999)).slice(0, 8)}`,
    group: DEMO_GROUPS[seed % DEMO_GROUPS.length],
    odometerKm: 10000 + (seed % 90000),
    fuelPercent: seed % 101,
    connectionAt: unit.lastUpdate,
    alarmCount: seed % 4,
    owner: DEMO_OWNERS[seed % DEMO_OWNERS.length],
    plate: unit.vehicleCode,
    engineCode: `ISB${(seed % 9) + 1}.${(seed % 9)}-${String(seed % 999).padStart(3, '0')}`,
  };
}

const DEMO_STREETS = [
  'Av. Arequipa', 'Av. La Marina', 'Av. Javier Prado', 'Jr. de la Unión', 'Av. Grau',
  'Av. Larco', 'Av. Brasil', 'Jr. Lima', 'Av. Salaverry', 'Av. Universitaria',
  'Calle Los Pinos', 'Av. El Sol', 'Av. Colonial', 'Av. Angamos', 'Av. Benavides',
];
const DEMO_DISTRICTS = [
  'Miraflores', 'San Isidro', 'Surquillo', 'Breña', 'Jesús María',
  'San Miguel', 'Pueblo Libre', 'Lince', 'Magdalena', 'Barranco',
];

/** Dirección de ejemplo — mismo criterio que `deviceInfoFor`: demo determinística, no geocodificación real. */
function demoAddress(seed: number, index: number): string {
  const street = DEMO_STREETS[(seed + index * 7) % DEMO_STREETS.length];
  const district = DEMO_DISTRICTS[(seed + index * 13) % DEMO_DISTRICTS.length];
  const houseNumber = 100 + ((seed + index * 41) % 4800);
  return `${street} ${houseNumber}, ${district}`;
}

const POSITION_HISTORY_DAYS = 7;
/** Exportado para que la Bitácora pueda aislar "las posiciones de hoy" sin duplicar el número. */
export const POSITIONS_PER_DAY = 5;

/**
 * Historial de posiciones de ejemplo: la más reciente reutiliza la posición
 * real de la unidad. Cada entrada trae una dirección de ejemplo —
 * `demoAddress()` — con el mismo criterio de demo determinística que
 * `deviceInfoFor`; no proviene de geocodificación real.
 *
 * Se reparte en `POSITION_HISTORY_DAYS` días (`POSITIONS_PER_DAY` entradas
 * cada uno) en vez de agrupar todo en las últimas horas, para que el filtro
 * de rango de fechas de la Bitácora tenga datos con los que trabajar.
 */
export function positionHistoryFor(
  unit: FleetUnit,
  days = POSITION_HISTORY_DAYS,
  perDay = POSITIONS_PER_DAY,
): FleetPositionEntry[] {
  const seed = seedFrom(unit.id);
  const [lat, lng] = unit.position;
  const baseTime = new Date(unit.lastUpdate).getTime();
  const entries: FleetPositionEntry[] = [];
  const count = days * perDay;
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / perDay);
    const posInDay = i % perDay;
    const jitter = ((seed + i * 97) % 200) / 20000; // ~ -0.005..0.005°
    const sign = i % 2 === 0 ? 1 : -1;
    entries.push({
      at: new Date(baseTime - dayOffset * 24 * 60 * 60 * 1000 - posInDay * 45 * 60 * 1000).toISOString(),
      label: demoAddress(seed, i),
      position: [lat + sign * jitter * i, lng - sign * jitter * i],
      isLatest: i === 0,
    });
  }
  return entries;
}

// Unidades repartidas en distintas ciudades del Perú (no solo Lima) para que
// la lista del buscador del mapa obligue a hacer scroll con datos realistas.
const MOCK_UNITS: FleetUnit[] = [
  { id: 'VHC-3001', name: 'Vehículo 01', vehicleCode: 'MTR-3001', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:14:00', position: [-12.0464, -77.0428] },
  { id: 'TRK-3002', name: 'Vehículo 02', vehicleCode: 'MTR-3002', type: 'truck', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:58:00', position: [-12.0301, -77.0212] },
  { id: 'VAN-3003', name: 'Vehículo 03', vehicleCode: 'MTR-3003', type: 'car', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T08:40:00', position: [-12.0891, -77.0165] },
  { id: 'BUS-3004', name: 'Vehículo 04', vehicleCode: 'MTR-3004', type: 'bus', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:21:00', position: [-12.0654, -77.0842] },
  { id: 'MOT-3005', name: 'Vehículo 05', vehicleCode: 'MTR-3005', type: 'motorcycle', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T07:55:00', position: [-12.1021, -76.9932] },
  { id: 'VHC-3006', name: 'Vehículo 06', vehicleCode: 'MTR-3006', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:05:00', position: [-16.4090, -71.5375] },
  { id: 'TRK-3007', name: 'Vehículo 07', vehicleCode: 'MTR-3007', type: 'truck', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T06:32:00', position: [-16.3989, -71.5350] },
  { id: 'VHC-3008', name: 'Vehículo 08', vehicleCode: 'MTR-3008', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:41:00', position: [-8.1116, -79.0288] },
  { id: 'BUS-3009', name: 'Vehículo 09', vehicleCode: 'MTR-3009', type: 'bus', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:02:00', position: [-8.1197, -79.0398] },
  { id: 'MOT-3010', name: 'Vehículo 10', vehicleCode: 'MTR-3010', type: 'motorcycle', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:18:00', position: [-6.7714, -79.8409] },
  { id: 'TRK-3011', name: 'Vehículo 11', vehicleCode: 'MTR-3011', type: 'truck', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T05:47:00', position: [-6.7642, -79.8489] },
  { id: 'VHC-3012', name: 'Vehículo 12', vehicleCode: 'MTR-3012', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:11:00', position: [-13.5320, -71.9675] },
  { id: 'BUS-3013', name: 'Vehículo 13', vehicleCode: 'MTR-3013', type: 'bus', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T04:20:00', position: [-13.5170, -71.9785] },
  { id: 'VHC-3014', name: 'Vehículo 14', vehicleCode: 'MTR-3014', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:52:00', position: [-5.1945, -80.6328] },
  { id: 'MOT-3015', name: 'Vehículo 15', vehicleCode: 'MTR-3015', type: 'motorcycle', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:08:00', position: [-5.2018, -80.6265] },
  { id: 'TRK-3016', name: 'Vehículo 16', vehicleCode: 'MTR-3016', type: 'truck', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T03:59:00', position: [-3.7491, -73.2538] },
  { id: 'VHC-3017', name: 'Vehículo 17', vehicleCode: 'MTR-3017', type: 'car', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:30:00', position: [-12.0651, -75.2049] },
  { id: 'BUS-3018', name: 'Vehículo 18', vehicleCode: 'MTR-3018', type: 'bus', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T10:17:00', position: [-18.0146, -70.2536] },
  { id: 'VHC-3019', name: 'Vehículo 19', vehicleCode: 'MTR-3019', type: 'car', status: 'Sin señal', ignition: 'off', lastUpdate: '2026-09-20T07:12:00', position: [-9.0853, -78.5783] },
  { id: 'MOT-3020', name: 'Vehículo 20', vehicleCode: 'MTR-3020', type: 'motorcycle', status: 'En ruta', ignition: 'on', lastUpdate: '2026-09-20T09:45:00', position: [-14.0678, -75.7286] },
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
