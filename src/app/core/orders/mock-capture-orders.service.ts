import { Injectable, signal } from '@angular/core';

export const CAPTURE_DOCUMENT_TYPES = [
  'resolution',
  'oficio',
  'transit-notification',
  'requisition',
] as const;
export type CaptureDocumentType = (typeof CAPTURE_DOCUMENT_TYPES)[number];

/** Única fuente de verdad de las etiquetas de los 4 documentos requeridos — usada por el formulario y por la columna "Documentos" de la matriz. */
export const CAPTURE_DOCUMENT_DEFINITIONS: ReadonlyArray<{
  type: CaptureDocumentType;
  label: string;
  description: string;
}> = [
  {
    type: 'resolution',
    label: 'Resolución',
    description: 'Documento que sustenta la medida emitida.',
  },
  { type: 'oficio', label: 'Oficio', description: 'Comunicación oficial vinculada a la captura.' },
  {
    type: 'transit-notification',
    label: 'Notificación a Tránsito',
    description: 'Constancia de la notificación a la autoridad de tránsito.',
  },
  {
    type: 'requisition',
    label: 'Requisitoria',
    description: 'Documento de requisitoria correspondiente.',
  },
];

export interface CaptureOrderDocument {
  type: CaptureDocumentType;
  fileName: string;
  fileSize: number;
}

export const CAPTURE_FINANCIERAS = ['Santander', 'Mapfre'] as const;
export type CaptureFinanciera = (typeof CAPTURE_FINANCIERAS)[number];

/**
 * "Activo" (contrato vigente), "Sin contrato" (nunca tuvo contrato con
 * nosotros) y "No vigente" (contrato desactivado/vencido — vale la pena
 * investigar si el GPS sigue activo). Hoy es demo determinística; a futuro
 * se valida contra SAP.
 */
export const CAPTURE_CONTRACT_STATUSES = ['Activo', 'Sin contrato', 'No vigente'] as const;
export type CaptureContractStatus = (typeof CAPTURE_CONTRACT_STATUSES)[number];

/**
 * Único punto donde se calcula el estado de contrato — antes vivía
 * duplicado (hash independiente) en `capture-orders.service.ts` y en
 * `capture-order-info-modal.component.ts`. Toma placa Y motor (no solo
 * placa: una placa sola se puede clonar/reusar) porque así se pidió
 * explícitamente para la carga masiva. Hoy es demo determinística; a futuro
 * se valida contra SAP — pero el contrato de la función (unitCode +
 * engineCode → estado) ya queda listo para esa integración real. Se llama
 * para el 100% de las unidades de cualquier proveedor por igual: ninguna
 * columna del archivo (p. ej. "Proveedor Gps" de Mapfre) se usa como atajo
 * para saltarse esta validación, porque puede estar mal etiquetada.
 */
export function sapContractStatusFor(unitCode: string, engineCode: string): CaptureContractStatus {
  let seed = 0;
  const combined = `${unitCode}|${engineCode}`;
  for (let i = 0; i < combined.length; i++) seed = (seed * 31 + combined.charCodeAt(i)) >>> 0;
  const remainder = seed % 3;
  return remainder === 0 ? 'Sin contrato' : remainder === 1 ? 'Activo' : 'No vigente';
}

export interface CaptureOrderDraft {
  unitCode: string;
  source: string;
  caseNumber: string;
  receivedOn: string;
  documents: CaptureOrderDocument[];
  /**
   * Aseguradora dueña de la lista que trajo esta unidad — se infiere de la
   * firma de columnas del archivo (`capture-order-formats.ts`), no es un
   * valor que traiga el archivo. La reconciliación de cargas masivas
   * compara unidades dentro del mismo grupo de financiera.
   */
  financiera: CaptureFinanciera;
  /** Motor, chasis, cliente, marca y modelo — reales, de la fila del archivo (carga masiva). */
  engineCode?: string;
  chassisCode?: string;
  clientName?: string;
  marca?: string;
  modelo?: string;
  /**
   * Snapshot tomado UNA vez al momento de la carga masiva — nunca se deriva
   * del archivo. `contractStatus` viene de `sapContractStatusFor` (mock
   * SAP); `lastPosition`/`lastPositionAt` de cruzar placa+motor contra
   * `FleetTelemetryService` (nuestra propia flota), para ubicar la unidad
   * en el mapa por su última posición conocida.
   */
  contractStatus?: CaptureContractStatus;
  lastPosition?: [number, number];
  lastPositionAt?: string;
}

export const CAPTURE_ORDER_STATUSES = [
  'Pendiente',
  'Observado',
  'Capturado',
  'Paralizado',
] as const;
export type CaptureOrderStatus = (typeof CAPTURE_ORDER_STATUSES)[number];
const ACTIVE_CAPTURE_ORDER_STATUSES: readonly CaptureOrderStatus[] = ['Pendiente', 'Observado'];

export interface CaptureOrderAuditEntry {
  action: 'Creación' | 'Edición' | 'Cambio de estado' | 'Paralización';
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
  /** Quién y dónde se realizó la captura física — se piden al marcar la orden como Capturado. */
  captureOfficer?: string;
  captureLocation?: string;
  capturedAt?: string;
}

export type CreateCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'duplicate' | 'offline'; message: string };

/**
 * "keep-system": se conserva el estado que ya tiene la orden, se descarta lo
 * que implica la carga. "accept-upload": se acepta lo que implica la carga
 * — si el conflicto era por ausencia (Observado que ya no aparece), pasa a
 * Capturado; si era por presencia (Capturado/Paralizado que la carga sigue
 * listando), vuelve a Pendiente. La decisión se toma durante la validación
 * previa (`previewBulkConflicts()`), antes de confirmar la carga — no
 * después, no hay un "conflicto" que quede pendiente en el sistema.
 */
export type ResolveConflictChoice = 'keep-system' | 'accept-upload';

/**
 * Unidad + financiera tal como viene en el archivo cargado, para
 * reconciliar contra lo que ya existe en el sistema (incluye filas
 * rechazadas por duplicado: siguen "en la lista", solo no generan una
 * orden nueva). `row` es la fila real del archivo (Excel) — no un índice
 * de la tabla de revisión, así que puede no ser consecutiva (fila 50, 51,
 * 64...) y se preserva para mostrarla tal cual en la pantalla de revisión.
 */
export interface BulkReconciliationUnit {
  unitCode: string;
  financiera: CaptureFinanciera;
  row: number;
}

/**
 * Una orden existente cuyo estado contradice lo que implica la carga que se
 * está validando — calculado ANTES de confirmar, para que la decisión
 * (`ResolveConflictChoice`) se tome en la misma pantalla de revisión.
 */
export interface BulkConflictPreviewRow {
  order: CaptureOrder;
  /** "absent": ya no aparece en la lista pero sigue Observado. "present": sigue apareciendo pero el sistema ya la resolvió (Capturado/Paralizado). */
  type: 'absent' | 'present';
  note: string;
  /** Fila real del archivo donde aparece esta unidad — `null` en "absent", porque ahí la unidad justamente no está en el archivo. */
  rowNumber: number | null;
}

export type BulkCreateCaptureOrdersResult = {
  created: CaptureOrder[];
  rejectedUnitCodes: string[];
  /** Órdenes Pendiente que se cerraron solas por no aparecer en la nueva carga de su financiera. */
  autoClosedCount: number;
  /** Órdenes cuya decisión (Sistema/Archivo) se aplicó, tomada durante la revisión previa. */
  resolvedCount: number;
};

/**
 * Un registro por cada carga masiva ejecutada — el historial que permite
 * confirmar que ya se hicieron cargas anteriores sin tener que revisar el
 * `auditTrail` de cada orden por separado.
 */
export interface BulkUploadBatch {
  id: string;
  uploadedAt: string;
  fileName: string;
  financieras: CaptureFinanciera[];
  totalRows: number;
  createdCount: number;
  rejectedCount: number;
  autoClosedCount: number;
  resolvedCount: number;
}

export type UpdateCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'duplicate' | 'forbidden'; message: string };

export type AnnulCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type CloseCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type ObserveCaptureOrderResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type RevertToPendingResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'forbidden' | 'not-found'; message: string };

export type UpdateCaptureDetailsResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'not-found'; message: string };

export type UpdateObservationReasonResult =
  { kind: 'success'; order: CaptureOrder } | { kind: 'not-found'; message: string };

/**
 * Historial sembrado para que la vista no arranque vacía — así se puede
 * confirmar que "ya se hicieron cargas anteriores" sin depender de que
 * alguien suba un archivo primero en la sesión de prueba.
 */
const SEED_BULK_UPLOAD_BATCHES: readonly BulkUploadBatch[] = [
  {
    id: 'LOTE-0001',
    uploadedAt: '18 sep. 2026, 08:15',
    fileName: 'mapfre_activos_18sep.xlsx',
    financieras: ['Mapfre'],
    totalRows: 42,
    createdCount: 5,
    rejectedCount: 2,
    autoClosedCount: 3,
    resolvedCount: 1,
  },
  {
    id: 'LOTE-0002',
    uploadedAt: '19 sep. 2026, 09:30',
    fileName: 'santander_activos_19sep.csv',
    financieras: ['Santander'],
    totalRows: 58,
    createdCount: 8,
    rejectedCount: 1,
    autoClosedCount: 6,
    resolvedCount: 2,
  },
  {
    id: 'LOTE-0003',
    uploadedAt: '20 sep. 2026, 07:50',
    fileName: 'capturas_mixtas_20sep.xlsx',
    financieras: ['Santander', 'Mapfre'],
    totalRows: 90,
    createdCount: 12,
    rejectedCount: 3,
    autoClosedCount: 9,
    resolvedCount: 4,
  },
];

@Injectable({ providedIn: 'root' })
export class MockCaptureOrdersService {
  readonly orders = signal<CaptureOrder[]>([]);
  readonly fixtureOrders = signal<CaptureOrder[]>([]);
  readonly fixturesLoading = signal(false);
  readonly fixturesError = signal('');
  readonly bulkUploadBatches = signal<BulkUploadBatch[]>([...SEED_BULK_UPLOAD_BATCHES]);
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
      status: 'Pendiente',
      auditTrail: [{ action: 'Creación', at: this.timestamp(), detail: 'Orden registrada.' }],
    };
    this.orders.update((orders) => [order, ...orders]);
    return { kind: 'success', order };
  }

  /**
   * Calcula, ANTES de confirmar la carga, qué órdenes existentes contradicen
   * lo que implica `uploadedUnits` — para que la decisión (Sistema/Archivo)
   * se tome en la misma pantalla de revisión, no después de que la carga ya
   * modificó el sistema. No incluye las que se auto-cerrarían solas
   * (Pendiente ausente): esas no requieren una decisión, se resuelven solas.
   */
  previewBulkConflicts(uploadedUnits: readonly BulkReconciliationUnit[]): BulkConflictPreviewRow[] {
    // unitCode → fila real del archivo, para poder mostrarla tal cual en la
    // revisión (no un índice inventado: la fila 50 del Excel sigue siendo
    // la fila 50 acá, aunque no sea consecutiva con la anterior).
    const uploadedByFinanciera = new Map<CaptureFinanciera, Map<string, number>>();
    for (const unit of uploadedUnits) {
      const map = uploadedByFinanciera.get(unit.financiera) ?? new Map<string, number>();
      map.set(unit.unitCode.trim().toUpperCase(), unit.row);
      uploadedByFinanciera.set(unit.financiera, map);
    }

    const rows: BulkConflictPreviewRow[] = [];
    for (const order of this.all()) {
      const uploadedRowsByCode = uploadedByFinanciera.get(order.financiera);
      if (!uploadedRowsByCode) continue;
      const fileRow = uploadedRowsByCode.get(order.unitCode);
      const isListed = fileRow !== undefined;
      if (!isListed && order.status === 'Observado') {
        rows.push({
          order,
          type: 'absent',
          rowNumber: null,
          note: `Ya no aparece en la carga de ${order.financiera}, pero sigue Observado en el sistema.`,
        });
      } else if (isListed && (order.status === 'Capturado' || order.status === 'Paralizado')) {
        rows.push({
          order,
          type: 'present',
          rowNumber: fileRow,
          note: `Sigue apareciendo en la carga de ${order.financiera} (fila ${fileRow}), pero el sistema la tiene como ${order.status}.`,
        });
      }
    }
    return rows;
  }

  /**
   * `uploadedUnits` es la lista completa tal como llegó del archivo (incluye
   * las unidades rechazadas por duplicado: siguen "en la lista" aunque no
   * generen una orden nueva). Se usa para reconciliar: una carga nueva es
   * una foto completa de lo que cada financiera considera activo, así que
   * lo que ya no aparece deja de estar vigente. `resolutions` trae, por id
   * de orden, la decisión ya tomada durante la revisión previa
   * (`previewBulkConflicts()`) para cada fila que contradecía el sistema.
   */
  async createBulk(
    drafts: readonly CaptureOrderDraft[],
    uploadedUnits: readonly BulkReconciliationUnit[],
    fileName: string,
    resolutions: ReadonlyMap<string, ResolveConflictChoice>,
  ): Promise<BulkCreateCaptureOrdersResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 900));

    const created: CaptureOrder[] = [];
    const rejectedUnitCodes: string[] = [];
    // Cualquier unidad ya registrada — en cualquier estado, no solo
    // Pendiente/Observado — no genera una orden nueva: si reaparece estando
    // Capturada/Paralizada, la reconciliación de abajo aplica la decisión ya
    // tomada en vez de crear un duplicado.
    const occupiedCodes = new Set(this.all().map((order) => order.unitCode.trim().toUpperCase()));
    const firstSequence = this.orders().length + 1;

    drafts.forEach((draft) => {
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
        status: 'Pendiente',
        auditTrail: [
          {
            action: 'Creación',
            at: this.timestamp(),
            detail: 'Orden registrada mediante carga masiva.',
          },
        ],
      });
    });

    const timestamp = this.timestamp();
    const uploadedByFinanciera = new Map<CaptureFinanciera, Set<string>>();
    for (const unit of uploadedUnits) {
      const set = uploadedByFinanciera.get(unit.financiera) ?? new Set<string>();
      set.add(unit.unitCode.trim().toUpperCase());
      uploadedByFinanciera.set(unit.financiera, set);
    }

    let autoClosedCount = 0;
    let resolvedCount = 0;
    const reconcile = (order: CaptureOrder): CaptureOrder => {
      const uploadedCodes = uploadedByFinanciera.get(order.financiera);
      // Esta carga no trajo nada de la financiera de esta orden: no hay con qué reconciliar.
      if (!uploadedCodes) return order;

      const isListed = uploadedCodes.has(order.unitCode);
      if (!isListed && order.status === 'Pendiente') {
        autoClosedCount++;
        return {
          ...order,
          status: 'Capturado',
          auditTrail: [
            ...this.auditOf(order),
            {
              action: 'Cambio de estado',
              at: timestamp,
              detail: `Estado actualizado de Pendiente a Capturado (ausente en la carga de ${order.financiera} del ${timestamp}).`,
            },
          ],
        };
      }

      const resolution = resolutions.get(order.id);
      if (!resolution) return order;
      resolvedCount++;
      if (resolution === 'keep-system') {
        return {
          ...order,
          auditTrail: [
            ...this.auditOf(order),
            {
              action: 'Cambio de estado',
              at: timestamp,
              detail: `Conflicto resuelto durante la carga: se conservó el estado ${order.status} que ya tenía el sistema.`,
            },
          ],
        };
      }
      const nextStatus: CaptureOrderStatus = order.status === 'Observado' ? 'Capturado' : 'Pendiente';
      return {
        ...order,
        status: nextStatus,
        auditTrail: [
          ...this.auditOf(order),
          {
            action: 'Cambio de estado',
            at: timestamp,
            detail: `Conflicto resuelto durante la carga: se aceptó el dato de la carga, estado actualizado de ${order.status} a ${nextStatus}.`,
          },
        ],
      };
    };

    this.orders.update((orders) => orders.map(reconcile));
    this.fixtureOrders.update((orders) => orders.map(reconcile));

    if (created.length) this.orders.update((orders) => [...created, ...orders]);

    const batch: BulkUploadBatch = {
      id: `LOTE-${String(this.bulkUploadBatches().length + 1).padStart(4, '0')}`,
      uploadedAt: timestamp,
      fileName,
      financieras: [...uploadedByFinanciera.keys()],
      totalRows: uploadedUnits.length,
      createdCount: created.length,
      rejectedCount: rejectedUnitCodes.length,
      autoClosedCount,
      resolvedCount,
    };
    this.bulkUploadBatches.update((batches) => [batch, ...batches]);

    return { created, rejectedUnitCodes, autoClosedCount, resolvedCount };
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
      return { kind: 'not-found', message: 'No encontramos la captura que intentas paralizar.' };
    if (current.status === 'Paralizado') {
      return { kind: 'forbidden', message: 'Esta captura ya está paralizada.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Paralizado',
      annulmentReason: reason.trim(),
      annulledAt: timestamp,
      auditTrail: [
        ...this.auditOf(current),
        { action: 'Paralización', at: timestamp, detail: `Motivo: ${reason.trim()}` },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  async close(id: string, captureOfficer: string, captureLocation: string): Promise<CloseCaptureOrderResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas marcar como capturado.' };
    if (current.status === 'Capturado') {
      return { kind: 'forbidden', message: 'Esta captura ya está marcada como capturada.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Capturado',
      captureOfficer: captureOfficer.trim(),
      captureLocation: captureLocation.trim(),
      capturedAt: timestamp,
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Cambio de estado',
          at: timestamp,
          detail: `Estado actualizado de ${current.status} a Capturado. Responsable: ${captureOfficer.trim()} · Ubicación: ${captureLocation.trim()}.`,
        },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  /**
   * Corrige responsable/ubicación de una captura ya marcada como Capturado
   * — a pedido de Enzo (23 sep. 2026), sin repetir la transición de estado
   * ni sus validaciones de `close()`. Queda registrado en el historial como
   * un evento propio, distinto del "Cambio de estado" original.
   */
  async updateCaptureDetails(
    id: string,
    captureOfficer: string,
    captureLocation: string,
  ): Promise<UpdateCaptureDetailsResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas actualizar.' };

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      captureOfficer: captureOfficer.trim(),
      captureLocation: captureLocation.trim(),
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Edición',
          at: timestamp,
          detail: `Datos de captura actualizados. Responsable: ${captureOfficer.trim()} · Ubicación: ${captureLocation.trim()}.`,
        },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  /** Cualquier estado puede volver a Pendiente — no solo Observado. */
  async revertToPending(id: string): Promise<RevertToPendingResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas actualizar.' };
    if (current.status === 'Pendiente') {
      return { kind: 'forbidden', message: 'Esta captura ya está pendiente.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Pendiente',
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Cambio de estado',
          at: timestamp,
          detail: `Estado actualizado de ${current.status} a Pendiente.`,
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
    if (current.status === 'Observado') {
      return { kind: 'forbidden', message: 'Esta captura ya está observada.' };
    }

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      status: 'Observado',
      observationReason: reason.trim(),
      observedAt: timestamp,
      auditTrail: [
        ...this.auditOf(current),
        {
          action: 'Cambio de estado',
          at: timestamp,
          detail: `Estado actualizado de ${current.status} a Observado. Observación: ${reason.trim()}`,
        },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  /**
   * Corrige el texto de una observación ya registrada — a pedido de Enzo
   * (23 sep. 2026), sin repetir la transición de estado ni sus validaciones
   * de `observe()`.
   */
  async updateObservationReason(id: string, reason: string): Promise<UpdateObservationReasonResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const current = this.find(id);
    if (!current)
      return { kind: 'not-found', message: 'No encontramos la captura que intentas actualizar.' };

    const timestamp = this.timestamp();
    const updated: CaptureOrder = {
      ...current,
      observationReason: reason.trim(),
      auditTrail: [
        ...this.auditOf(current),
        { action: 'Edición', at: timestamp, detail: `Observación actualizada: ${reason.trim()}` },
      ],
    };
    this.replace(updated);
    return { kind: 'success', order: updated };
  }

  /**
   * Adjuntar/quitar un documento fuera del formulario — desde la casilla de
   * la columna "Documentos" de la matriz — actualiza la orden ya registrada
   * directamente, sin pasar por el borrador de edición.
   */
  attachDocument(id: string, document: CaptureOrderDocument): CaptureOrder | null {
    const current = this.find(id);
    if (!current) return null;
    const updated: CaptureOrder = {
      ...current,
      documents: [
        ...(current.documents ?? []).filter((existing) => existing.type !== document.type),
        document,
      ],
    };
    this.replace(updated);
    return updated;
  }
  removeDocument(id: string, type: CaptureDocumentType): CaptureOrder | null {
    const current = this.find(id);
    if (!current) return null;
    const updated: CaptureOrder = {
      ...current,
      documents: (current.documents ?? []).filter((document) => document.type !== type),
    };
    this.replace(updated);
    return updated;
  }

  private canEdit(order: CaptureOrder): boolean {
    return order.status === 'Pendiente' || order.status === 'Observado';
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
