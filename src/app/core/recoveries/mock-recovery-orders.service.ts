import { Injectable, signal } from '@angular/core';

export type RecoverySourceType = 'aseguradora' | 'persona-natural' | 'otra';

export interface RecoveryOrderEvidence {
  fileName: string;
  fileSize: number;
}

export interface RecoveryOrderDraft {
  unitCode: string;
  sourceType: RecoverySourceType;
  sourceName: string;
  referenceNumber: string;
  contactName: string;
  contactPhone: string;
  operationalNotes: string;
  evidence: RecoveryOrderEvidence[];
}

export const RECOVERY_ORDER_STATUSES = [
  'Registrado',
  'En gestión',
  'Recuperado',
  'Cerrado',
  'Anulado',
] as const;
export type RecoveryOrderStatus = (typeof RECOVERY_ORDER_STATUSES)[number];
const ACTIVE_RECOVERY_ORDER_STATUSES: readonly RecoveryOrderStatus[] = ['Registrado', 'En gestión'];

export interface RecoveryOrderAuditEntry {
  action: 'Creación' | 'Edición' | 'Cambio de estado';
  at: string;
  detail: string;
}

export interface RecoveryOrder extends RecoveryOrderDraft {
  id: string;
  createdAt: string;
  status: RecoveryOrderStatus;
  /**
   * Un recupero se registra para monitorear una unidad, no porque ya se haya
   * recuperado — esta fecha no se pide al crear la orden. Queda ausente
   * hasta que el ciclo de vida (pendiente de aprobación de Producto) permita
   * pasar el estado a "Recuperado", momento en el que se completa.
   */
  recoveredAt?: string;
  /** La auditoría es opcional mientras los fixtures históricos aún no la incluyen. */
  auditTrail?: RecoveryOrderAuditEntry[];
}

export type CreateRecoveryOrderResult =
  { kind: 'success'; order: RecoveryOrder } | { kind: 'duplicate' | 'offline'; message: string };

export type UpdateRecoveryOrderResult =
  { kind: 'success'; order: RecoveryOrder } | { kind: 'duplicate' | 'forbidden'; message: string };

@Injectable({ providedIn: 'root' })
export class MockRecoveryOrdersService {
  readonly orders = signal<RecoveryOrder[]>([]);
  readonly fixtureOrders = signal<RecoveryOrder[]>([]);
  readonly fixturesLoading = signal(false);
  readonly fixturesError = signal('');
  private fixtureLoad?: Promise<void>;

  loadFixtureOrders(): Promise<void> {
    if (this.fixtureOrders().length > 0) return Promise.resolve();
    if (this.fixtureLoad) return this.fixtureLoad;

    this.fixturesLoading.set(true);
    this.fixturesError.set('');
    this.fixtureLoad = fetch(new URL('mock-data/recovery-orders.json', document.baseURI))
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar los recuperos de prueba.');
        const records: unknown = await response.json();
        if (!Array.isArray(records))
          throw new Error('El fixture de recuperos no tiene un formato válido.');
        this.fixtureOrders.set(records as RecoveryOrder[]);
      })
      .catch(() => {
        this.fixturesError.set('No pudimos cargar los recuperos de prueba. Intenta nuevamente.');
      })
      .finally(() => {
        this.fixturesLoading.set(false);
        this.fixtureLoad = undefined;
      });
    return this.fixtureLoad;
  }

  hasActiveRecoveryOrder(unitCode: string, excludingOrderId?: string): boolean {
    const normalized = unitCode.trim().toUpperCase();
    return this.all().some(
      (order) =>
        order.id !== excludingOrderId &&
        order.unitCode.toUpperCase() === normalized &&
        ACTIVE_RECOVERY_ORDER_STATUSES.includes(order.status),
    );
  }

  async create(draft: RecoveryOrderDraft): Promise<CreateRecoveryOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (draft.unitCode.trim().toUpperCase() === 'SIN-CONEXION') {
      return {
        kind: 'offline',
        message: 'No pudimos registrar el recupero. Revisa tu conexión e inténtalo nuevamente.',
      };
    }

    if (this.hasActiveRecoveryOrder(draft.unitCode)) {
      return {
        kind: 'duplicate',
        message: 'Esta unidad ya tiene una orden de recupero activa.',
      };
    }

    const order: RecoveryOrder = {
      ...draft,
      unitCode: draft.unitCode.trim().toUpperCase(),
      referenceNumber: draft.referenceNumber.trim(),
      id: `REC-${String(this.orders().length + 1).padStart(4, '0')}`,
      createdAt: this.timestamp(),
      status: 'Registrado',
      auditTrail: [{ action: 'Creación', at: this.timestamp(), detail: 'Orden registrada.' }],
    };
    this.orders.update((orders) => [order, ...orders]);
    return { kind: 'success', order };
  }

  async update(id: string, draft: RecoveryOrderDraft): Promise<UpdateRecoveryOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current || !this.canEdit(current)) {
      return { kind: 'forbidden', message: 'Este recupero ya no admite edición.' };
    }
    if (this.hasActiveRecoveryOrder(draft.unitCode, id)) {
      return {
        kind: 'duplicate',
        message: 'Esta unidad ya tiene una orden de recupero activa.',
      };
    }

    const updated: RecoveryOrder = {
      ...current,
      ...draft,
      unitCode: draft.unitCode.trim().toUpperCase(),
      referenceNumber: draft.referenceNumber.trim(),
      auditTrail: [
        ...this.auditOf(current),
        { action: 'Edición', at: this.timestamp(), detail: 'Datos del recupero actualizados.' },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  private canEdit(order: RecoveryOrder): boolean {
    return order.status === 'Registrado' || order.status === 'En gestión';
  }

  private all(): RecoveryOrder[] {
    return [...this.orders(), ...this.fixtureOrders()];
  }

  private find(id: string): RecoveryOrder | undefined {
    return this.all().find((order) => order.id === id);
  }

  private replace(updated: RecoveryOrder): void {
    const replaceIn = (orders: RecoveryOrder[]) =>
      orders.map((order) => (order.id === updated.id ? updated : order));
    if (this.orders().some((order) => order.id === updated.id)) this.orders.update(replaceIn);
    else this.fixtureOrders.update(replaceIn);
  }

  private auditOf(order: RecoveryOrder): RecoveryOrderAuditEntry[] {
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
