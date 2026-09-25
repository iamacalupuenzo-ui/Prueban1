import { Injectable, inject } from '@angular/core';
import {
  CAPTURE_DOCUMENT_DEFINITIONS,
  sapContractStatusFor,
  MockCaptureOrdersService,
  type BulkConflictPreviewRow,
  type BulkReconciliationUnit,
  type CaptureDocumentType,
  type CaptureFinanciera,
  type CaptureOrder,
  type CaptureOrderDraft,
  type ResolveConflictChoice,
} from '../../core/orders/mock-capture-orders.service';
import {
  detectCaptureFormat,
  parseCaptureRows,
  type ParsedCaptureRow,
} from '../../core/orders/capture-order-formats';
import { readCaptureWorkbook } from '../../core/orders/capture-order-workbook';
import { FleetTelemetryService, deviceInfoFor } from '../../core/fleet/fleet-telemetry.service';
import type { BulkValidationRow, FormField } from './capture-orders.service';

/**
 * Transiciones de negocio de Capturas: todo lo que muta una orden a través de
 * `MockCaptureOrdersService` (registrar/editar, cerrar, observar, paralizar,
 * marcar documento y carga masiva completa) vive acá, no en
 * `CaptureOrdersService`. Ese service de pantalla conserva los signals
 * (filtros, qué diálogo está abierto, borrador) y llama a estos métodos —
 * ver el patrón "service de pantalla vs. transiciones" en
 * `docs/lineamientos-estructura-componentes.md`.
 */
@Injectable({ providedIn: 'root' })
export class CaptureOrdersTransitionsService {
  private readonly api = inject(MockCaptureOrdersService);
  private readonly fleet = inject(FleetTelemetryService);

  private static readonly REQUIRED_DOCUMENT_TYPES: readonly CaptureDocumentType[] = [
    'resolution',
    'oficio',
    'transit-notification',
    'requisition',
  ];

  validateDraft(
    draft: CaptureOrderDraft,
    today: string,
    caseNumberPrefix: string,
  ): Record<FormField, string> {
    const caseNumberDigits = draft.caseNumber.slice(caseNumberPrefix.length);
    const hasAllDocuments = CaptureOrdersTransitionsService.REQUIRED_DOCUMENT_TYPES.every((type) =>
      draft.documents.some((document) => document.type === type),
    );
    return {
      unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.',
      source: draft.source ? '' : 'Selecciona la fuente de la orden.',
      caseNumber: caseNumberDigits ? '' : 'Ingresa los dígitos del expediente.',
      receivedOn: !draft.receivedOn
        ? 'Selecciona la fecha de recepción.'
        : draft.receivedOn > today
          ? 'La fecha no puede ser futura.'
          : '',
      documents: hasAllDocuments ? '' : 'Adjunta los cuatro documentos de respaldo para continuar.',
      financiera: '',
    };
  }

  register(draft: CaptureOrderDraft, editingOrderId: string | null) {
    return editingOrderId ? this.api.update(editingOrderId, draft) : this.api.create(draft);
  }
  close(orderId: string, captureOfficer: string, captureLocation: string) {
    return this.api.close(orderId, captureOfficer, captureLocation);
  }
  updateCaptureDetails(orderId: string, captureOfficer: string, captureLocation: string) {
    return this.api.updateCaptureDetails(orderId, captureOfficer, captureLocation);
  }
  revertToPending(orderId: string) {
    return this.api.revertToPending(orderId);
  }
  observe(orderId: string, reason: string) {
    return this.api.observe(orderId, reason);
  }
  updateObservationReason(orderId: string, reason: string) {
    return this.api.updateObservationReason(orderId, reason);
  }
  annul(orderId: string, reason: string) {
    return this.api.annul(orderId, reason);
  }
  toggleDocument(order: CaptureOrder, type: CaptureDocumentType): CaptureOrder | null {
    const hasDocument = (order.documents ?? []).some((document) => document.type === type);
    return hasDocument
      ? this.api.removeDocument(order.id, type)
      : this.api.attachDocument(order.id, {
          type,
          fileName: CAPTURE_DOCUMENT_DEFINITIONS.find((definition) => definition.type === type)!.label,
          fileSize: 0,
        });
  }

  // ---------------------------------------------------------------------
  // Carga masiva — lectura/detección de formato, validación por chunks
  // (SAP + cruce de flota) y confirmación final. Ver el detalle de cada
  // paso en el registro de decisiones de `docs/arquitectura-new-capture-order.md`.
  // ---------------------------------------------------------------------
  async readAndDetect(
    file: File,
  ): Promise<
    | { kind: 'error'; message: string }
    | { kind: 'ok'; financiera: CaptureFinanciera; parsedRows: readonly ParsedCaptureRow[] }
  > {
    let workbook;
    try {
      workbook = await readCaptureWorkbook(file);
    } catch {
      return { kind: 'error', message: 'No pudimos leer el archivo. Verifica que no esté dañado.' };
    }
    const signature = detectCaptureFormat(workbook.headers);
    if (!signature) {
      return {
        kind: 'error',
        message: 'No reconocemos este formato de archivo — no coincide con Santander ni Mapfre.',
      };
    }
    return {
      kind: 'ok',
      financiera: signature.financiera,
      parsedRows: parseCaptureRows(signature, workbook.headers, workbook.rows),
    };
  }

  /**
   * Procesa las filas en chunks (no todas de una vez) para que la barra de
   * progreso avance de verdad con archivos grandes — por chunk: limpia
   * placa/motor (ya vienen limpios de `parseCaptureRows`), rechaza placa
   * vacía o repetida dentro del archivo, y para las válidas calcula el
   * contrato (mock SAP) y la última posición (nuestra flota). `isCancelled`
   * deja que el llamador aborte si el usuario cerró/reinició la carga
   * mientras esto corría.
   */
  async validateRowsInChunks(
    parsedRows: readonly ParsedCaptureRow[],
    financiera: CaptureFinanciera,
    isCancelled: () => boolean,
    onProgress: (percent: number) => void,
  ): Promise<BulkValidationRow[]> {
    const CHUNK_SIZE = 80;
    const seenUnitCodes = new Set<string>();
    const rows: BulkValidationRow[] = [];

    for (let start = 0; start < parsedRows.length; start += CHUNK_SIZE) {
      if (isCancelled()) return rows;
      const chunk = parsedRows.slice(start, start + CHUNK_SIZE);
      for (const parsedRow of chunk) {
        if (!parsedRow.unitCode) {
          rows.push({
            row: parsedRow.rowNumber,
            unitCode: parsedRow.unitCode,
            source: parsedRow.source,
            financiera,
            outcome: 'rejected',
            reason: 'La fila no trae placa.',
          });
          continue;
        }
        if (seenUnitCodes.has(parsedRow.unitCode)) {
          rows.push({
            row: parsedRow.rowNumber,
            unitCode: parsedRow.unitCode,
            source: parsedRow.source,
            financiera,
            outcome: 'rejected',
            reason: 'La unidad está repetida dentro del archivo.',
          });
          continue;
        }
        seenUnitCodes.add(parsedRow.unitCode);

        const contractStatus = sapContractStatusFor(parsedRow.unitCode, parsedRow.engineCode);
        const fleetMatch = this.fleet
          .units()
          .find(
            (unit) =>
              unit.vehicleCode.toUpperCase() === parsedRow.unitCode &&
              deviceInfoFor(unit).engineCode.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
                parsedRow.engineCode,
          );

        rows.push({
          row: parsedRow.rowNumber,
          unitCode: parsedRow.unitCode,
          source: parsedRow.source,
          financiera,
          outcome: 'valid',
          engineCode: parsedRow.engineCode,
          chassisCode: parsedRow.chassisCode,
          clientName: parsedRow.clientName,
          marca: parsedRow.marca,
          modelo: parsedRow.modelo,
          caseNumber: parsedRow.caseNumber,
          receivedOn: parsedRow.receivedOn,
          contractStatus,
          lastPosition: fleetMatch?.position,
          lastPositionAt: fleetMatch?.lastUpdate,
        });
      }
      onProgress(Math.round((Math.min(start + CHUNK_SIZE, parsedRows.length) / parsedRows.length) * 100));
      // Cede el hilo entre chunks — con ~1600 filas, sin esto la UI se congela
      // hasta terminar en vez de mostrar el avance real.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    return rows;
  }

  previewConflicts(units: BulkReconciliationUnit[]): BulkConflictPreviewRow[] {
    return this.api.previewBulkConflicts(units);
  }

  async uploadBulk(
    validRows: readonly BulkValidationRow[],
    allRows: readonly BulkValidationRow[],
    conflictChoices: Record<string, ResolveConflictChoice>,
    fileName: string,
    today: string,
  ) {
    // La lista completa (válidas + rechazadas por duplicado) es lo que se
    // reconcilia contra el sistema: una rechazada por duplicado sigue "en
    // la lista" de su financiera, solo no genera una orden nueva.
    const uploadedUnits: BulkReconciliationUnit[] = allRows.map((row) => ({
      unitCode: row.unitCode,
      financiera: row.financiera,
      row: row.row,
    }));
    const resolutions = new Map(Object.entries(conflictChoices));
    // Prioridad de creación: primero las que sí tienen contrato con
    // nosotros, después el resto en el orden en que llegaron — es solo
    // orden de creación, no un filtro: todas se registran igual.
    const prioritized = [...validRows].sort((first, second) => {
      const firstPriority = first.contractStatus === 'Activo' ? 0 : 1;
      const secondPriority = second.contractStatus === 'Activo' ? 0 : 1;
      return firstPriority - secondPriority;
    });
    return this.api.createBulk(
      prioritized.map((row) => ({
        unitCode: row.unitCode,
        source: row.source || `Carga masiva ${row.financiera}`,
        financiera: row.financiera,
        caseNumber: row.caseNumber || '',
        receivedOn: row.receivedOn || today,
        documents: [],
        engineCode: row.engineCode,
        chassisCode: row.chassisCode,
        clientName: row.clientName,
        marca: row.marca,
        modelo: row.modelo,
        contractStatus: row.contractStatus,
        lastPosition: row.lastPosition,
        lastPositionAt: row.lastPositionAt,
      })),
      uploadedUnits,
      fileName,
      resolutions,
    );
  }
}
