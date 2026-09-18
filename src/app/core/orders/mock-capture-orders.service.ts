import { Injectable, signal } from '@angular/core';

export interface CaptureOrderDraft {
  unitCode: string;
  source: string;
  caseNumber: string;
  receivedOn: string;
}

export const CAPTURE_ORDER_STATUSES = ['Registrada', 'En revisión', 'Con observación', 'Cerrada'] as const;
export type CaptureOrderStatus = (typeof CAPTURE_ORDER_STATUSES)[number];

export interface CaptureOrder extends CaptureOrderDraft {
  id: string;
  createdAt: string;
  status: CaptureOrderStatus;
}

export type CreateCaptureOrderResult =
  | { kind: 'success'; order: CaptureOrder }
  | { kind: 'duplicate' | 'offline'; message: string };

@Injectable({ providedIn: 'root' })
export class MockCaptureOrdersService {
  readonly orders = signal<CaptureOrder[]>([]);

  async create(draft: CaptureOrderDraft): Promise<CreateCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (draft.unitCode.trim().toUpperCase() === 'SIN-CONEXION') {
      return { kind: 'offline', message: 'No pudimos registrar la orden. Revisa tu conexión e inténtalo nuevamente.' };
    }

    if (this.orders().some((order) => order.unitCode.toUpperCase() === draft.unitCode.trim().toUpperCase())) {
      return { kind: 'duplicate', message: 'Esta unidad ya tiene una orden de captura creada durante esta sesión.' };
    }

    const order: CaptureOrder = {
      ...draft,
      unitCode: draft.unitCode.trim().toUpperCase(),
      caseNumber: draft.caseNumber.trim(),
      id: `CAP-${String(this.orders().length + 1).padStart(4, '0')}`,
      createdAt: new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
      status: 'Registrada',
    };
    this.orders.update((orders) => [order, ...orders]);
    return { kind: 'success', order };
  }
}
