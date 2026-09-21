import { Injectable, signal } from '@angular/core';

export const CAPTURE_DOCUMENT_TYPES = [
  'resolution',
  'oficio',
  'transit-notification',
  'requisition',
] as const;
export type CaptureDocumentType = (typeof CAPTURE_DOCUMENT_TYPES)[number];

export interface CaptureOrderDocument {
  type: CaptureDocumentType;
  fileName: string;
  fileSize: number;
}

export interface CaptureOrderDraft {
  unitCode: string;
  source: string;
  caseNumber: string;
  receivedOn: string;
  documents: CaptureOrderDocument[];
}

export const CAPTURE_ORDER_STATUSES = [
  'Registrada',
  'En revisión',
  'Con observación',
  'Cerrada',
  'Anulada',
] as const;
export type CaptureOrderStatus = (typeof CAPTURE_ORDER_STATUSES)[number];
const ACTIVE_CAPTURE_ORDER_STATUSES: readonly CaptureOrderStatus[] = [
  'Registrada',
  'En revisión',
  'Con observación',
];

export interface CaptureOrderAuditEntry {
  action: 'Creación' | 'Edición' | 'Cambio de estado' | 'Anulación';
  at: string;
  detail: string;
}

export interface CaptureOrder extends CaptureOrderDraft {
  id: string;
  createdAt: string;
  status: CaptureOrderStatus;
  /** La auditoría es opcional mientras los fixtures históricos aún no la incluyen. */
  auditTrail?: CaptureOrderAuditEntry[];
  observationReason?: string;
  observedAt?: string;
  annulmentReason?: string;
  annulledAt?: string;
}

export type CreateCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'duplicate' | 'offline'; message: string };

export type BulkCreateCaptureOrdersResult = {
  created: CaptureOrder[];
  rejectedUnitCodes: string[];
};

export type UpdateCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'duplicate' | 'forbidden'; message: string };

export type AnnulCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type CloseCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type ObserveCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

@Injectable({ providedIn: 'root' })
export class MockCaptureOrdersService {
  readonly orders = signal<CaptureOrder[]>([]);
  readonly fixtureOrders = signal<CaptureOrder[]>([]);
  readonly fixturesLoading = signal(false);
  readonly fixturesError = signal('');
  private fixtureLoad?: Promise<void>;

  loadFixtureOrders(): Promise<void> {
    if (this.fixtureOrders().length > 0) return Promise.resolve();
    if (this.fixtureLoad) return this.fixtureLoad;

    this.fixturesLoading.set(true);
    this.fixturesError.set('');
    this.fixtureLoad = fetch(new URL('mock-data/capture-orders.json', document.baseURI))
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar las capturas de prueba.');
        const records: unknown = await response.json();
        if (!Array.isArray(records))
          throw new Error('El fixture de capturas no tiene un formato válido.');
        this.fixtureOrders.set(records as CaptureOrder[]);
      })
      .catch(() => {
        this.fixturesError.set('No pudimos cargar las capturas de prueba. Intenta nuevamente.');
      })
      .finally(() => {
        this.fixturesLoading.set(false);
        this.fixtureLoad = undefined;
      });
    return this.fixtureLoad;
  }

  hasActiveCaptureOrder(unitCode: string, excludingOrderId?: string): boolean {
    const normalized = unitCode.trim().toUpperCase();
    return this.all().some(
      (order) =>
        order.id !== excludingOrderId &&
        order.unitCode.toUpperCase() === normalized &&
        ACTIVE_CAPTURE_ORDER_STATUSES.includes(order.status),
    );
  }

  async create(draft: CaptureOrderDraft): Promise<CreateCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (draft.unitCode.trim().toUpperCase() === 'SIN-CONEXION') {
      return {
        kind: 'offline',
        message: 'No pudimos registrar la orden. Revisa tu conexión e inténtalo nuevamente.',
      };
    }

    if (this.hasActiveCaptureOrder(draft.unitCode)) {
      return {
        kind: 'duplicate',
        message: 'Esta unidad ya tiene una orden de captura registrada.',
      };
    }

    const order: CaptureOrder = {
      ...draft,
      unitCode: draft.unitCode.trim().toUpperCase(),
      caseNumber: draft.caseNumber.trim(),
      id: `CAP-${String(this.orders().length + 1).padStart(4, '0')}`,
      createdAt: new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      status: 'Registrada',
      auditTrail: [{ action: 'Creación', at: this.timestamp(), detail: 'Orden registrada.' }],
    };
    this.orders.update((orders) => [order, ...orders]);
    return { kind: 'success', order };
  }

  async createBulk(drafts: readonly CaptureOrderDraft[]): Promise<BulkCreateCaptureOrdersResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const created: CaptureOrder[] = [];
    const rejectedUnitCodes: string[] = [];
    const occupiedCodes = new Set(
      this.all()
        .filter((order) => ACTIVE_CAPTURE_ORDER_STATUSES.includes(order.status))
        .map((order) => order.unitCode.trim().toUpperCase()),
    );
    const firstSequence = this.orders().length + 1;

    drafts.forEach((draft, index) => {
      const unitCode = draft.unitCode.trim().toUpperCase();
      if (occupiedCodes.has(unitCode)) {
        rejectedUnitCodes.push(unitCode);
        return;
      }

      occupiedCodes.add(unitCode);
      created.push({
        ...draft,
        unitCode,
        caseNumber: draft.caseNumber.trim(),
        id: `CAP-${String(firstSequence + created.length).padStart(4, '0')}`,
        createdAt: new Intl.DateTimeFormat('es-PE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date()),
        status: 'Registrada',
        auditTrail: [
          {
            action: 'Creación',
            at: this.timestamp(),
            detail: 'Orden registrada mediante carga masiva.',
          },
        ],
      });
    });

    if (created.length) this.orders.update((orders) => [...created, ...orders]);
    return { created, rejectedUnitCodes };
  }

  async update(id: string, draft: CaptureOrderDraft): Promise<UpdateCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current || !this.canEdit(current)) {
      return { kind: 'forbidden', message: 'Esta captura ya no admite edición.' };
    }
    if (this.hasActiveCaptureOrder(draft.unitCode, id)) {
      return {
        kind: 'duplicate',
        message: 'Esta unidad ya tiene una orden de captura registrada.',
      };
    }

    const updated: CaptureOrder = {
      ...current,
      ...draft,
      unitCode: draft.unitCode.trim().toUpperCase(),
      caseNumber: draft.caseNumber.trim(),
      auditTrail: [
        ...this.auditOf(current),
        { action: 'Edición', at: this.timestamp(), detail: 'Datos de la orden actualizados.' },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  async annul(id: string, reason: string): Promise<AnnulCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas anular.' };
    if (current.status === 'Cerrada' || current.status === 'Anulada') {
      return { kind: 'forbidden', message: 'Esta captura ya no admite anulación.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Anulada',
      annulmentReason: reason.trim(),
      annulledAt: timestamp,
      auditTrail: [
        ...this.auditOf(current),
        { action: 'Anulación', at: timestamp, detail: `Motivo: ${reason.trim()}` },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  async close(id: string): Promise<CloseCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas cerrar.' };
    if (current.status !== 'Registrada') {
      return { kind: 'forbidden', message: 'Solo una captura registrada puede cerrarse.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Cerrada',
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Cambio de estado',
          at: timestamp,
          detail: 'Estado actualizado de Registrada a Cerrada.',
        },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  async observe(id: string, reason: string): Promise<ObserveCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas observar.' };
    if (current.status !== 'Registrada' && current.status !== 'En revisión') {
      return {
        kind: 'forbidden',
        message: 'Esta captura no admite observaciones en su estado actual.',
      };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Con observación',
      observationReason: reason.trim(),
      observedAt: timestamp,
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Cambio de estado',
          at: timestamp,
          detail: `Estado actualizado de ${current.status} a Con observación. Observación: ${reason.trim()}`,
        },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  private canEdit(order: CaptureOrder): boolean {
    return order.status === 'Registrada' || order.status === 'Con observación';
  }

  private all(): CaptureOrder[] {
    return [...this.orders(), ...this.fixtureOrders()];
  }

  private find(id: string): CaptureOrder | undefined {
    return this.all().find((order) => order.id === id);
  }

  private replace(updated: CaptureOrder): void {
    const replaceIn = (orders: CaptureOrder[]) =>
      orders.map((order) => (order.id === updated.id ? updated : order));
    if (this.orders().some((order) => order.id === updated.id)) this.orders.update(replaceIn);
    else this.fixtureOrders.update(replaceIn);
  }

  private auditOf(order: CaptureOrder): CaptureOrderAuditEntry[] {
    return (
      order.auditTrail ?? [{ action: 'Creación', at: order.createdAt, detail: 'Orden registrada.' }]
    );
  }

  private timestamp(): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(),
    );
  }
}
