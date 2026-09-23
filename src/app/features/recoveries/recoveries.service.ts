import { Injectable, computed, inject, signal } from '@angular/core';
import type { IconName, SortOrder, TagSeverity } from '@iamacalupuenzo-ui/comsatel-ds';
import {
  MockRecoveryOrdersService,
  RecoveryOrder,
  RecoveryOrderAuditEntry,
  RecoveryOrderDraft,
  RecoveryOrderEvidence,
  RecoverySourceSelection,
  RecoverySourceType,
} from '../../core/recoveries/mock-recovery-orders.service';
import { UnitOption } from '../../shared/unit-autocomplete.component';
import { UnitTypeFilterOption } from '../../shared/unit-type-multi-select.component';

/**
 * Estado y orquestación de la pantalla de Recuperos.
 *
 * Sigue el mismo patrón de `CaptureOrdersService`: un service de estado
 * compartido por pantalla, inyectado directo por los componentes hijos
 * (toolbar, tabla, drawer de detalle y diálogos) con `inject()`. Ver
 * `docs/plan-construccion-recuperos.md` para el alcance de esta primera
 * pasada — no incluye carga masiva ni las transiciones de cierre/anulación,
 * porque la matriz oficial de estados sigue pendiente de Producto.
 */

export type DraftField = Exclude<keyof RecoveryOrderDraft, 'evidence'>;
export type FormField = DraftField | 'evidence';
export type RowsPerPage = 10 | 25 | 50 | 100;

const DEFAULT_SORT = { key: 'created', order: 'desc' as const };

export const SOURCE_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: RecoverySourceType }> = [
  { label: 'Cliente', value: 'cliente' },
  { label: 'Aseguradora', value: 'aseguradora' },
];

/** Seguro ya asociado a la unidad — independiente de la fuente que solicita el recupero. */
export const INSURER_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Rímac Seguros', value: 'Rímac Seguros' },
  { label: 'Pacífico Seguros', value: 'Pacífico Seguros' },
  { label: 'Mapfre Perú', value: 'Mapfre Perú' },
];

/** Catálogo de ejemplo mientras Producto confirma los planes reales contratados con la empresa. */
export const SERVICE_TYPE_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Comsatel Normal', value: 'Comsatel Normal' },
  { label: 'Comsatel Plus', value: 'Comsatel Plus' },
  { label: 'Comsatel Enterprise', value: 'Comsatel Enterprise' },
  { label: 'Otro', value: 'Otro' },
];

export const THEFT_MODALITY_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Robo con violencia', value: 'Robo con violencia' },
  { label: 'Robo sin violencia', value: 'Robo sin violencia' },
  { label: 'Hurto', value: 'Hurto' },
];

export type RecoveryUnitType = 'VHC' | 'TRK' | 'VAN' | 'BUS' | 'MOT';
export const RECOVERY_UNIT_TYPE_OPTIONS: ReadonlyArray<
  UnitTypeFilterOption & { value: RecoveryUnitType }
> = [
  { label: 'Van de distribución', value: 'VHC' },
  { label: 'Camión rígido', value: 'TRK' },
  { label: 'Furgón operativo', value: 'VAN' },
  { label: 'Bus de personal', value: 'BUS' },
  { label: 'Moto', value: 'MOT' },
];

interface RecoveryUnitFixture extends UnitOption {
  hasGps: boolean;
  /** Seguro ya asociado a la unidad — se sugiere al elegirla, editable después. */
  insurer: string;
  /** Servicio contratado por el cliente para esta unidad — se sugiere al elegirla, editable después. */
  serviceType: string;
}

const UNIT_OPTIONS: RecoveryUnitFixture[] = [
  {
    code: 'VHC-3001',
    owner: 'Rosa Quispe',
    lastLocation: 'Carretera Central km 8.5, Ate · 20 sep. 2026, 10:14',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0433%2C-76.9427',
    icon: 'car',
    hasGps: true,
    insurer: 'Rímac Seguros',
    serviceType: 'Comsatel Plus',
  },
  {
    code: 'TRK-3002',
    owner: 'Jorge Cárdenas',
    lastLocation: 'Av. Nicolás Ayllón 2740, El Agustino · 20 sep. 2026, 09:58',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.0487%2C-76.9982',
    icon: 'truck',
    hasGps: true,
    insurer: 'Pacífico Seguros',
    serviceType: 'Comsatel Enterprise',
  },
  {
    code: 'VAN-3003',
    owner: 'Elena Flores',
    lastLocation: 'Av. República de Panamá 3560, Surquillo · 20 sep. 2026, 10:26',
    lastLocationMapUrl: 'https://www.google.com/maps/search/?api=1&query=-12.1235%2C-77.0178',
    icon: 'truck',
    hasGps: true,
    insurer: 'Pacífico Seguros',
    serviceType: 'Comsatel Normal',
  },
  {
    code: 'BUS-3004',
    owner: 'Miguel Huamán',
    lastLocation: '',
    lastLocationMapUrl: '',
    icon: 'bus',
    hasGps: false,
    insurer: 'Mapfre Perú',
    serviceType: 'Comsatel Normal',
  },
  {
    code: 'MOT-3005',
    owner: 'Patricia Vega',
    lastLocation: '',
    lastLocationMapUrl: '',
    icon: 'car',
    hasGps: false,
    insurer: 'Mapfre Perú',
    serviceType: 'Comsatel Plus',
  },
  {
    code: 'VHC-3009',
    owner: 'Luis Ramos Effio',
    lastLocation: '',
    lastLocationMapUrl: '',
    icon: 'car',
    hasGps: false,
    insurer: 'Rímac Seguros',
    serviceType: 'Comsatel Enterprise',
  },
];

@Injectable({ providedIn: 'root' })
export class RecoveriesService {
  private readonly api = inject(MockRecoveryOrdersService);

  /** Passthrough de la carga de fixtures: la tabla y el estado vacío la consumen directo. */
  readonly fixturesLoading = this.api.fixturesLoading;
  readonly fixturesError = this.api.fixturesError;

  readonly sourceTypeOptions = SOURCE_TYPE_OPTIONS;
  readonly insurerOptions = INSURER_OPTIONS;
  readonly serviceTypeOptions = SERVICE_TYPE_OPTIONS;
  readonly theftModalityOptions = THEFT_MODALITY_OPTIONS;
  readonly unitTypeOptions = RECOVERY_UNIT_TYPE_OPTIONS;
  readonly today = this.localToday();

  // ---------------------------------------------------------------------
  // Filtros, orden y paginación de la matriz
  // ---------------------------------------------------------------------
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly insurerFilter = signal('');
  readonly theftModalityFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly rowsPerPage = signal<RowsPerPage>(10);
  readonly page = signal(1);
  readonly sortKey = signal(DEFAULT_SORT.key);
  readonly sortOrder = signal<SortOrder>(DEFAULT_SORT.order);

  readonly allOrders = computed(() => [...this.api.orders(), ...this.api.fixtureOrders()]);

  readonly unitTypeFilter = signal<RecoveryUnitType[]>([]);
  readonly filteredUnitOptions = computed(() => {
    const selectedTypes = this.unitTypeFilter();
    return selectedTypes.length
      ? UNIT_OPTIONS.filter((unit) => selectedTypes.includes(this.unitTypeOf(unit.code)))
      : UNIT_OPTIONS;
  });
  readonly selectedUnit = computed(() => this.unitOf(this.draft().unitCode));
  readonly selectedUnitHasGps = computed(() => this.selectedUnit()?.hasGps ?? null);

  readonly filteredOrders = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    const insurer = this.insurerFilter();
    const theftModality = this.theftModalityFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const hasDateRange = !!from && !!to;
    return this.allOrders().filter((order) => {
      const registrationDate = this.registrationDate(order.createdAt);
      return (
        (!search ||
          `${order.id} ${order.unitCode} ${order.sourceName}`
            .toLocaleLowerCase()
            .includes(search)) &&
        (!status || order.status === status) &&
        (!insurer || order.insurerName === insurer) &&
        (!theftModality || order.theftModality === theftModality) &&
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
    if (this.fixturesLoading()) return 'Cargando recuperos';
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
  hasActiveRecoveryOrder(unitCode: string, excludingOrderId?: string): boolean {
    return this.api.hasActiveRecoveryOrder(unitCode, excludingOrderId);
  }
  onUnitSelected(unitCode: string): void {
    this.setField('unitCode', unitCode);
    const unit = this.unitOf(unitCode);
    if (!unit) return;
    // El seguro y el tipo de servicio ya asociados a la unidad se sugieren
    // automáticamente al elegirla — siguen siendo campos editables, no se
    // bloquean. La fuente (quién solicita) es una decisión aparte del
    // operador y no se toca aquí.
    this.draft.update((draft) => {
      const next = { ...draft, insurerName: unit.insurer, serviceType: unit.serviceType };
      return { ...next, sourceName: this.deriveSourceName(next) };
    });
    this.errors.update((errors) => ({ ...errors, insurerName: '', serviceType: '' }));
  }
  setUnitTypeFilter(value: readonly string[]): void {
    const nextTypes = value.filter((type): type is RecoveryUnitType =>
      RECOVERY_UNIT_TYPE_OPTIONS.some((option) => option.value === type),
    );
    this.unitTypeFilter.set(nextTypes);
    const selectedUnitCode = this.draft().unitCode;
    if (selectedUnitCode && nextTypes.length && !nextTypes.includes(this.unitTypeOf(selectedUnitCode)))
      this.setField('unitCode', '');
  }
  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }
  setStatusFilter(value: string): void {
    this.statusFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
  }
  setInsurerFilter(value: string): void {
    this.insurerFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
  }
  setTheftModalityFilter(value: string): void {
    this.theftModalityFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
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
  private sortValue(order: RecoveryOrder, key: string): string | number {
    if (key === 'created') return this.registrationTimestamp(order.createdAt);
    // Mismo formato que `createdAt` ("10 sep. 2026, 10:14"): se compara por
    // timestamp real, no como texto, para que el orden sea cronológico.
    if (key === 'recoveredAt')
      return order.recoveredAt ? this.registrationTimestamp(order.recoveredAt) : 0;
    if (key === 'lastLocation') return this.locationOf(order.unitCode)?.lastLocation ?? '';
    return (
      (
        {
          id: order.id,
          unit: order.unitCode,
          insurer: order.insurerName,
          theftModality: order.theftModality,
          status: order.status,
        } as Record<string, string>
      )[key] ?? ''
    );
  }
  // `Intl.DateTimeFormat('es-PE', {dateStyle:'medium', timeStyle:'short'})`
  // (usada por `timestamp()` del mock) abrevia septiembre como "set." (no
  // "sep.") y da la hora en formato 12h con "a. m."/"p. m." — verificado en
  // navegador, distinto de lo asumido originalmente en el mismo patrón de
  // `CaptureOrdersService`. Se aceptan ambas abreviaturas y ambos formatos
  // de hora para que una orden recién creada (con el string en vivo) se
  // ordene y filtre igual que los fixtures (escritos a mano en 24h).
  private registrationTimestamp(value: string): number {
    const months: Record<string, number> = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11,
    };
    const match = value.match(
      /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\.\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/i,
    );
    if (!match) return 0;
    let hours = Number(match[4]);
    const meridiem = match[6]?.toLowerCase().replace(/[.\s]/g, '');
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return new Date(
      Number(match[3]),
      months[match[2].toLowerCase()],
      Number(match[1]),
      hours,
      Number(match[5]),
    ).getTime();
  }
  private registrationDate(value: string): string {
    const match = value.match(
      /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\.\s+(\d{4}),/i,
    );
    if (!match) return '';
    const months: Record<string, number> = {
      ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
      jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
    };
    return `${match[3]}-${String(months[match[2].toLowerCase()]).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------
  // Helpers de datos de unidad/orden compartidos entre tabla, drawer y formulario
  // ---------------------------------------------------------------------
  private unitOf(unitCode: string): RecoveryUnitFixture | null {
    return UNIT_OPTIONS.find((unit) => unit.code === unitCode) ?? null;
  }
  private unitTypeOf(unitCode: string): RecoveryUnitType {
    const prefix = unitCode.split('-', 1)[0];
    return (
      RECOVERY_UNIT_TYPE_OPTIONS.some((type) => type.value === prefix) ? prefix : 'VHC'
    ) as RecoveryUnitType;
  }
  unitIconOf(unitCode: string): IconName {
    return this.unitOf(unitCode)?.icon ?? 'car';
  }
  hasGpsOf(unitCode: string): boolean {
    return this.unitOf(unitCode)?.hasGps ?? false;
  }
  locationOf(unitCode: string): UnitOption | null {
    const unit = this.unitOf(unitCode);
    return unit?.hasGps ? unit : null;
  }
  referenceLabel(sourceType: RecoverySourceSelection): string {
    return sourceType === 'cliente' ? 'N.º de expediente' : 'N.º de póliza';
  }
  sourceLabelOf(sourceType: RecoverySourceSelection): string {
    return SOURCE_TYPE_OPTIONS.find((option) => option.value === sourceType)?.label ?? sourceType;
  }
  /**
   * Un recupero registrado no tiene fecha de recuperación hasta que cambie
   * de estado. `recoveredAt` ya se guarda con el mismo formato que
   * `createdAt` ("10 sep. 2026, 10:14"), así que no requiere reformateo.
   */
  recoveredLabel(order: RecoveryOrder): string {
    return order.recoveredAt || 'Pendiente de recuperar';
  }
  /** Prioridad visual de la modalidad: violencia es la más urgente de triar, hurto la menos. */
  theftModalityIcon(modality: string): IconName {
    return (
      (
        {
          'Robo con violencia': 'alert-triangle',
          'Robo sin violencia': 'circle-alert',
          Hurto: 'eye-off',
        } as Record<string, IconName>
      )[modality] ?? 'circle-alert'
    );
  }
  theftModalitySeverity(modality: string): TagSeverity {
    return (
      (
        {
          'Robo con violencia': 'danger',
          'Robo sin violencia': 'warn',
          Hurto: 'secondary',
        } as Record<string, TagSeverity>
      )[modality] ?? 'secondary'
    );
  }
  statusSeverity(status: string): TagSeverity {
    return (
      (
        {
          Registrado: 'info',
          'En gestión': 'warn',
          Recuperado: 'success',
          Cerrado: 'secondary',
          Anulado: 'danger',
        } as Record<string, TagSeverity>
      )[status] ?? 'secondary'
    );
  }
  statusEntries(order: RecoveryOrder): RecoveryOrderAuditEntry[] {
    return (
      order.auditTrail ?? [{ action: 'Creación', at: order.createdAt, detail: 'Orden registrada.' }]
    );
  }
  canEdit(order: RecoveryOrder): boolean {
    return order.status === 'Registrado' || order.status === 'En gestión';
  }
  /** Borrador de ciclo de vida — ver nota en `TransitionRecoveryOrderResult`. */
  canAdvanceToManagement(order: RecoveryOrder): boolean {
    return order.status === 'Registrado';
  }
  canMarkRecovered(order: RecoveryOrder): boolean {
    return order.status === 'En gestión';
  }
  canClose(order: RecoveryOrder): boolean {
    return order.status === 'Recuperado';
  }
  canAnnul(order: RecoveryOrder): boolean {
    return order.status !== 'Cerrado' && order.status !== 'Anulado';
  }

  // ---------------------------------------------------------------------
  // Mensaje de retroalimentación (toast)
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
  // Retroalimentación de copiar al portapapeles — misma fuente de verdad
  // que la celda de última ubicación de la tabla y el detalle de la orden.
  // ---------------------------------------------------------------------
  readonly copiedLocation = signal<string | null>(null);
  private copyFeedbackTimeout?: number;

  async copyLastLocation(location: string): Promise<void> {
    if (!(await this.copyText(location))) return;
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
      this.copiedLocation.set(null);
    }, 1800);
  }

  // ---------------------------------------------------------------------
  // Formulario de registro/edición y su confirmación
  // ---------------------------------------------------------------------
  readonly draft = signal<RecoveryOrderDraft>(this.emptyDraft());
  readonly errors = signal<Record<FormField, string>>(this.emptyErrors());
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly confirmationOpen = signal(false);
  readonly editingOrder = signal<RecoveryOrder | null>(null);

  readonly dialogTitle = computed(() => (this.editingOrder() ? 'Editar recupero' : 'Registrar recupero'));
  readonly primaryAction = computed(() =>
    this.editingOrder()
      ? { label: 'Guardar cambios', icon: 'save' as const }
      : { label: 'Registrar recupero', icon: 'route' as const },
  );
  readonly secondaryAction = { label: 'Cancelar' };
  readonly confirmationTitle = computed(() =>
    this.editingOrder() ? 'Confirmar cambios' : 'Confirmar registro',
  );
  readonly confirmationCopy = computed(() => {
    const draft = this.draft();
    const sourceLabel = this.sourceLabelOf(draft.sourceType);
    const context = `Fuente de solicitud: ${sourceLabel} — ${draft.sourceName} · ${this.referenceLabel(draft.sourceType)}: ${draft.referenceNumber}`;
    return this.editingOrder()
      ? `¿Confirmas guardar los cambios del recupero ${this.editingOrder()!.id} de la unidad ${draft.unitCode}? ${context}`
      : `¿Confirmas registrar el recupero de la unidad ${draft.unitCode}? ${context}`;
  });
  readonly confirmationPrimaryAction = computed(() => ({
    label: this.editingOrder() ? 'Guardar cambios' : 'Confirmar registro',
    loading: this.saving(),
  }));
  readonly confirmationSecondaryAction = { label: 'Cancelar' };

  openCreate(): void {
    this.dismissMessage();
    this.confirmationOpen.set(false);
    this.editingOrder.set(null);
    this.draft.set(this.emptyDraft());
    this.errors.set(this.emptyErrors());
    this.formOpen.set(true);
  }
  openEdit(order: RecoveryOrder): void {
    if (!this.canEdit(order)) return;
    this.dismissMessage();
    this.confirmationOpen.set(false);
    this.editingOrder.set(order);
    this.draft.set({
      unitCode: order.unitCode,
      sourceType: order.sourceType,
      sourceName: order.sourceName,
      insurerName: order.insurerName,
      serviceType: order.serviceType,
      theftModality: order.theftModality,
      referenceNumber: order.referenceNumber,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      operationalNotes: order.operationalNotes,
      evidence: [...(order.evidence ?? [])],
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
    this.draft.update((draft) => {
      const next = { ...draft, [field]: value };
      // `sourceName` (usado en tabla, búsqueda y confirmación) se deriva de
      // quién solicita: no se pide de nuevo cuando ya se conoce el seguro o
      // el contacto del cliente.
      return field === 'sourceType' || field === 'insurerName' || field === 'contactName'
        ? { ...next, sourceName: this.deriveSourceName(next) }
        : next;
    });
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }
  private deriveSourceName(draft: RecoveryOrderDraft): string {
    if (draft.sourceType === 'aseguradora') return draft.insurerName.trim();
    if (draft.sourceType === 'cliente') return draft.contactName.trim();
    return '';
  }
  addEvidence(file: File): void {
    const evidence: RecoveryOrderEvidence = {
      fileName: file.name,
      fileSize: file.size,
      url: URL.createObjectURL(file),
    };
    this.draft.update((draft) => ({ ...draft, evidence: [...draft.evidence, evidence] }));
    this.errors.update((errors) => ({ ...errors, evidence: '' }));
  }
  removeEvidence(fileName: string): void {
    this.draft().evidence
      .filter((item) => item.fileName === fileName)
      .forEach((item) => item.url && URL.revokeObjectURL(item.url));
    this.draft.update((draft) => ({
      ...draft,
      evidence: draft.evidence.filter((item) => item.fileName !== fileName),
    }));
  }
  requestSubmission(): void {
    if (!this.validate()) return;
    if (this.hasActiveRecoveryOrder(this.draft().unitCode, this.editingOrder()?.id)) {
      this.errors.update((errors) => ({
        ...errors,
        unitCode: 'Esta unidad ya tiene una orden de recupero activa.',
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
        ? `El recupero ${result.order.id} fue actualizado y su edición quedó registrada.`
        : `El recupero ${result.order.id} fue registrado con el estado “${result.order.status}”.`,
    );
    this.draft.set(this.emptyDraft());
  }
  private validate(): boolean {
    const draft = this.draft();
    const errors: Record<FormField, string> = {
      unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.',
      sourceType: draft.sourceType ? '' : 'Selecciona la fuente del recupero.',
      sourceName: '',
      insurerName: draft.insurerName.trim() ? '' : 'Selecciona el seguro de la unidad.',
      serviceType: draft.serviceType.trim() ? '' : 'Selecciona el tipo de servicio.',
      theftModality: draft.theftModality ? '' : 'Selecciona la modalidad de robo.',
      referenceNumber: draft.referenceNumber.trim()
        ? ''
        : `Ingresa ${this.referenceLabel(draft.sourceType).toLocaleLowerCase()}.`,
      contactName: '',
      contactPhone: '',
      operationalNotes: '',
      evidence: '',
    };
    this.errors.set(errors);
    return Object.values(errors).every((error) => !error);
  }
  private emptyDraft(): RecoveryOrderDraft {
    return {
      unitCode: '',
      sourceType: '',
      sourceName: '',
      insurerName: '',
      serviceType: '',
      theftModality: '',
      referenceNumber: '',
      contactName: '',
      contactPhone: '',
      operationalNotes: '',
      evidence: [],
    };
  }
  private emptyErrors(): Record<FormField, string> {
    return {
      unitCode: '', sourceType: '', sourceName: '', insurerName: '', serviceType: '', theftModality: '',
      referenceNumber: '', contactName: '', contactPhone: '', operationalNotes: '', evidence: '',
    };
  }
  private localToday(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  // ---------------------------------------------------------------------
  // Detalle de una orden (drawer)
  // ---------------------------------------------------------------------
  readonly selectedOrder = signal<RecoveryOrder | null>(null);
  readonly detailsOpen = signal(false);
  readonly detailsTitle = computed(() =>
    this.selectedOrder() ? `Detalle de ${this.selectedOrder()!.id}` : 'Detalle de recupero',
  );

  openDetails(order: RecoveryOrder): void {
    this.selectedOrder.set(order);
    this.detailsOpen.set(true);
  }
  closeDetails(): void {
    this.detailsOpen.set(false);
  }
  editFromDetails(order: RecoveryOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openEdit(order), 220);
  }
  advanceToManagementFromDetails(order: RecoveryOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openAdvanceToManagement(order), 220);
  }
  markRecoveredFromDetails(order: RecoveryOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openMarkRecovered(order), 220);
  }
  closeFromDetails(order: RecoveryOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openCloseConfirmation(order), 220);
  }
  annulFromDetails(order: RecoveryOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openAnnulment(order), 220);
  }

  // ---------------------------------------------------------------------
  // Transiciones de ciclo de vida sin motivo: avanzar a gestión, marcar
  // recuperado y cerrar. Comparten un solo diálogo de confirmación
  // (`RecoveryTransitionDialogComponent`) porque las tres son
  // estructuralmente idénticas — a diferencia de Capturas, ninguna pide un
  // campo adicional. Borrador de ciclo de vida, ver nota en
  // `TransitionRecoveryOrderResult`.
  // ---------------------------------------------------------------------
  readonly transitionOrder = signal<RecoveryOrder | null>(null);
  readonly transitionKind = signal<'advance' | 'recovered' | 'close' | null>(null);
  readonly transitionOpen = computed(() => this.transitionKind() !== null);
  private static readonly TRANSITION_COPY: Record<
    'advance' | 'recovered' | 'close',
    { title: string; primaryLabel: string; body: (order: RecoveryOrder) => string }
  > = {
    advance: {
      title: 'Pasar a gestión',
      primaryLabel: 'Pasar a gestión',
      body: (order) =>
        `Pasarás el recupero ${order.id} a "En gestión". Esta acción quedará registrada en el historial.`,
    },
    recovered: {
      title: 'Marcar como recuperado',
      primaryLabel: 'Marcar como recuperado',
      body: (order) =>
        `Marcarás el recupero ${order.id} como "Recuperado" y se registrará la fecha de recuperación.`,
    },
    close: {
      title: 'Cerrar recupero',
      primaryLabel: 'Cerrar recupero',
      body: (order) =>
        `Cerrarás el recupero ${order.id}. Esta acción quedará registrada en el historial y el recupero ya no admitirá edición.`,
    },
  };
  readonly transitionTitle = computed(
    () => RecoveriesService.TRANSITION_COPY[this.transitionKind() ?? 'close'].title,
  );
  readonly transitionCopy = computed(() => {
    const order = this.transitionOrder();
    const kind = this.transitionKind();
    return order && kind ? RecoveriesService.TRANSITION_COPY[kind].body(order) : '';
  });
  readonly transitionPrimaryAction = computed(() => ({
    label: RecoveriesService.TRANSITION_COPY[this.transitionKind() ?? 'close'].primaryLabel,
    loading: this.saving(),
  }));
  readonly transitionSecondaryAction = { label: 'Cancelar' };

  openAdvanceToManagement(order: RecoveryOrder): void {
    if (!this.canAdvanceToManagement(order)) return;
    this.transitionOrder.set(order);
    this.transitionKind.set('advance');
  }
  openMarkRecovered(order: RecoveryOrder): void {
    if (!this.canMarkRecovered(order)) return;
    this.transitionOrder.set(order);
    this.transitionKind.set('recovered');
  }
  openCloseConfirmation(order: RecoveryOrder): void {
    if (!this.canClose(order)) return;
    this.transitionOrder.set(order);
    this.transitionKind.set('close');
  }
  closeTransition(): void {
    if (this.saving()) return;
    this.transitionKind.set(null);
    this.transitionOrder.set(null);
  }
  async confirmTransition(): Promise<void> {
    const order = this.transitionOrder();
    const kind = this.transitionKind();
    if (!order || !kind) return;

    this.saving.set(true);
    const result =
      kind === 'advance'
        ? await this.api.advanceToManagement(order.id)
        : kind === 'recovered'
          ? await this.api.markRecovered(order.id)
          : await this.api.close(order.id);
    this.saving.set(false);

    if (result.kind !== 'success') {
      this.closeTransition();
      this.showMessage('error', result.message);
      return;
    }
    if (this.selectedOrder()?.id === result.order.id) this.selectedOrder.set(result.order);
    this.closeTransition();
    this.showMessage('success', `El recupero ${result.order.id} quedó como "${result.order.status}".`);
  }

  // ---------------------------------------------------------------------
  // Anular recupero — único motivo de transición que pide un dato adicional.
  // ---------------------------------------------------------------------
  readonly annulledOrder = signal<RecoveryOrder | null>(null);
  readonly annulOpen = signal(false);
  readonly annulmentReason = signal('');
  readonly annulmentReasonError = signal('');
  readonly annulPrimaryAction = computed(() => ({
    label: 'Anular recupero',
    disabled: !this.annulmentReason().trim(),
    loading: this.saving(),
  }));
  readonly annulSecondaryAction = { label: 'Cancelar' };

  openAnnulment(order: RecoveryOrder): void {
    if (!this.canAnnul(order)) return;
    this.annulledOrder.set(order);
    this.annulmentReason.set('');
    this.annulmentReasonError.set('');
    this.annulOpen.set(true);
  }
  closeAnnulment(): void {
    if (this.saving()) return;
    this.annulOpen.set(false);
    this.annulledOrder.set(null);
    this.annulmentReason.set('');
    this.annulmentReasonError.set('');
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
    if (this.selectedOrder()?.id === result.order.id) this.selectedOrder.set(result.order);
    this.closeAnnulment();
    this.showMessage('success', `El recupero ${result.order.id} fue anulado.`);
  }
}
