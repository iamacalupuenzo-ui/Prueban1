import { Injectable, computed, inject, signal } from '@angular/core';
import type { IconName, SortOrder, TagSeverity } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CaptureDocumentType,
  CaptureOrder,
  CaptureOrderAuditEntry,
  CaptureOrderDraft,
  MockCaptureOrdersService,
} from '../../core/orders/mock-capture-orders.service';
import { UnitOption } from './unit-autocomplete.component';
import { UnitTypeFilterOption } from './unit-type-multi-select.component';

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

export type DraftField = Exclude<keyof CaptureOrderDraft, 'documents'>;
export type FormField = DraftField | 'documents';
export type RowsPerPage = 10 | 25 | 50 | 100;
export type UnitType = 'VHC' | 'TRK' | 'VAN' | 'BUS';
export type BulkUploadStage = 'select' | 'validating' | 'review' | 'uploading' | 'success';

export type BulkValidationRow = {
  row: number;
  unitCode: string;
  source: string;
  outcome: 'valid' | 'rejected';
  reason?: string;
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

const BULK_VALIDATION_ROWS: readonly BulkValidationRow[] = [
  { row: 2, unitCode: 'VHC-1024', source: 'Centro de operaciones', outcome: 'valid' },
  { row: 3, unitCode: 'VHC-1041', source: 'Cliente', outcome: 'valid' },
  { row: 4, unitCode: 'TRK-2087', source: 'Autoridad competente', outcome: 'valid' },
  { row: 5, unitCode: 'TRK-2143', source: 'Operación en campo', outcome: 'valid' },
  { row: 6, unitCode: 'VAN-0412', source: 'Centro de operaciones', outcome: 'valid' },
  { row: 7, unitCode: 'BUS-0379', source: 'Cliente', outcome: 'valid' },
  { row: 8, unitCode: 'VHC-1158', source: 'Centro de operaciones', outcome: 'valid' },
  { row: 9, unitCode: 'TRK-2206', source: 'Cliente', outcome: 'valid' },
  { row: 10, unitCode: 'VAN-0534', source: 'Autoridad competente', outcome: 'valid' },
  { row: 11, unitCode: 'BUS-0416', source: 'Operación en campo', outcome: 'valid' },
  {
    row: 12,
    unitCode: 'VHC-3001',
    source: 'Centro de operaciones',
    outcome: 'rejected',
    reason: 'Ya tiene la orden CAP-0101 en estado Registrada.',
  },
  {
    row: 13,
    unitCode: 'TRK-3002',
    source: 'Cliente',
    outcome: 'rejected',
    reason: 'Ya tiene la orden CAP-0102 en estado En revisión.',
  },
  {
    row: 14,
    unitCode: 'VAN-3003',
    source: 'Autoridad competente',
    outcome: 'rejected',
    reason: 'Ya tiene la orden CAP-0103 con observación.',
  },
  {
    row: 15,
    unitCode: 'VHC-1024',
    source: 'Centro de operaciones',
    outcome: 'rejected',
    reason: 'La unidad está repetida dentro del archivo.',
  },
  {
    row: 16,
    unitCode: 'VHC-3005',
    source: 'Centro de operaciones',
    outcome: 'rejected',
    reason: 'Ya tiene una captura activa en estado Registrada.',
  },
  {
    row: 17,
    unitCode: 'TRK-3006',
    source: 'Cliente',
    outcome: 'rejected',
    reason: 'Ya tiene una captura activa en estado En revisión.',
  },
  {
    row: 18,
    unitCode: 'VAN-3007',
    source: 'Autoridad competente',
    outcome: 'rejected',
    reason: 'Ya tiene una captura activa con observación.',
  },
  {
    row: 19,
    unitCode: 'TRK-2087',
    source: 'Operación en campo',
    outcome: 'rejected',
    reason: 'La unidad está repetida dentro del archivo.',
  },
];

@Injectable({ providedIn: 'root' })
export class CaptureOrdersService {
  private readonly api = inject(MockCaptureOrdersService);

  /** Passthrough de la carga de fixtures: la tabla y el estado vacío la consumen directo. */
  readonly fixturesLoading = this.api.fixturesLoading;
  readonly fixturesError = this.api.fixturesError;

  readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
  readonly today = this.localToday();
  readonly caseNumberPrefix = `EXP-${this.today.slice(0, 4)}-`;

  // ---------------------------------------------------------------------
  // Filtros, orden y paginación de la matriz
  // ---------------------------------------------------------------------
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
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
    return (
      (
        {
          id: order.id,
          unit: order.unitCode,
          owner: this.ownerOf(order.unitCode),
          lastLocation: this.locationOf(order.unitCode)?.lastLocation ?? '',
          source: order.source,
          status: order.status,
        } as Record<string, string>
      )[key] ?? ''
    );
  }
  private registrationTimestamp(value: string): number {
    const months: Record<string, number> = {
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
    };
    const match = value.match(
      /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.\s+(\d{4}),\s+(\d{2}):(\d{2})$/i,
    );
    if (!match) return 0;
    return new Date(
      Number(match[3]),
      months[match[2].toLowerCase()],
      Number(match[1]),
      Number(match[4]),
      Number(match[5]),
    ).getTime();
  }
  private registrationDate(value: string): string {
    const match = value.match(
      /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.\s+(\d{4}),/i,
    );
    if (!match) return '';
    const months: Record<string, number> = {
      ene: 1,
      feb: 2,
      mar: 3,
      abr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      ago: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dic: 12,
    };
    return `${match[3]}-${String(months[match[2].toLowerCase()]).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
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
  locationOf(unitCode: string): UnitOption | null {
    const knownUnit = UNIT_OPTIONS.find((unit) => unit.code === unitCode);
    if (knownUnit) return knownUnit;

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
          Registrada: 'info',
          'En revisión': 'warn',
          'Con observación': 'danger',
          Cerrada: 'secondary',
          Anulada: 'danger',
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
        entry.action === 'Anulación',
    );

    return lifecycleEntries.length
      ? lifecycleEntries
      : [{ action: 'Creación', at: order.createdAt, detail: 'Orden registrada.' }];
  }
  canEdit(order: CaptureOrder): boolean {
    return order.status === 'Registrada' || order.status === 'Con observación';
  }
  canClose(order: CaptureOrder): boolean {
    return order.status === 'Registrada';
  }
  canObserve(order: CaptureOrder): boolean {
    return order.status === 'Registrada' || order.status === 'En revisión';
  }
  canAnnul(order: CaptureOrder): boolean {
    return order.status !== 'Cerrada' && order.status !== 'Anulada';
  }

  // ---------------------------------------------------------------------
  // Mensaje de retroalimentación (toast) — lo consumen registro, cierre,
  // observación, anulación, carga masiva y la exportación de la tabla.
  // ---------------------------------------------------------------------
  readonly message = signal('');
  readonly messageKind = signal<'success' | 'error' | 'info'>('success');
  private feedbackTimeout?: number;

  showMessage(kind: 'success' | 'error' | 'info', message: string): void {
    this.dismissMessage();
    this.messageKind.set(kind);
    this.message.set(message);
    if (kind !== 'error')
      this.feedbackTimeout = window.setTimeout(() => this.dismissMessage(), 4000);
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
  }
  async copyLastLocation(location: string): Promise<void> {
    if (!(await this.copyText(location))) return;
    this.copiedBulkUnitCode.set(null);
    this.copiedLocation.set(location);
    this.resetCopyFeedback();
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
  });
  readonly errors = signal<Record<FormField, string>>({
    unitCode: '',
    source: '',
    caseNumber: '',
    receivedOn: '',
    documents: '',
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
    };
  }
  private emptyErrors(): Record<FormField, string> {
    return { unitCode: '', source: '', caseNumber: '', receivedOn: '', documents: '' };
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
  // Cerrar captura
  // ---------------------------------------------------------------------
  readonly closingOrder = signal<CaptureOrder | null>(null);
  readonly closeOpen = signal(false);
  readonly closePrimaryAction = computed(() => ({
    label: 'Cerrar captura',
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
    this.showMessage('success', `La orden ${result.order.id} fue cerrada.`);
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
    this.showMessage('success', `La orden ${result.order.id} quedó con observación.`);
  }

  // ---------------------------------------------------------------------
  // Anular captura
  // ---------------------------------------------------------------------
  readonly annulledOrder = signal<CaptureOrder | null>(null);
  readonly annulOpen = signal(false);
  readonly annulmentReason = signal('');
  readonly annulmentReasonError = signal('');
  readonly annulPrimaryAction = computed(() => ({
    label: 'Anular captura',
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
      this.annulmentReasonError.set('Describe el motivo de anulación.');
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
      `La orden ${result.order.id} fue anulada y se conserva en el historial.`,
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
  readonly bulkErrorPage = signal(1);

  readonly bulkValidRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'valid'),
  );
  readonly bulkRejectedRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'rejected'),
  );
  readonly bulkErrorPages = computed(() =>
    Math.max(1, Math.ceil(this.bulkRejectedRows().length / BULK_ERROR_PAGE_SIZE)),
  );
  readonly bulkErrorSummary = computed(() => {
    const total = this.bulkRejectedRows().length;
    const start = (this.bulkErrorPage() - 1) * BULK_ERROR_PAGE_SIZE + 1;
    return `${start}–${Math.min(start + BULK_ERROR_PAGE_SIZE - 1, total)} de ${total} filas`;
  });
  readonly bulkPrimaryAction = computed(() => {
    const stage = this.bulkUploadStage();
    if (stage === 'review') return { label: `Cargar ${this.bulkValidRows().length} datos` };
    if (stage === 'uploading') return { label: 'Cargando datos', loading: true, disabled: true };
    if (stage === 'success') return { label: 'Cerrar' };
    return { label: 'Selecciona un archivo', disabled: true };
  });
  readonly bulkSecondaryAction = computed(() =>
    this.bulkUploadStage() === 'success' || this.bulkUploadStage() === 'uploading'
      ? undefined
      : { label: 'Cancelar' },
  );

  /** Página actual de filas rechazadas, sin depender de un `TemplateRef` particular. */
  bulkErrorRowsForPage(): BulkValidationRow[] {
    const start = (this.bulkErrorPage() - 1) * BULK_ERROR_PAGE_SIZE;
    return this.bulkRejectedRows().slice(start, start + BULK_ERROR_PAGE_SIZE);
  }

  openBulkUpload(): void {
    this.dismissMessage();
    this.bulkUploadStage.set('select');
    this.bulkFileName.set('');
    this.bulkUploadError.set('');
    this.bulkLoadedCount.set(0);
    this.bulkValidationRows.set([]);
    this.bulkErrorPage.set(1);
    this.bulkUploadOpen.set(true);
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
    if (file) this.validateBulkFile(file);
  }
  selectBulkFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (file) this.validateBulkFile(file);
  }
  downloadBulkTemplate(): void {
    const template = `﻿${[
      'Código de unidad,Fuente de la orden,Número de expediente,Fecha de recepción',
      'VHC-1024,Centro de operaciones,EXP-2026-6101,2026-09-20',
    ].join('\n')}`;
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-carga-masiva-capturas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  runBulkPrimaryAction(): void {
    if (this.bulkUploadStage() === 'review') void this.uploadBulkRows();
    if (this.bulkUploadStage() === 'success') this.closeBulkUpload();
  }
  setBulkErrorPage(page: number): void {
    this.bulkErrorPage.set(Math.min(Math.max(1, page), this.bulkErrorPages()));
  }
  private validateBulkFile(file: File): void {
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
    this.bulkUploadStage.set('validating');
    window.setTimeout(() => {
      if (this.bulkUploadStage() !== 'validating') return;
      this.bulkValidationRows.set(BULK_VALIDATION_ROWS);
      this.bulkErrorPage.set(1);
      this.bulkUploadStage.set('review');
    }, 650);
  }
  private async uploadBulkRows(): Promise<void> {
    this.bulkUploadStage.set('uploading');
    const result = await this.api.createBulk(
      this.bulkValidRows().map((row, index) => ({
        unitCode: row.unitCode,
        source: row.source,
        caseNumber: `EXP-${this.today.slice(0, 4)}-${6101 + index}`,
        receivedOn: this.today,
        documents: [],
      })),
    );
    this.bulkLoadedCount.set(result.created.length);
    this.bulkUploadStage.set('success');
    this.page.set(1);
    this.showMessage(
      'success',
      `${result.created.length} capturas fueron registradas mediante carga masiva.`,
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
