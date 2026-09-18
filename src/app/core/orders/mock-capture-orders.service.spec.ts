import { TestBed } from '@angular/core/testing';
import { MockCaptureOrdersService } from './mock-capture-orders.service';

describe('MockCaptureOrdersService', () => {
  let service: MockCaptureOrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockCaptureOrdersService);
  });

  it('registra una orden de captura con el estado inicial registrada', async () => {
    const result = await service.create({ unitCode: 'vhc-1024', source: 'Centro de operaciones', caseNumber: 'EXP-2026-0158', receivedOn: '2026-09-17' });

    expect(result.kind).toBe('success');
    expect(service.orders()).toHaveLength(1);
    expect(service.orders()[0]).toMatchObject({ id: 'CAP-0001', unitCode: 'VHC-1024', status: 'Registrada' });
  });

  it('evita duplicar la unidad dentro de la sesión simulada', async () => {
    const draft = { unitCode: 'VHC-1024', source: 'Centro de operaciones', caseNumber: 'EXP-2026-0158', receivedOn: '2026-09-17' };
    await service.create(draft);
    const duplicate = await service.create({ ...draft, caseNumber: 'EXP-2026-0159' });

    expect(duplicate).toMatchObject({ kind: 'duplicate' });
    expect(service.orders()).toHaveLength(1);
  });
});
