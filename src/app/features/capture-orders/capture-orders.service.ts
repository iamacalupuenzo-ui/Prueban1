import { Injectable, computed, inject, signal } from '@angular/core';
import type { IconName, SortOrder, TagSeverity } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_DOCUMENT_DEFINITIONS,
  sapContractStatusFor,
  type BulkConflictPreviewRow,
  type BulkReconciliationUnit,
  type CaptureContractStatus,
  type CaptureDocumentType,
  type CaptureFinanciera,
  type CaptureOrder,
  type CaptureOrderAuditEntry,
  type CaptureOrderDraft,
  type CaptureOrderStatus,
  type ResolveConflictChoice,
  MockCaptureOrdersService,
} from '../../core/orders/mock-capture-orders.service';
import { detectCaptureFormat, parseCaptureRows, type ParsedCaptureRow } from '../../core/orders/capture-order-formats';
import { readCaptureWorkbook } from '../../core/orders/capture-order-workbook';
import { FleetTelemetryService, deviceInfoFor } from '../../core/fleet/fleet-telemetry.service';
import { UnitOption } from '../../shared/unit-autocomplete.component';
import { UnitTypeFilterOption } from '../../shared/unit-type-multi-select.component';

/**
 * Estado y orquestación de la pantalla de Capturas.
 *
 * Reúne lo que antes vivía disperso en `NewCaptureOrderPage`: filtros y
 * paginación de la matriz, borrador/validación del formulario de registro,
 * carga masiva y las acciones de ciclo de vida de una orden (cerrar,
 * observar, anular). Los componentes hijos (toolbar, tabla, drawer de
 * detalle y diálogos) inyectan este servicio directamente con `inject()` en
 * lugar de recibir decenas de `@Input`/`@Output`: es el mismo patrón de
 * "servicio de estado compartido" que ya usa el resto de Angular para una
 * sola pantalla con muchas superficies coordinadas. Ver la decisión
 * correspondiente en `docs/arquitectura-new-capture-order.md`.
 */

/**
 * Los campos que la carga masiva agrega a `CaptureOrderDraft` (motor,
 * chasis, cliente, marca/modelo, contrato, última posición) no los toca el
 * formulario individual — hoy fuera de alcance, ver comentario en
 * `emptyDraft()` — así que no participan del borrador/errores de ese
 * formulario.
 */
export type DraftField = Exclude<
  keyof CaptureOrderDraft,
  | 'documents'
  | 'engineCode'
  | 'chassisCode'
  | 'clientName'
  | 'marca'
  | 'modelo'
  | 'contractStatus'
  | 'lastPosition'
  | 'lastPositionAt'
>;
export type FormField = DraftField | 'documents';
export type RowsPerPage = 10 | 25 | 50 | 100;
export type UnitType = 'VHC' | 'TRK' | 'VAN' | 'BUS';
export type BulkUploadStage = 'select' | 'validating' | 'review' | 'uploading' | 'success';

export type BulkValidationRow = {
  row: number;
  unitCode: string;
  source: string;
  financiera: CaptureFinanciera;
  outcome: 'valid' | 'rejected';
  reason?: string;
  engineCode?: string;
  chassisCode?: string;
  clientName?: string;
  marca?: string;
  modelo?: string;
  caseNumber?: string;
  receivedOn?: string;
  contractStatus?: CaptureContractStatus;
  lastPosition?: [number, number];
  lastPositionAt?: string;
};

/**
 * Una sola tabla de revisión combina dos tipos de fila: "rejected" (error
 * real del archivo, p. ej. duplicado dentro del mismo archivo) y
 * "conflict" (el sistema y el archivo no coinciden, requiere elegir
 * Sistema/Archivo). `rowNumber` es siempre la fila real del archivo
 * (Excel), no un índice de esta tabla — puede no ser consecutiva (fila 50,
 * 51, 64...). En "conflict" puede ser `null` cuando la unidad justamente
 * no está en el archivo (ausente, ya no la piden).
 */
export type BulkReviewRow =
  | { kind: 'rejected'; rowNumber: number; unitCode: string; reason: string }
  | {
      kind: 'conflict';
      rowNumber: number | null;
      unitCode: string;
      note: string;
      orderId: string;
      currentStatus: CaptureOrderStatus;
      acceptedStatus: CaptureOrderStatus;
    };

const DEFAULT_SORT = { key: 'created', order: 'desc' as const };
const BULK_ERROR_PAGE_SIZE = 5;

export const UNIT_TYPE_OPTIONS: ReadonlyArray<UnitTypeFilterOption & { value: UnitType }> = [
  { label: 'Van de distribución', value: 'VHC' },
  { label: 'Camión rígido', value: 'TRK' },
  { label: 'Furgón operativo', value: 'VAN' },
  { label: 'Bus de personal', value: 'BUS' },
];

const UNIT_OPTIONS: UnitOption[] = [
  {
    code: 'VHC-1024',
    owner: 'María Salazar',
    lastLocation: 'Av. Arequipa 4520, Miraflores · 20 sep. 2026, 10:18',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.1211%2C-77.0297',
    icon: 'car',
  },
  {
    code: 'VHC-1041',
    owner: 'Carlos Mendoza',
    lastLocation: 'Av. Javier Prado Este 1450, San Isidro · 20 sep. 2026, 10:32',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0931%2C-77.0201',
    icon: 'car',
  },
  {
    code: 'VHC-1158',
    owner: 'Ana Torres',
    lastLocation: 'Av. Elmer Faucett 3200, Callao · 20 sep. 2026, 10:05',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0245%2C-77.1039',
    icon: 'car',
  },
  {
    code: 'TRK-2087',
    owner: 'Luis Ramos',
    lastLocation: 'Av. Argentina 1860, Cercado de Lima · 20 sep. 2026, 10:21',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0464%2C-77.0718',
    icon: 'truck',
  },
  {
    code: 'TRK-2143',
    owner: 'Rosa Quispe',
    lastLocation: 'Carretera Central km 8.5, Ate · 20 sep. 2026, 10:14',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0433%2C-76.9427',
    icon: 'truck',
  },
  {
    code: 'TRK-2206',
    owner: 'Jorge Cárdenas',
    lastLocation: 'Av. Nicolás Ayllón 2740, El Agustino · 20 sep. 2026, 09:58',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0487%2C-76.9982',
    icon: 'truck',
  },
  {
    code: 'VAN-0412',
    owner: 'Elena Flores',
    lastLocation: 'Av. República de Panamá 3560, Surquillo · 20 sep. 2026, 10:26',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.1235%2C-77.0178',
    icon: 'truck',
  },
  {
    code: 'VAN-0534',
    owner: 'Miguel Huamán',
    lastLocation: 'Av. Universitaria 6890, Comas · 20 sep. 2026, 10:08',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-11.9514%2C-77.0814',
    icon: 'truck',
  },
  {
    code: 'BUS-0379',
    owner: 'Patricia Vega',
    lastLocation: 'Av. La Marina 2355, San Miguel · 20 sep. 2026, 10:11',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0774%2C-77.0916',
    icon: 'bus',
  },
];

const DEMO_LAST_LOCATIONS: ReadonlyArray<Pick<UnitOption, 'lastLocation' | 'lastLocationMapUrl'>> =
  UNIT_OPTIONS.map(({ lastLocation, lastLocationMapUrl }) => ({
    lastLocation,
    lastLocationMapUrl,
  }));

const DEMO_OWNERS = [
  'María Salazar',
  'Carlos Mendoza',
  'Ana Torres',
  'Luis Ramos',
  'Rosa Quispe',
  'Jorge Cárdenas',
  'Elena Flores',
  'Miguel Huamán',
  'Patricia Vega',
] as const;

@Injectable({ providedIn: 'root' })
export class CaptureOrdersService {
  private readonly api = inject(MockCaptureOrdersService);
  private readonly fleet = inject(FleetTelemetryService);

  /** Passthrough de la carga de fixtures: la tabla y el estado vacío la consumen directo. */
  readonly fixturesLoading = this.api.fixturesLoading;
  readonly fixturesError = this.api.fixturesError;
  /** Passthrough del historial de cargas masivas — lo consume el diálogo de historial. */
  readonly bulkUploadBatches = this.api.bulkUploadBatches;
  readonly bulkHistoryOpen = signal(false);

  openBulkHistory(): void {
    this.bulkHistoryOpen.set(true);
  }
  closeBulkHistory(): void {
    this.bulkHistoryOpen.set(false);
  }

  readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
  readonly today = this.localToday();
  readonly caseNumberPrefix = `EXP-${this.today.slice(0, 4)}-`;

  // ---------------------------------------------------------------------
  // Filtros, orden y paginación de la matriz
  // ---------------------------------------------------------------------
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly contractFilter = signal('');
  readonly unitTypeFilter = signal<UnitType[]>([]);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly rowsPerPage = signal<RowsPerPage>(10);
  readonly page = signal(1);
  readonly sortKey = signal(DEFAULT_SORT.key);
  readonly sortOrder = signal<SortOrder>(DEFAULT_SORT.order);

  readonly allOrders = computed(() => [...this.api.orders(), ...this.api.fixtureOrders()]);

  readonly filteredUnitOptions = computed(() => {
    const selectedTypes = this.unitTypeFilter();
    return selectedTypes.length
      ? UNIT_OPTIONS.filter((unit) => selectedTypes.includes(this.unitTypeOf(unit.code)))
      : UNIT_OPTIONS;
  });
  readonly selectedUnit = computed(() => {
    const unitCode = this.draft().unitCode;
    return UNIT_OPTIONS.find((unit) => unit.code === unitCode) ?? null;
  });

  readonly filteredOrders = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    const contract = this.contractFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const hasDateRange = !!from && !!to;
    return this.allOrders().filter((order) => {
      const registrationDate = this.registrationDate(order.createdAt);
      return (
        (!search ||
          `${order.id} ${order.unitCode} ${this.ownerOf(order.unitCode)}`
            .toLocaleLowerCase()
            .includes(search)) &&
        (!status || order.status === status) &&
        (!contract || this.contractStatusOf(order.unitCode) === contract) &&
        (!hasDateRange || (registrationDate >= from && registrationDate <= to))
      );
    });
  });
  readonly sortedOrders = computed(() => {
    const key = this.sortKey();
    const direction = this.sortOrder() === 'asc' ? 1 : -1;
    return [...this.filteredOrders()].sort((first, second) => {
      const firstValue = this.sortValue(first, key);
      const secondValue = this.sortValue(second, key);
      const comparison =
        typeof firstValue === 'number' && typeof secondValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue), 'es', { numeric: true });
      return direction * comparison;
    });
  });
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedOrders().length / this.rowsPerPage())),
  );
  readonly visibleOrders = computed(() => {
    const start = (this.page() - 1) * this.rowsPerPage();
    return this.sortedOrders().slice(start, start + this.rowsPerPage());
  });
  readonly tableSummary = computed(() => {
    if (this.fixturesLoading()) return 'Cargando capturas';
    const total = this.filteredOrders().length;
    if (!total) return '0 registros';
    const first = (this.page() - 1) * this.rowsPerPage() + 1;
    return `${first}–${Math.min(first + this.rowsPerPage() - 1, total)} de ${total} registros`;
  });

  loadFixtureOrders(): Promise<void> {
    return this.api.loadFixtureOrders();
  }
  retryFixtureLoad(): void {
    void this.api.loadFixtureOrders();
  }
  hasActiveCaptureOrder(unitCode: string, excludingOrderId?: string): boolean {
    return this.api.hasActiveCaptureOrder(unitCode, excludingOrderId);
  }
  onUnitSelected(unitCode: string): void {
    this.setField('unitCode', unitCode);
  }
  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }
  setStatusFilter(value: string): void {
    this.statusFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
  }
  setContractFilter(value: string): void {
    this.contractFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
  }
  setUnitTypeFilter(value: readonly string[]): void {
    const nextTypes = value.filter((type): type is UnitType =>
      UNIT_TYPE_OPTIONS.some((option) => option.value === type),
    );
    this.unitTypeFilter.set(nextTypes);
    const selectedUnit = this.draft().unitCode;
    if (selectedUnit && nextTypes.length && !nextTypes.includes(this.unitTypeOf(selectedUnit)))
      this.setField('unitCode', '');
  }
  clearDateRange(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
  }
  setDateRange(from: string, to: string): void {
    this.dateFrom.set(from);
    this.dateTo.set(to);
    this.page.set(1);
  }
  rowsPerPageValue(): string {
    return String(this.rowsPerPage());
  }
  setRowsPerPage(value: string): void {
    const size = Number(value);
    this.rowsPerPage.set(
      ([10, 25, 50, 100] as const).includes(size as RowsPerPage) ? (size as RowsPerPage) : 10,
    );
    this.page.set(1);
  }
  setPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }
  setSort(key: string): void {
    const currentKey = this.sortKey();
    const currentOrder = this.sortOrder();

    if (key !== currentKey) {
      this.sortKey.set(key);
      this.sortOrder.set('asc');
    } else if (key === DEFAULT_SORT.key && currentOrder === DEFAULT_SORT.order) {
      this.sortOrder.set('asc');
    } else if (currentOrder === 'asc') {
      this.sortOrder.set('desc');
    } else {
      this.sortKey.set(DEFAULT_SORT.key);
      this.sortOrder.set(DEFAULT_SORT.order);
    }

    this.page.set(1);
  }
  private sortValue(order: CaptureOrder, key: string): string | number {
    if (key === 'created') return this.registrationTimestamp(order.createdAt);
    if (key === 'documents') return this.documentsCompleteCountOf(order);
    return (
      (
        {
          unit: order.unitCode,
          financiera: order.financiera,
          lastLocation: this.locationOf(order.unitCode)?.lastLocation ?? '',
          engine: this.engineCodeOf(order.unitCode),
          contract: this.contractStatusOf(order.unitCode),
          status: order.status,
        } as Record<string, string>
      )[key] ?? ''
    );
  }
  /**
   * Meses en 0-index para `registrationTimestamp`. `sep`/`set` son alias del
   * mismo mes: `Intl.DateTimeFormat('es-PE', ...)` genera "set." para
   * setiembre en tiempo real (Node/V8 con ICU), mientras que los fixtures
   * escritos a mano usan "sep." — antes solo se aceptaba "sep", así que
   * CUALQUIER orden creada en setiembre real (todas las de carga masiva,
   * hoy) caía en el fallback `0` y quedaba ordenada como la más antigua en
   * vez de la más reciente.
   */
  private static readonly MONTH_INDEX: Record<string, number> = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    set: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  };
  /**
   * `Intl.DateTimeFormat('es-PE', { timeStyle: 'short' })` en tiempo real
   * genera 12 horas con "a. m."/"p. m." (con espacios y puntos, a veces con
   * un espacio angosto U+202F antes) — los fixtures escritos a mano usan
   * 24 horas ("08:00"). El regex acepta ambos formatos.
   */
  private registrationTimestamp(value: string): number {
    const normalized = value.replace(/[  ]/g, ' ');
    const match = normalized.match(
      /^(\d{1,2})\s+([a-záéíóú]{3,4})\.\s+(\d{4}),\s+(\d{1,2}):(\d{2})(?:\s*(a\.?\s?m\.?|p\.?\s?m\.?))?$/i,
    );
    if (!match) return 0;
    const monthIndex = CaptureOrdersService.MONTH_INDEX[match[2].toLowerCase()];
    if (monthIndex === undefined) return 0;
    let hour = Number(match[4]);
    const meridiem = match[6]?.toLowerCase().replace(/[.\s]/g, '');
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return new Date(Number(match[3]), monthIndex, Number(match[1]), hour, Number(match[5])).getTime();
  }
  private registrationDate(value: string): string {
    const normalized = value.replace(/[  ]/g, ' ');
    const match = normalized.match(/^(\d{1,2})\s+([a-záéíóú]{3,4})\.\s+(\d{4}),/i);
    if (!match) return '';
    const monthIndex = CaptureOrdersService.MONTH_INDEX[match[2].toLowerCase()];
    if (monthIndex === undefined) return '';
    return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------
  // Helpers de datos de unidad/orden compartidos entre tabla, drawer y formulario
  // ---------------------------------------------------------------------
  private unitTypeOf(unitCode: string): UnitType {
    const prefix = unitCode.split('-', 1)[0];
    return (UNIT_TYPE_OPTIONS.some((type) => type.value === prefix) ? prefix : 'VHC') as UnitType;
  }
  unitIconOf(unitCode: string): IconName {
    const selectedUnit = UNIT_OPTIONS.find((unit) => unit.code === unitCode);
    if (selectedUnit) return selectedUnit.icon;

    const type = this.unitTypeOf(unitCode);
    return type === 'BUS' ? 'bus' : type === 'VHC' ? 'car' : 'truck';
  }
  ownerOf(unitCode: string): string {
    const selectedUnit = UNIT_OPTIONS.find((unit) => unit.code === unitCode);
    if (selectedUnit) return selectedUnit.owner;

    const sequence = Number(unitCode.split('-')[1]);
    return DEMO_OWNERS[Math.abs(Number.isFinite(sequence) ? sequence : 0) % DEMO_OWNERS.length];
  }
  /**
   * Fallback demo determinística — solo para órdenes viejas del fixture
   * semilla que no tienen motor/contrato reales todavía (antes de esta
   * carga masiva, TODO era hash). Las órdenes nuevas (carga masiva) ya
   * traen `engineCode`/`contractStatus` reales, ver `orderOf`.
   */
  private captureSeed(unitCode: string): number {
    let seed = 0;
    for (let i = 0; i < unitCode.length; i++) seed = (seed * 31 + unitCode.charCodeAt(i)) >>> 0;
    return seed;
  }
  private orderOf(unitCode: string): CaptureOrder | undefined {
    return this.allOrders().find((order) => order.unitCode === unitCode);
  }
  engineCodeOf(unitCode: string): string {
    const engineCode = this.orderOf(unitCode)?.engineCode;
    if (engineCode) return engineCode;
    const seed = this.captureSeed(unitCode);
    return `ISB${(seed % 9) + 1}.${seed % 9}-${String(seed % 999).padStart(3, '0')}`;
  }
  /**
   * "Activo"/"Sin contrato"/"No vigente" en vez de un simple sí/no:
   * "No vigente" (contrato desactivado/vencido) es la señal que le dice al
   * operador "investigar, puede que el GPS siga activo" — distinto de una
   * unidad que nunca tuvo contrato con nosotros ("Sin contrato"). Las
   * órdenes de carga masiva ya traen el snapshot real (`sapContractStatusFor`,
   * calculado una vez al momento de la carga); el hash de acá es solo
   * fallback para el fixture semilla.
   */
  contractStatusOf(unitCode: string): CaptureContractStatus {
    const contractStatus = this.orderOf(unitCode)?.contractStatus;
    if (contractStatus) return contractStatus;
    const remainder = this.captureSeed(unitCode) % 3;
    return remainder === 0 ? 'Sin contrato' : remainder === 1 ? 'Activo' : 'No vigente';
  }
  contractStatusSeverity(status: CaptureContractStatus): TagSeverity {
    return status === 'Activo' ? 'success' : status === 'No vigente' ? 'warn' : 'secondary';
  }
  documentsCompleteCountOf(order: CaptureOrder): number {
    const attachedTypes = new Set((order.documents ?? []).map((document) => document.type));
    return CAPTURE_DOCUMENT_DEFINITIONS.filter((definition) => attachedTypes.has(definition.type))
      .length;
  }
  hasDocument(order: CaptureOrder, type: CaptureDocumentType): boolean {
    return (order.documents ?? []).some((document) => document.type === type);
  }
  /**
   * Marcar/desmarcar un documento desde la casilla de la matriz, sin la
   * carga del archivo real todavía — eso queda para una iteración
   * posterior. Por ahora solo registra la presencia del documento en la
   * orden ya registrada.
   */
  toggleDocumentMark(order: CaptureOrder, type: CaptureDocumentType): void {
    const updated = this.hasDocument(order, type)
      ? this.api.removeDocument(order.id, type)
      : this.api.attachDocument(order.id, {
          type,
          fileName: CAPTURE_DOCUMENT_DEFINITIONS.find((definition) => definition.type === type)!
            .label,
          fileSize: 0,
        });
    if (!updated) return;
    if (this.selectedOrder()?.id === updated.id) this.selectedOrder.set(updated);
  }
  locationOf(unitCode: string): UnitOption | null {
    const knownUnit = UNIT_OPTIONS.find((unit) => unit.code === unitCode);
    if (knownUnit) return knownUnit;

    // Snapshot real tomado al momento de la carga masiva (cruce placa+motor
    // contra `FleetTelemetryService`, ver `validateBulkFile`) — no una
    // ubicación en vivo, así que no cambia si la unidad se sigue moviendo.
    const order = this.orderOf(unitCode);
    if (order?.lastPosition) {
      const [lat, lng] = order.lastPosition;
      return {
        code: unitCode,
        owner: this.ownerOf(unitCode),
        icon: this.unitIconOf(unitCode),
        lastLocation: `${lat.toFixed(4)}, ${lng.toFixed(4)}${order.lastPositionAt ? ` · ${new Date(order.lastPositionAt).toLocaleString('es-PE')}` : ''}`,
        lastLocationMapUrl: `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`,
      };
    }

    // Una unidad sin contrato nunca tuvo GPS nuestro que reportarle una
    // posición — no hay de dónde vendría ese dato.
    if (this.contractStatusOf(unitCode) === 'Sin contrato') return null;

    const sequence = Number(unitCode.split('-')[1]);
    if (!Number.isFinite(sequence) || sequence % 4 === 0) return null;

    const example = DEMO_LAST_LOCATIONS[Math.abs(sequence) % DEMO_LAST_LOCATIONS.length];
    return {
      code: unitCode,
      owner: this.ownerOf(unitCode),
      icon: this.unitIconOf(unitCode),
      ...example,
    };
  }
  formatReceivedDate(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : 'No disponible';
  }
  statusSeverity(status: string): TagSeverity {
    return (
      (
        {
          Pendiente: 'info',
          Observado: 'danger',
          Capturado: 'success',
          Paralizado: 'warn',
        } as Record<string, TagSeverity>
      )[status] ?? 'secondary'
    );
  }
  statusEntries(order: CaptureOrder): CaptureOrderAuditEntry[] {
    const entries = order.auditTrail ?? [
      { action: 'Creación' as const, at: order.createdAt, detail: 'Orden registrada.' },
    ];
    const lifecycleEntries = entries.filter(
      (entry) =>
        entry.action === 'Creación' ||
        entry.action === 'Cambio de estado' ||
        entry.action === 'Paralización',
    );

    return lifecycleEntries.length
      ? lifecycleEntries
      : [{ action: 'Creación', at: order.createdAt, detail: 'Orden registrada.' }];
  }
  canEdit(order: CaptureOrder): boolean {
    return order.status === 'Pendiente' || order.status === 'Observado';
  }
  canClose(order: CaptureOrder): boolean {
    return order.status === 'Pendiente' || order.status === 'Observado';
  }
  canObserve(order: CaptureOrder): boolean {
    return order.status === 'Pendiente';
  }
  canRevertToPending(order: CaptureOrder): boolean {
    return order.status === 'Observado';
  }
  canAnnul(order: CaptureOrder): boolean {
    return order.status !== 'Capturado' && order.status !== 'Paralizado';
  }

  // ---------------------------------------------------------------------
  // Mensaje de retroalimentación (toast) — lo consumen registro, cierre,
  // observación, anulación, carga masiva y la exportación de la tabla.
  // ---------------------------------------------------------------------
  readonly message = signal('');
  readonly messageKind = signal<'success' | 'error' | 'info'>('success');
  private feedbackTimeout?: number;

  showMessage(kind: 'success' | 'error' | 'info', message: string, duration = 4000): void {
    this.dismissMessage();
    this.messageKind.set(kind);
    this.message.set(message);
    if (kind !== 'error')
      this.feedbackTimeout = window.setTimeout(() => this.dismissMessage(), duration);
  }
  dismissMessage(): void {
    if (this.feedbackTimeout !== undefined) window.clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = undefined;
    this.message.set('');
  }

  // ---------------------------------------------------------------------
  // Retroalimentación de copiar al portapapeles — compartida entre la celda
  // de última ubicación de la tabla, el detalle de la orden y la carga
  // masiva, porque el original usaba una sola fuente de verdad para que
  // copiar en un lugar reemplace el aviso "copiado" de cualquier otro.
  // ---------------------------------------------------------------------
  readonly copiedBulkUnitCode = signal<string | null>(null);
  readonly copiedLocation = signal<string | null>(null);
  private copyFeedbackTimeout?: number;

  async copyBulkUnitCode(unitCode: string): Promise<void> {
    if (!(await this.copyText(unitCode))) return;
    this.copiedLocation.set(null);
    this.copiedBulkUnitCode.set(unitCode);
    this.resetCopyFeedback();
    this.showMessage('success', 'Código de unidad copiado', 2000);
  }
  async copyLastLocation(location: string): Promise<void> {
    if (!(await this.copyText(location))) return;
    this.copiedBulkUnitCode.set(null);
    this.copiedLocation.set(location);
    this.resetCopyFeedback();
    this.showMessage('success', 'Ubicación copiada', 2000);
  }
  private async copyText(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const copyField = document.createElement('textarea');
      copyField.value = value;
      copyField.style.position = 'fixed';
      copyField.style.opacity = '0';
      document.body.appendChild(copyField);
      copyField.select();
      const copied = document.execCommand('copy');
      copyField.remove();
      return copied;
    }
  }
  private resetCopyFeedback(): void {
    if (this.copyFeedbackTimeout !== undefined) window.clearTimeout(this.copyFeedbackTimeout);
    this.copyFeedbackTimeout = window.setTimeout(() => {
      this.copiedBulkUnitCode.set(null);
      this.copiedLocation.set(null);
    }, 1800);
  }

  // ---------------------------------------------------------------------
  // Formulario de registro/edición y su confirmación
  // ---------------------------------------------------------------------
  readonly draft = signal<CaptureOrderDraft>({
    unitCode: '',
    source: '',
    caseNumber: '',
    receivedOn: '',
    documents: [],
    financiera: 'Santander',
  });
  readonly errors = signal<Record<FormField, string>>({
    unitCode: '',
    source: '',
    caseNumber: '',
    receivedOn: '',
    documents: '',
    financiera: '',
  });
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly confirmationOpen = signal(false);
  readonly editingOrder = signal<CaptureOrder | null>(null);

  readonly dialogTitle = computed(() => (this.editingOrder() ? 'Editar captura' : 'Registrar captura'));
  readonly primaryAction = computed(() =>
    this.editingOrder()
      ? { label: 'Guardar cambios', icon: 'save' as const }
      : { label: 'Registrar captura', icon: 'file-text' as const },
  );
  readonly secondaryAction = { label: 'Cancelar' };
  readonly confirmationTitle = computed(() =>
    this.editingOrder() ? 'Confirmar cambios' : 'Confirmar registro',
  );
  readonly confirmationCopy = computed(() => {
    const draft = this.draft();
    const context = `Fuente: ${draft.source} · Fecha de recepción: ${this.formatConfirmationDate(draft.receivedOn)} · Documentos adjuntos: ${draft.documents.length}`;
    return this.editingOrder()
      ? `¿Confirmas guardar los cambios de la captura ${this.editingOrder()!.id} de la unidad ${draft.unitCode}? ${context}`
      : `¿Confirmas registrar la captura de la unidad ${draft.unitCode}? ${context}`;
  });
  readonly confirmationPrimaryAction = computed(() => ({
    label: this.editingOrder() ? 'Guardar cambios' : 'Confirmar registro',
    loading: this.saving(),
  }));
  readonly confirmationSecondaryAction = { label: 'Cancelar' };

  openForm(): void {
    this.dismissMessage();
    this.confirmationOpen.set(false);
    this.editingOrder.set(null);
    this.unitTypeFilter.set([]);
    this.draft.set(this.emptyDraft());
    this.errors.set(this.emptyErrors());
    this.formOpen.set(true);
  }
  openEdit(order: CaptureOrder): void {
    if (!this.canEdit(order)) return;
    this.dismissMessage();
    this.confirmationOpen.set(false);
    this.editingOrder.set(order);
    this.unitTypeFilter.set([this.unitTypeOf(order.unitCode)]);
    this.draft.set({
      unitCode: order.unitCode,
      source: order.source,
      caseNumber: order.caseNumber,
      receivedOn: order.receivedOn,
      documents: [...(order.documents ?? [])],
      financiera: order.financiera,
    });
    this.errors.set(this.emptyErrors());
    this.formOpen.set(true);
  }
  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
      this.editingOrder.set(null);
    }
  }
  setField(field: DraftField, value: string): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }
  requestSubmission(): void {
    if (!this.validate()) return;
    if (this.hasActiveCaptureOrder(this.draft().unitCode, this.editingOrder()?.id)) {
      this.errors.update((errors) => ({
        ...errors,
        unitCode: 'Esta unidad ya tiene una orden de captura registrada.',
      }));
      return;
    }
    this.formOpen.set(false);
    this.confirmationOpen.set(true);
  }
  closeConfirmation(): void {
    if (this.saving()) return;
    this.confirmationOpen.set(false);
    this.formOpen.set(true);
  }
  confirmSubmission(): void {
    void this.register();
  }
  private async register(): Promise<void> {
    this.saving.set(true);
    const editing = this.editingOrder();
    const result = editing
      ? await this.api.update(editing.id, this.draft())
      : await this.api.create(this.draft());
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.confirmationOpen.set(false);
      this.formOpen.set(true);
      if (result.kind === 'duplicate')
        this.errors.update((errors) => ({ ...errors, unitCode: result.message }));
      else this.showMessage('error', result.message);
      return;
    }
    const wasEditing = !!editing;
    this.confirmationOpen.set(false);
    this.formOpen.set(false);
    this.editingOrder.set(null);
    this.showMessage(
      'success',
      wasEditing
        ? `La orden ${result.order.id} fue actualizada y su edición quedó registrada.`
        : `La orden ${result.order.id} fue registrada con el estado “${result.order.status}”.`,
    );
    this.draft.set(this.emptyDraft());
  }
  private validate(): boolean {
    const draft = this.draft();
    const caseNumberDigits = draft.caseNumber.slice(this.caseNumberPrefix.length);
    const hasAllDocuments = REQUIRED_DOCUMENT_TYPES.every((type) =>
      draft.documents.some((document) => document.type === type),
    );
    const errors: Record<FormField, string> = {
      unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.',
      source: draft.source ? '' : 'Selecciona la fuente de la orden.',
      caseNumber: caseNumberDigits ? '' : 'Ingresa los dígitos del expediente.',
      receivedOn: !draft.receivedOn
        ? 'Selecciona la fecha de recepción.'
        : draft.receivedOn > this.today
          ? 'La fecha no puede ser futura.'
          : '',
      documents: hasAllDocuments ? '' : 'Adjunta los cuatro documentos de respaldo para continuar.',
      financiera: '',
    };
    this.errors.set(errors);
    return Object.values(errors).every((error) => !error);
  }
  private formatConfirmationDate(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }
  private emptyDraft(): CaptureOrderDraft {
    return {
      unitCode: '',
      source: '',
      caseNumber: this.caseNumberPrefix,
      receivedOn: this.today,
      documents: [],
      // El formulario individual está fuera de alcance (ver
      // docs/arquitectura-new-capture-order.md#capturas-sin-registro-individual);
      // este valor no se muestra en ninguna UI, solo satisface el tipo.
      financiera: 'Santander',
    };
  }
  private emptyErrors(): Record<FormField, string> {
    return { unitCode: '', source: '', caseNumber: '', receivedOn: '', documents: '', financiera: '' };
  }
  private localToday(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  // ---------------------------------------------------------------------
  // Detalle de una orden (drawer) y las transiciones que abre desde ahí
  // ---------------------------------------------------------------------
  readonly selectedOrder = signal<CaptureOrder | null>(null);
  readonly detailsOpen = signal(false);
  readonly detailsTitle = computed(() =>
    this.selectedOrder() ? `Detalle de ${this.selectedOrder()!.id}` : 'Detalle de captura',
  );

  openDetails(order: CaptureOrder): void {
    this.selectedOrder.set(order);
    this.detailsOpen.set(true);
  }
  closeDetails(): void {
    this.detailsOpen.set(false);
  }
  closeFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openCloseConfirmation(order), 220);
  }
  annulFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openAnnulment(order), 220);
  }
  observeFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openObservation(order), 220);
  }

  // ---------------------------------------------------------------------
  // Marcar como capturado (antes "cerrar")
  // ---------------------------------------------------------------------
  readonly closingOrder = signal<CaptureOrder | null>(null);
  readonly closeOpen = signal(false);
  readonly closePrimaryAction = computed(() => ({
    label: 'Marcar como capturado',
    loading: this.saving(),
  }));

  openCloseConfirmation(order: CaptureOrder): void {
    if (!this.canClose(order)) return;
    this.closingOrder.set(order);
    this.closeOpen.set(true);
  }
  closeCloseConfirmation(): void {
    if (this.saving()) return;
    this.closeOpen.set(false);
    this.closingOrder.set(null);
  }
  async confirmClose(): Promise<void> {
    const order = this.closingOrder();
    if (!order) return;
    this.saving.set(true);
    const result = await this.api.close(order.id);
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.closeCloseConfirmation();
      this.showMessage('error', result.message);
      return;
    }
    this.selectedOrder.set(result.order);
    this.closeCloseConfirmation();
    this.showMessage('success', `La orden ${result.order.id} fue marcada como capturada.`);
  }

  /** Una captura Observada puede volver a Pendiente directamente, sin diálogo de confirmación — es reversible y no destructivo. */
  async revertToPending(order: CaptureOrder): Promise<void> {
    if (!this.canRevertToPending(order)) return;
    this.saving.set(true);
    const result = await this.api.revertToPending(order.id);
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.showMessage('error', result.message);
      return;
    }
    if (this.selectedOrder()?.id === result.order.id) this.selectedOrder.set(result.order);
    this.showMessage('success', `La orden ${result.order.id} volvió a Pendiente.`);
  }

  // ---------------------------------------------------------------------
  // Observar captura
  // ---------------------------------------------------------------------
  readonly observedOrder = signal<CaptureOrder | null>(null);
  readonly observationOpen = signal(false);
  readonly observationReason = signal('');
  readonly observationReasonError = signal('');
  readonly observationPrimaryAction = computed(() => ({
    label: 'Registrar observación',
    disabled: !this.observationReason().trim(),
    loading: this.saving(),
  }));

  openObservation(order: CaptureOrder): void {
    if (!this.canObserve(order)) return;
    this.observedOrder.set(order);
    this.observationReason.set('');
    this.observationReasonError.set('');
    this.observationOpen.set(true);
  }
  closeObservation(): void {
    if (this.saving()) return;
    this.observationOpen.set(false);
    this.observedOrder.set(null);
    this.observationReason.set('');
    this.observationReasonError.set('');
  }
  setObservationReason(value: string): void {
    this.observationReason.set(value);
    this.observationReasonError.set('');
  }
  async confirmObservation(): Promise<void> {
    const order = this.observedOrder();
    if (!order) return;
    if (!this.observationReason().trim()) {
      this.observationReasonError.set('Describe la observación.');
      return;
    }

    this.saving.set(true);
    const result = await this.api.observe(order.id, this.observationReason());
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.observationReasonError.set(result.message);
      return;
    }

    this.closeObservation();
    this.selectedOrder.set(result.order);
    this.showMessage('success', `La orden ${result.order.id} quedó Observado.`);
  }

  // ---------------------------------------------------------------------
  // Paralizar captura (antes "anular")
  // ---------------------------------------------------------------------
  readonly annulledOrder = signal<CaptureOrder | null>(null);
  readonly annulOpen = signal(false);
  readonly annulmentReason = signal('');
  readonly annulmentReasonError = signal('');
  readonly annulPrimaryAction = computed(() => ({
    label: 'Paralizar captura',
    disabled: !this.annulmentReason().trim(),
    loading: this.saving(),
  }));

  openAnnulment(order: CaptureOrder): void {
    if (!this.canAnnul(order)) return;
    this.annulledOrder.set(order);
    this.annulmentReason.set('');
    this.annulmentReasonError.set('');
    this.annulOpen.set(true);
  }
  closeAnnulment(): void {
    if (!this.saving()) {
      this.annulOpen.set(false);
      this.annulledOrder.set(null);
      this.annulmentReason.set('');
      this.annulmentReasonError.set('');
    }
  }
  setAnnulmentReason(value: string): void {
    this.annulmentReason.set(value);
    this.annulmentReasonError.set('');
  }
  async confirmAnnulment(): Promise<void> {
    const order = this.annulledOrder();
    if (!order) return;
    if (!this.annulmentReason().trim()) {
      this.annulmentReasonError.set('Describe el motivo de paralización.');
      return;
    }
    this.saving.set(true);
    const result = await this.api.annul(order.id, this.annulmentReason());
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.annulmentReasonError.set(result.message);
      return;
    }
    this.closeAnnulment();
    this.selectedOrder.set(result.order);
    this.showMessage(
      'success',
      `La orden ${result.order.id} fue paralizada y se conserva en el historial.`,
    );
  }

  // ---------------------------------------------------------------------
  // Carga masiva de capturas
  // ---------------------------------------------------------------------
  readonly bulkUploadOpen = signal(false);
  readonly bulkUploadStage = signal<BulkUploadStage>('select');
  readonly bulkFileName = signal('');
  readonly bulkUploadError = signal('');
  readonly bulkLoadedCount = signal(0);
  readonly bulkValidationRows = signal<readonly BulkValidationRow[]>([]);
  readonly bulkReviewPage = signal(1);
  /** 0–100 mientras se valida — por chunk, no de una sola vez (ver `validateBulkFile`), para que el avance sea real y no un ícono girando sin información. */
  readonly bulkValidationProgress = signal(0);
  /** El proveedor ya no lo elige nadie a mano: se detecta por la firma de columnas del archivo (ver `capture-order-formats.ts`). */
  readonly bulkDetectedFinanciera = signal<CaptureFinanciera | null>(null);

  readonly bulkValidRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'valid'),
  );
  readonly bulkRejectedRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'rejected'),
  );
  /**
   * Órdenes existentes cuyo estado contradice lo que implica el archivo que
   * se está validando — calculadas al momento de validar, no después de
   * confirmar (ver `mock-capture-orders.service.ts#previewBulkConflicts`).
   */
  readonly bulkConflictRows = signal<BulkConflictPreviewRow[]>([]);
  /** Decisión elegida por orden (id → 'keep-system' | 'accept-upload') mientras se revisa el archivo, antes de confirmar. */
  readonly bulkConflictChoices = signal<Record<string, ResolveConflictChoice>>({});
  readonly bulkAllConflictsResolved = computed(() =>
    this.bulkConflictRows().every((row) => !!this.bulkConflictChoices()[row.order.id]),
  );
  /**
   * Una sola tabla para todo lo que no se carga automáticamente: las filas
   * en conflicto (requieren elegir Sistema/Archivo) primero, después las
   * rechazadas por un error real del archivo (duplicado dentro del mismo
   * archivo). Misma tabla, no dos secciones separadas.
   */
  readonly bulkReviewRows = computed<BulkReviewRow[]>(() => [
    // "Fila" es la fila real del archivo (Excel) donde aparece la unidad,
    // no un índice de esta tabla — puede no ser consecutiva (50, 51, 64...).
    // En un conflicto tipo "absent" no hay fila: la unidad justamente no
    // está en el archivo, así que queda sin número.
    ...this.bulkConflictRows().map(
      (row): BulkReviewRow => ({
        kind: 'conflict',
        rowNumber: row.rowNumber,
        unitCode: row.order.unitCode,
        note: row.note,
        orderId: row.order.id,
        currentStatus: row.order.status,
        acceptedStatus: row.order.status === 'Observado' ? 'Capturado' : 'Pendiente',
      }),
    ),
    ...this.bulkRejectedRows().map(
      (row): BulkReviewRow => ({
        kind: 'rejected',
        rowNumber: row.row,
        unitCode: row.unitCode,
        reason: row.reason ?? 'Requiere corrección.',
      }),
    ),
  ]);
  readonly bulkReviewPages = computed(() =>
    Math.max(1, Math.ceil(this.bulkReviewRows().length / BULK_ERROR_PAGE_SIZE)),
  );
  readonly bulkReviewSummary = computed(() => {
    const total = this.bulkReviewRows().length;
    const start = (this.bulkReviewPage() - 1) * BULK_ERROR_PAGE_SIZE + 1;
    return `${start}–${Math.min(start + BULK_ERROR_PAGE_SIZE - 1, total)} de ${total} filas`;
  });
  readonly bulkPrimaryAction = computed(() => {
    const stage = this.bulkUploadStage();
    if (stage === 'review') {
      if (!this.bulkAllConflictsResolved()) {
        return { label: 'Resuelve las decisiones pendientes', disabled: true };
      }
      return { label: `Cargar ${this.bulkValidRows().length} datos` };
    }
    if (stage === 'uploading') return { label: 'Cargando datos', loading: true, disabled: true };
    if (stage === 'success') return { label: 'Cerrar' };
    return { label: 'Selecciona un archivo', disabled: true };
  });
  readonly bulkSecondaryAction = computed(() =>
    this.bulkUploadStage() === 'success' || this.bulkUploadStage() === 'uploading'
      ? undefined
      : { label: 'Cancelar' },
  );

  /** Página actual de la tabla combinada (conflictos + rechazadas), sin depender de un `TemplateRef` particular. */
  bulkReviewRowsForPage(): BulkReviewRow[] {
    const start = (this.bulkReviewPage() - 1) * BULK_ERROR_PAGE_SIZE;
    return this.bulkReviewRows().slice(start, start + BULK_ERROR_PAGE_SIZE);
  }

  openBulkUpload(): void {
    this.dismissMessage();
    this.bulkUploadStage.set('select');
    this.bulkFileName.set('');
    this.bulkUploadError.set('');
    this.bulkLoadedCount.set(0);
    this.bulkValidationRows.set([]);
    this.bulkReviewPage.set(1);
    this.bulkConflictRows.set([]);
    this.bulkConflictChoices.set({});
    this.bulkValidationProgress.set(0);
    this.bulkDetectedFinanciera.set(null);
    this.bulkUploadOpen.set(true);
  }
  setBulkConflictChoice(orderId: string, choice: ResolveConflictChoice): void {
    this.bulkConflictChoices.update((choices) => ({ ...choices, [orderId]: choice }));
  }
  closeBulkUpload(): void {
    if (this.bulkUploadStage() !== 'uploading') this.bulkUploadOpen.set(false);
  }
  allowBulkDrop(event: DragEvent): void {
    event.preventDefault();
  }
  dropBulkFile(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0);
    if (file) void this.validateBulkFile(file);
  }
  selectBulkFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (file) void this.validateBulkFile(file);
  }
  runBulkPrimaryAction(): void {
    if (this.bulkUploadStage() === 'review') void this.uploadBulkRows();
    if (this.bulkUploadStage() === 'success') this.closeBulkUpload();
  }
  setBulkReviewPage(page: number): void {
    this.bulkReviewPage.set(Math.min(Math.max(1, page), this.bulkReviewPages()));
  }
  private async validateBulkFile(file: File): Promise<void> {
    const extension = file.name.split('.').pop()?.toLocaleLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension ?? '')) {
      this.bulkUploadError.set('Selecciona un archivo XLSX, XLS o CSV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.bulkUploadError.set('El archivo puede tener un tamaño máximo de 10 MB.');
      return;
    }
    this.bulkUploadError.set('');
    this.bulkFileName.set(file.name);
    this.bulkValidationProgress.set(0);
    this.bulkUploadStage.set('validating');

    let workbook;
    try {
      workbook = await readCaptureWorkbook(file);
    } catch {
      this.bulkUploadError.set('No pudimos leer el archivo. Verifica que no esté dañado.');
      this.bulkUploadStage.set('select');
      return;
    }
    if (this.bulkUploadStage() !== 'validating') return; // se canceló mientras leía

    const signature = detectCaptureFormat(workbook.headers);
    if (!signature) {
      this.bulkUploadError.set(
        'No reconocemos este formato de archivo — no coincide con Santander ni Mapfre.',
      );
      this.bulkUploadStage.set('select');
      return;
    }
    this.bulkDetectedFinanciera.set(signature.financiera);

    const parsedRows = parseCaptureRows(signature, workbook.headers, workbook.rows);
    const rows = await this.validateParsedRowsInChunks(parsedRows, signature.financiera);
    if (this.bulkUploadStage() !== 'validating') return; // se canceló mientras procesaba

    this.bulkValidationRows.set(rows);
    this.bulkReviewPage.set(1);
    // La reconciliación se calcula acá, al validar — no después de
    // confirmar — para que la decisión (Sistema/Archivo) se tome en esta
    // misma pantalla de revisión.
    const uploadedUnits: BulkReconciliationUnit[] = rows.map((row) => ({
      unitCode: row.unitCode,
      financiera: row.financiera,
      row: row.row,
    }));
    this.bulkConflictRows.set(this.api.previewBulkConflicts(uploadedUnits));
    this.bulkConflictChoices.set({});
    this.bulkUploadStage.set('review');
  }
  /**
   * Procesa las filas en chunks (no todas de una vez) para que la barra de
   * progreso avance de verdad con archivos grandes (~1000+ filas) — por
   * chunk: limpia placa/motor (ya vienen limpios de `parseCaptureRows`),
   * rechaza placa vacía o repetida dentro del archivo, y para las válidas
   * calcula el contrato (mock SAP) y la última posición (nuestra flota).
   * Ninguna columna del archivo decide esto — ni siquiera cuando Mapfre
   * insinúa el dueño real vía "Proveedor Gps": se valida igual para el
   * 100% de las filas de cualquier proveedor.
   */
  private async validateParsedRowsInChunks(
    parsedRows: readonly ParsedCaptureRow[],
    financiera: CaptureFinanciera,
  ): Promise<BulkValidationRow[]> {
    const CHUNK_SIZE = 80;
    const seenUnitCodes = new Set<string>();
    const rows: BulkValidationRow[] = [];

    for (let start = 0; start < parsedRows.length; start += CHUNK_SIZE) {
      if (this.bulkUploadStage() !== 'validating') return rows; // se canceló mientras procesaba
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
      this.bulkValidationProgress.set(
        Math.round((Math.min(start + CHUNK_SIZE, parsedRows.length) / parsedRows.length) * 100),
      );
      // Cede el hilo entre chunks — con ~1600 filas, sin esto la UI se congela
      // hasta terminar en vez de mostrar el avance real.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    return rows;
  }
  private async uploadBulkRows(): Promise<void> {
    this.bulkUploadStage.set('uploading');
    // La lista completa (válidas + rechazadas por duplicado) es lo que se
    // reconcilia contra el sistema: una rechazada por duplicado sigue "en
    // la lista" de su financiera, solo no genera una orden nueva.
    const uploadedUnits: BulkReconciliationUnit[] = this.bulkValidationRows().map((row) => ({
      unitCode: row.unitCode,
      financiera: row.financiera,
      row: row.row,
    }));
    const resolutions = new Map(Object.entries(this.bulkConflictChoices()));
    // Prioridad de creación: primero las que sí tienen contrato con
    // nosotros (pedido explícito), después el resto en el orden en que
    // llegaron — es solo orden de creación, no un filtro: todas se
    // registran igual.
    const prioritized = [...this.bulkValidRows()].sort((first, second) => {
      const firstPriority = first.contractStatus === 'Activo' ? 0 : 1;
      const secondPriority = second.contractStatus === 'Activo' ? 0 : 1;
      return firstPriority - secondPriority;
    });
    const result = await this.api.createBulk(
      prioritized.map((row) => ({
        unitCode: row.unitCode,
        source: row.source || `Carga masiva ${row.financiera}`,
        financiera: row.financiera,
        caseNumber: row.caseNumber || '',
        receivedOn: row.receivedOn || this.today,
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
      this.bulkFileName(),
      resolutions,
    );
    this.bulkLoadedCount.set(result.created.length);
    this.bulkUploadStage.set('success');
    this.page.set(1);
    const extras = [
      result.autoClosedCount
        ? `${result.autoClosedCount} se cerraron automáticamente por no estar en la lista`
        : '',
      result.resolvedCount ? `${result.resolvedCount} se actualizaron según tu decisión` : '',
    ].filter(Boolean);
    this.showMessage(
      'success',
      `${result.created.length} capturas fueron registradas mediante carga masiva${extras.length ? `, ${extras.join(' y ')}` : ''}.`,
    );
  }
}

/**
 * Tipos de documento requeridos para validar el formulario. Coincide con
 * `CAPTURE_DOCUMENT_TYPES` del core service; se declara aquí como lista
 * corta porque `validate()` solo necesita los valores, no las etiquetas
 * (esas viven en `capture-order-form-dialog.component.ts`, junto a
 * `documentDefinitions`, que es lo único que las usa).
 */
const REQUIRED_DOCUMENT_TYPES: readonly CaptureDocumentType[] = [
  'resolution',
  'oficio',
  'transit-notification',
  'requisition',
];
