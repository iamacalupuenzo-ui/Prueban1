import { Injectable, signal } from '@angular/core';

export type TelemetryState = 'loading' | 'empty' | 'ready' | 'error' | 'forbidden';

export interface FleetUnit {
  id: string;
  name: string;
  status: 'En ruta' | 'Sin señal';
  lastUpdate: string;
}

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
      this.units.set([]);
      this.lastUpdated.set(null);
      this.state.set('empty');
    }, 300);
  }

  retry(): void {
    this.load();
  }
}
