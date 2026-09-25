import { Injectable, inject } from '@angular/core';
import {
  MockRecoveryOrdersService,
  type RecoveryOrderDraft,
} from '../../core/recoveries/mock-recovery-orders.service';
import type { FormField } from './recoveries.service';

/**
 * Transiciones de negocio de Recuperos: todo lo que muta una orden a través
 * de `MockRecoveryOrdersService` (registrar/editar, avanzar a gestión,
 * marcar recuperado, cerrar, anular) vive acá, no en `RecoveriesService`.
 * Mismo patrón que `CaptureOrdersTransitionsService` — ver
 * `docs/lineamientos-estructura-componentes.md`.
 */
@Injectable({ providedIn: 'root' })
export class RecoveriesTransitionsService {
  private readonly api = inject(MockRecoveryOrdersService);

  validateDraft(draft: RecoveryOrderDraft, referenceLabel: string): Record<FormField, string> {
    return {
      unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.',
      sourceType: draft.sourceType ? '' : 'Selecciona la fuente del recupero.',
      sourceName: '',
      insurerName: draft.insurerName.trim() ? '' : 'Selecciona el seguro de la unidad.',
      serviceType: draft.serviceType.trim() ? '' : 'Selecciona el tipo de servicio.',
      theftModality: draft.theftModality ? '' : 'Selecciona la modalidad de robo.',
      referenceNumber: draft.referenceNumber.trim()
        ? ''
        : `Ingresa ${referenceLabel.toLocaleLowerCase()}.`,
      contactName: '',
      contactPhone: '',
      operationalNotes: '',
      evidence: '',
    };
  }

  register(draft: RecoveryOrderDraft, editingOrderId: string | null) {
    return editingOrderId ? this.api.update(editingOrderId, draft) : this.api.create(draft);
  }
  advanceToManagement(orderId: string) {
    return this.api.advanceToManagement(orderId);
  }
  markRecovered(orderId: string) {
    return this.api.markRecovered(orderId);
  }
  close(orderId: string) {
    return this.api.close(orderId);
  }
  annul(orderId: string, reason: string) {
    return this.api.annul(orderId, reason);
  }
}
