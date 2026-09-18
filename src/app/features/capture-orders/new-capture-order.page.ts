import { NgStyle } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, fieldLabelTypography, Icon, Input, InputDropdown, InputDropdownOption, Modal, Pagination, Select, SelectOption, Table, TableColumn, TableRow, textStyle } from '@iamacalupuenzo-ui/comsatel-ds';
import { CAPTURE_ORDER_STATUSES, CaptureOrder, CaptureOrderDraft, MockCaptureOrdersService } from '../../core/orders/mock-capture-orders.service';
import { UnitAutocompleteComponent, UnitOption } from './unit-autocomplete.component';

type DraftField = keyof CaptureOrderDraft;
type CaptureDialogStage = 'form' | 'review';

const SAMPLE_CAPTURE_ORDERS: CaptureOrder[] = [
  { id: 'CAP-0048', unitCode: 'VHC-1024', source: 'Centro de operaciones', caseNumber: 'EXP-2026-0158', receivedOn: '2026-09-16', createdAt: '16 sep. 2026, 09:42', status: 'En revisión' },
  { id: 'CAP-0047', unitCode: 'TRK-2087', source: 'Autoridad competente', caseNumber: 'EXP-2026-0156', receivedOn: '2026-09-15', createdAt: '15 sep. 2026, 16:18', status: 'Con observación' },
  { id: 'CAP-0046', unitCode: 'VAN-0412', source: 'Cliente', caseNumber: 'EXP-2026-0152', receivedOn: '2026-09-14', createdAt: '14 sep. 2026, 11:06', status: 'Cerrada' },
  { id: 'CAP-0045', unitCode: 'VHC-1041', source: 'Operación en campo', caseNumber: 'EXP-2026-0149', receivedOn: '2026-09-13', createdAt: '13 sep. 2026, 14:35', status: 'Registrada' },
  { id: 'CAP-0044', unitCode: 'TRK-2143', source: 'Centro de operaciones', caseNumber: 'EXP-2026-0146', receivedOn: '2026-09-12', createdAt: '12 sep. 2026, 10:12', status: 'En revisión' },
  { id: 'CAP-0043', unitCode: 'VAN-0534', source: 'Cliente', caseNumber: 'EXP-2026-0142', receivedOn: '2026-09-11', createdAt: '11 sep. 2026, 15:20', status: 'Registrada' },
  { id: 'CAP-0042', unitCode: 'BUS-0379', source: 'Autoridad competente', caseNumber: 'EXP-2026-0139', receivedOn: '2026-09-10', createdAt: '10 sep. 2026, 08:55', status: 'Con observación' },
];

const UNIT_OPTIONS: UnitOption[] = [
  { code: 'VHC-1024', description: 'Van de distribución · Lima centro' },
  { code: 'VHC-1041', description: 'Van de distribución · Lima norte' },
  { code: 'VHC-1158', description: 'Van de distribución · Callao' },
  { code: 'TRK-2087', description: 'Camión rígido · Lima sur' },
  { code: 'TRK-2143', description: 'Camión rígido · Huancayo' },
  { code: 'TRK-2206', description: 'Camión rígido · Arequipa' },
  { code: 'VAN-0412', description: 'Furgón operativo · Cusco' },
  { code: 'VAN-0534', description: 'Furgón operativo · Trujillo' },
  { code: 'BUS-0379', description: 'Bus de personal · Lima este' },
];

@Component({
  imports: [Button, Icon, Input, InputDropdown, Modal, NgStyle, Pagination, RouterLink, Select, Table, UnitAutocompleteComponent],
  template: `
    <main class="capture-matrix" aria-labelledby="capture-title">
      <nav class="breadcrumbs" aria-label="Migas de pan"><a routerLink="/dashboard">Inicio</a><span aria-hidden="true">/</span><span>Gestión</span><span aria-hidden="true">/</span><span aria-current="page">Capturas</span></nav>
      <header class="page-header">
        <div><h1 id="capture-title">Matriz de capturas</h1><p>Consulta las órdenes registradas y crea una captura manual cuando la operación lo requiera.</p></div>
        <cs-button variant="primary" size="md" (click)="openForm()">Registrar captura</cs-button>
      </header>
      @if (message()) { <p class="form-message" [class.is-error]="messageKind() === 'error'" role="status">{{ message() }}</p> }
      <section class="matrix-section" aria-labelledby="matrix-title">
        <div class="matrix-heading"><div><h2 id="matrix-title">Órdenes de captura</h2></div><span>{{ filteredOrders().length }} registros</span></div>
        <div class="matrix-toolbar" aria-label="Filtros de la matriz de capturas">
          <div class="toolbar-field"><label for="capture-search" [ngStyle]="fieldLabelStyle">Buscar orden o unidad</label><cs-input id="capture-search" fieldSize="md" type="search" placeholder="Buscar por orden o unidad" [value]="searchTerm()" (valueChange)="setSearchTerm($event)" /></div>
          <cs-input-dropdown label="Estado" placeholder="Todos los estados" size="md" [options]="statusOptions" [value]="statusFilter()" (valueChange)="setStatusFilter($event)" />
        </div>
        @if (saving() || tableRows().length > 0) {
          <div class="table-area">
            <div class="table-frame"><cs-table [columns]="tableColumns" [rows]="tableRows()" caption="Matriz de órdenes de captura" [isLoading]="saving()" minWidth="720px" /></div>
            <div class="table-footer">
              <div class="table-footer__meta">
                <div class="table-page-size"><span>Filas por página</span><cs-input-dropdown aria-label="Filas por página" size="md" [options]="pageSizeOptions" [value]="rowsPerPageValue()" (valueChange)="setRowsPerPage($event)" /></div>
                <p class="table-summary" role="status" aria-live="polite">{{ tableSummary() }}</p>
              </div>
              @if (filteredOrders().length > rowsPerPage()) { <div class="table-pager"><cs-pagination [totalPages]="totalPages()" [page]="page()" (pageChange)="setPage($event)" /></div> }
            </div>
          </div>
        } @else { <div class="empty-state" role="status"><cs-icon name="file-text" [size]="24" aria-hidden="true" /><div><strong>No encontramos capturas</strong><p>Prueba con otra orden, unidad o estado.</p></div></div> }
      </section>
      <cs-modal [isOpen]="formOpen()" [title]="dialogTitle()" width="lg" [primaryAction]="primaryAction()" [secondaryAction]="secondaryAction()" (primaryActionClick)="continueDialog()" (secondaryActionClick)="returnToForm()" (closed)="closeForm()">
        @if (dialogStage() === 'form') {
          <div class="dialog-content">
            <div class="dialog-copy"><p>Completa los datos mínimos de la orden. Al registrarla, iniciará en el estado “Registrada”.</p></div>
            <form class="capture-form" (submit)="continueDialog($event)" novalidate>
              <div class="field-grid">
              <app-unit-autocomplete inputId="unit-code" label="Código de unidad" [options]="unitOptions" [value]="draft().unitCode" placeholder="Escribe 3 caracteres para buscar" [invalid]="errors().unitCode !== ''" [errorText]="errors().unitCode" [required]="true" (valueChange)="onUnitSelected($event)" />
              <div class="form-field"><cs-select label="Fuente de la orden" placeholder="Selecciona una fuente" size="md" [options]="sourceOptions" [value]="draft().source" (valueChange)="setField('source', asText($event))" [required]="true" />@if (errors().source) { <p class="field-error" role="alert">{{ errors().source }}</p> }</div>
              <div class="form-field"><label for="case-number" [ngStyle]="fieldLabelStyle">N.º de expediente</label><cs-input id="case-number" name="case-number" fieldSize="md" placeholder="Ej. EXP-2026-0158" autocomplete="off" [value]="draft().caseNumber" (valueChange)="setField('caseNumber', $event)" [invalid]="errors().caseNumber !== ''" aria-errormessage="case-number-error" [required]="true" />@if (errors().caseNumber) { <p id="case-number-error" class="field-error">{{ errors().caseNumber }}</p> }</div>
              <div class="form-field"><label for="received-on" [ngStyle]="fieldLabelStyle">Fecha de recepción</label><cs-input id="received-on" name="received-on" type="date" fieldSize="md" [max]="today" [value]="draft().receivedOn" (valueChange)="setField('receivedOn', $event)" [invalid]="errors().receivedOn !== ''" aria-errormessage="received-on-error" [required]="true" />@if (errors().receivedOn) { <p id="received-on-error" class="field-error">{{ errors().receivedOn }}</p> }</div>
              </div>
            </form>
          </div>
        } @else {
          <div class="dialog-content">
            <div class="dialog-copy"><p>Confirma los datos antes de crear la orden. Se guardará con auditoría simulada y sin transiciones de estado.</p></div>
            <dl class="review-list"><div><dt>Unidad</dt><dd>{{ draft().unitCode }}</dd></div><div><dt>Fuente</dt><dd>{{ draft().source }}</dd></div><div><dt>Expediente</dt><dd>{{ draft().caseNumber }}</dd></div><div><dt>Recepción</dt><dd>{{ draft().receivedOn }}</dd></div></dl>
          </div>
        }
      </cs-modal>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100%; }
    .capture-matrix { display: grid; gap: var(--layout-gap-xl); padding: var(--layout-padding-5xl); }
    .breadcrumbs { display: flex; align-items: center; gap: var(--layout-gap-sm); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); } .breadcrumbs a { color: var(--color-text-brand-default); text-decoration: none; } .breadcrumbs a:hover { text-decoration: underline; } .breadcrumbs [aria-current="page"] { color: var(--color-text-base-default); }
    .page-header, .matrix-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--layout-gap-xl); } .page-header > div, .matrix-heading > div { display: grid; gap: var(--layout-gap-xs); } h1, h2, p { margin: 0; }
    h1, h2 { color: var(--color-text-base-default); font-family: var(--font-family-heading); } h1 { font-size: var(--font-size-heading-small); line-height: var(--font-line-height-heading-small); } h2 { font-size: var(--font-size-content-body); line-height: var(--font-line-height-content-body); font-weight: var(--font-weight-emphasis); }
    .page-header p:last-child, .dialog-copy p, .empty-state p { color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
    .matrix-section { display: grid; gap: var(--layout-gap-lg); padding: var(--layout-padding-xl); border: var(--layout-border-thin) solid var(--color-border-divider); border-radius: var(--radius-md); background: var(--elevation-surface-default); } .matrix-heading > span, .table-summary { margin: 0; color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); } .matrix-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(180px, 240px); align-items: end; gap: var(--layout-gap-md); padding-block: var(--layout-padding-sm); } .toolbar-field { display: grid; gap: var(--layout-gap-xs); } .toolbar-field > label { color: var(--color-text-base-default); } .table-area { overflow: hidden; border: var(--layout-border-thin) solid var(--color-border-neutral-subtle); border-radius: var(--radius-lg); background: var(--elevation-surface-default); } .table-frame { min-width: 0; overflow-x: auto; } .table-footer, .table-footer__meta, .table-page-size, .table-pager { display: flex; align-items: center; } .table-footer { justify-content: space-between; gap: var(--layout-gap-xl); padding: var(--layout-padding-md) var(--layout-padding-xl); border-top: var(--layout-border-thin) solid var(--color-border-neutral-subtle); } .table-footer__meta { min-width: 0; gap: var(--layout-gap-xl); } .table-page-size { flex-shrink: 0; gap: var(--layout-gap-md); } .table-page-size > span { color: var(--color-text-base-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); font-weight: var(--font-weight-accent); } .table-pager { margin-left: auto; }
    .empty-state { display: grid; justify-items: center; gap: var(--layout-gap-md); padding: var(--layout-padding-4xl); border: var(--layout-border-thin) dashed var(--color-border-divider); border-radius: var(--radius-sm); color: var(--color-text-base-subtle); text-align: center; } .empty-state cs-icon { color: var(--color-text-base-subtle); } .empty-state div { display: grid; gap: var(--layout-gap-xs); } .empty-state strong { color: var(--color-text-base-default); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
    .form-message { padding: var(--layout-padding-md); border-radius: var(--radius-sm); color: var(--color-text-success-default); background: var(--color-background-success-subtlest); font-size: var(--font-size-content-ui); } .form-message.is-error { color: var(--color-text-danger-default); background: var(--color-background-danger-subtlest); }
    .dialog-content { display: grid; gap: var(--layout-gap-2xl); padding-block: var(--layout-padding-lg); } .capture-form { margin: 0; } .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-lg); } .form-field { display: grid; gap: var(--layout-gap-xs); } .form-field > label { color: var(--color-text-base-default); } .field-error { color: var(--color-text-danger-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .review-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-lg); margin: 0; padding: var(--layout-padding-lg); border: var(--layout-border-thin) solid var(--color-border-divider); border-radius: var(--radius-sm); } .review-list div { display: grid; gap: var(--layout-gap-xs); } dt { color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); } dd { margin: 0; color: var(--color-text-base-default); font-size: var(--font-size-content-ui); font-weight: var(--font-weight-accent); }
    @media (max-width: 767px) { .capture-matrix { padding: var(--layout-padding-xl); } .page-header, .matrix-heading { align-items: stretch; flex-direction: column; } .page-header cs-button { width: 100%; } .matrix-toolbar, .field-grid, .review-list { grid-template-columns: 1fr; } .table-footer, .table-footer__meta { align-items: flex-start; flex-direction: column; } .table-footer { gap: var(--layout-gap-md); } .table-pager { margin-left: 0; justify-content: flex-start; overflow-x: auto; padding-bottom: var(--layout-padding-xs); } }
  `],
})
export class NewCaptureOrderPage {
  protected readonly fieldLabelStyle = textStyle(fieldLabelTypography.md, 'accent');
  protected readonly sourceOptions: SelectOption[] = [{ label: 'Centro de operaciones', value: 'Centro de operaciones' }, { label: 'Cliente', value: 'Cliente' }, { label: 'Autoridad competente', value: 'Autoridad competente' }, { label: 'Operación en campo', value: 'Operación en campo' }];
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly statusOptions: InputDropdownOption[] = [{ label: 'Todos los estados', value: '' }, ...CAPTURE_ORDER_STATUSES.map((status) => ({ label: status, value: status }))];
  protected readonly pageSizeOptions: InputDropdownOption[] = [{ label: '5 por página', value: '5' }, { label: '10 por página', value: '10' }];
  protected readonly tableColumns: TableColumn[] = [{ key: 'id', label: 'Orden', width: '128px' }, { key: 'unit', label: 'Unidad' }, { key: 'source', label: 'Fuente' }, { key: 'status', label: 'Estado' }, { key: 'created', label: 'Registro' }];
  protected readonly draft = signal<CaptureOrderDraft>({ unitCode: '', source: '', caseNumber: '', receivedOn: '' });
  protected readonly errors = signal<Record<DraftField, string>>({ unitCode: '', source: '', caseNumber: '', receivedOn: '' });
  protected readonly saving = signal(false); protected readonly formOpen = signal(false); protected readonly dialogStage = signal<CaptureDialogStage>('form'); protected readonly message = signal(''); protected readonly messageKind = signal<'success' | 'error'>('success'); protected readonly searchTerm = signal(''); protected readonly statusFilter = signal(''); protected readonly rowsPerPage = signal<5 | 10>(5); protected readonly page = signal(1); protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly allOrders = computed(() => [...this.orders.orders(), ...SAMPLE_CAPTURE_ORDERS]);
  protected readonly filteredOrders = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.allOrders().filter((order) => (!search || `${order.id} ${order.unitCode}`.toLocaleLowerCase().includes(search)) && (!status || order.status === status));
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / this.rowsPerPage())));
  protected readonly visibleOrders = computed(() => { const start = (this.page() - 1) * this.rowsPerPage(); return this.filteredOrders().slice(start, start + this.rowsPerPage()); });
  protected readonly tableRows = computed<TableRow[]>(() => this.visibleOrders().map((order) => ({ key: order.id, cells: [order.id, order.unitCode, order.source, order.status, order.createdAt] })));
  protected readonly tableSummary = computed(() => { const total = this.filteredOrders().length; if (!total) return '0 registros'; const first = (this.page() - 1) * this.rowsPerPage() + 1; return `${first}–${Math.min(first + this.rowsPerPage() - 1, total)} de ${total} registros`; });
  protected readonly dialogTitle = computed(() => this.dialogStage() === 'form' ? 'Registrar captura' : 'Confirmar captura');
  protected readonly primaryAction = computed(() => this.dialogStage() === 'form' ? { label: 'Revisar registro' } : { label: 'Registrar orden', loading: this.saving() });
  protected readonly secondaryAction = computed(() => this.dialogStage() === 'form' ? { label: 'Cancelar' } : { label: 'Editar datos', disabled: this.saving() });
  constructor(private readonly orders: MockCaptureOrdersService) {}
  protected readonly onUnitSelected = (unitCode: string): void => this.setField('unitCode', unitCode);
  protected asText(value: string | string[]): string { return typeof value === 'string' ? value : ''; }
  protected setSearchTerm(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  protected setStatusFilter(value: string): void { this.statusFilter.set(value); this.page.set(1); }
  protected rowsPerPageValue(): string { return String(this.rowsPerPage()); }
  protected setRowsPerPage(value: string): void { this.rowsPerPage.set(value === '10' ? 10 : 5); this.page.set(1); }
  protected setPage(page: number): void { this.page.set(Math.min(Math.max(1, page), this.totalPages())); }
  protected openForm(): void { this.message.set(''); this.dialogStage.set('form'); this.formOpen.set(true); }
  protected closeForm(): void { if (!this.saving()) this.formOpen.set(false); }
  protected returnToForm(): void { if (this.saving()) return; if (this.dialogStage() === 'review') { this.dialogStage.set('form'); return; } this.closeForm(); }
  protected setField(field: DraftField, value: string): void { this.draft.update((draft) => ({ ...draft, [field]: value })); this.errors.update((errors) => ({ ...errors, [field]: '' })); }
  protected continueDialog(event?: Event): void { event?.preventDefault(); if (this.dialogStage() === 'review') { void this.register(); return; } if (this.validate()) this.dialogStage.set('review'); }
  private async register(): Promise<void> { this.saving.set(true); const result = await this.orders.create(this.draft()); this.saving.set(false); if (result.kind !== 'success') { this.messageKind.set('error'); this.message.set(result.message); this.formOpen.set(false); return; } this.formOpen.set(false); this.messageKind.set('success'); this.message.set(`La orden ${result.order.id} fue registrada con el estado “${result.order.status}”.`); this.draft.set({ unitCode: '', source: '', caseNumber: '', receivedOn: '' }); }
  private validate(): boolean { const draft = this.draft(); const errors: Record<DraftField, string> = { unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.', source: draft.source ? '' : 'Selecciona la fuente de la orden.', caseNumber: draft.caseNumber.trim() ? '' : 'Ingresa el número de expediente.', receivedOn: !draft.receivedOn ? 'Selecciona la fecha de recepción.' : draft.receivedOn > this.today ? 'La fecha no puede ser futura.' : '' }; this.errors.set(errors); return Object.values(errors).every((error) => !error); }
}
