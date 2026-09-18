import { FleetTelemetryService } from './fleet-telemetry.service';

describe('FleetTelemetryService', () => {
  it('resuelve el estado de carga en un estado vacío cuando todavía no hay integración', async () => {
    const service = new FleetTelemetryService();

    expect(service.state()).toBe('loading');

    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(service.state()).toBe('empty');
    expect(service.units()).toEqual([]);
  });
});
