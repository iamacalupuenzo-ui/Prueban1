import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import {
  Button,
  Calendar,
  ColumnManager,
  DropdownItemComponent,
  Icon,
  Input,
  InputDropdown,
  InputDropdownOption,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Modal,
  Pagination,
  Popover,
  Select,
  SelectOption,
  SortOrder,
  Table,
  TableColumn,
  TableRow,
  Tag,
  type DropdownItem,
  type ColumnManagerItem,
  type IconName,
  type TagSeverity,
} from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_ORDER_STATUSES,
  CaptureDocumentType,
  CaptureOrder,
  CaptureOrderAuditEntry,
  CaptureOrderDocument,
  CaptureOrderDraft,
  MockCaptureOrdersService,
} from '../../core/orders/mock-capture-orders.service';
import { SideDrawerComponent } from '../../shared/side-drawer.component';
import { UnitAutocompleteComponent, UnitOption } from './unit-autocomplete.component';
import {
  UnitTypeFilterOption,
  UnitTypeMultiSelectComponent,
} from './unit-type-multi-select.component';

type DraftField = Exclude<keyof CaptureOrderDraft, 'documents'>;
type FormField = DraftField | 'documents';
type RowsPerPage = 10 | 25 | 50 | 100;
type UnitType = 'VHC' | 'TRK' | 'VAN' | 'BUS';
type BulkUploadStage = 'select' | 'validating' | 'review' | 'uploading' | 'success';

type BulkValidationRow = {
  row: number;
  unitCode: string;
  source: string;
  outcome: 'valid' | 'rejected';
  reason?: string;
};

const DEFAULT_SORT = { key: 'created', order: 'desc' as const };
const BULK_ERROR_PAGE_SIZE = 5;

const UNIT_TYPE_OPTIONS: ReadonlyArray<UnitTypeFilterOption & { value: UnitType }> = [
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

const DOCUMENT_DEFINITIONS: ReadonlyArray<{
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

@Component({
  imports: [
    Button,
    Calendar,
    ColumnManager,
    DropdownItemComponent,
    Icon,
    Input,
    InputDropdown,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Modal,
    Pagination,
    Popover,
    Select,
    SideDrawerComponent,
    Table,
    Tag,
    UnitAutocompleteComponent,
    UnitTypeMultiSelectComponent,
  ],
  template: `
    <ng-template #statusCell let-status
      ><cs-tag [value]="status" [severity]="statusSeverity(status)" [rounded]="true" size="lg"
    /></ng-template>
    <ng-template #unitCell let-order>
      <span class="capture-orders-table__unit">
        <cs-icon [name]="unitIconOf(order.unitCode)" [size]="16" aria-hidden="true" />
        <span>{{ order.unitCode }}</span>
      </span>
    </ng-template>
    <ng-template #bulkErrorUnitCell let-row>
      <span
        class="copy-on-hover"
        role="button"
        tabindex="0"
        [attr.aria-label]="
          copiedBulkUnitCode() === row.unitCode
            ? 'Código de unidad ' + row.unitCode + ' copiado'
            : 'Copiar código de unidad ' + row.unitCode
        "
        (click)="copyBulkUnitCode(row.unitCode)"
        (keydown.enter)="copyBulkUnitCode(row.unitCode)"
        (keydown.space)="$event.preventDefault(); copyBulkUnitCode(row.unitCode)"
      >
        <span>{{ row.unitCode }}</span>
        <cs-icon name="copy" [size]="14" aria-hidden="true" />
      </span>
    </ng-template>
    <ng-template #lastLocationCell let-order>
      @if (locationOf(order.unitCode); as location) {
        <span
          class="copy-on-hover"
          role="button"
          tabindex="0"
          [attr.aria-label]="
            copiedLocation() === location.lastLocation
              ? 'Ubicación copiada'
              : 'Copiar última ubicación de ' + order.unitCode
          "
          (click)="copyLastLocation(location.lastLocation)"
          (keydown.enter)="copyLastLocation(location.lastLocation)"
          (keydown.space)="$event.preventDefault(); copyLastLocation(location.lastLocation)"
        >
          <span>{{ location.lastLocation }}</span>
          <cs-icon name="copy" [size]="14" aria-hidden="true" />
        </span>
      } @else {
        <span>Sin posición disponible</span>
      }
    </ng-template>
    <ng-template #actionsCell let-order>
      <span #actionTrigger class="row-action-trigger"
        ><cs-button
          variant="subtle"
          size="sm"
          [aria-label]="'Acciones para ' + order.id"
          (click)="toggleActionMenu(order.id)"
          ><cs-icon name="more-horizontal" [size]="16" aria-hidden="true" /></cs-button
      ></span>
      <cs-popover
        [isOpen]="actionMenuOrderId() === order.id"
        [triggerRef]="actionTrigger"
        placement="bottom-end"
        [offset]="4"
        role="menu"
        [ariaLabel]="'Acciones para ' + order.id"
        (closed)="closeActionMenu()"
        ><div class="row-action-menu">
          <p class="row-action-menu__heading">Acciones</p>
          <div class="row-action-menu__divider" aria-hidden="true"></div>
          @for (item of actionItems(order); track item.value) {
            <cs-dropdown-item
              [item]="item"
              size="sm"
              selectionMode="none"
              (itemSelect)="runAction(order, $event)"
            />
            @if (item.dividerAfter) {
              <div class="row-action-menu__divider" aria-hidden="true"></div>
            }
          }</div
      ></cs-popover>
    </ng-template>
    <main class="capture-matrix" aria-labelledby="capture-title">
      @if (message()) {
        <div
          class="feedback-toast"
          [class.is-error]="messageKind() === 'error'"
          [class.is-info]="messageKind() === 'info'"
          [attr.role]="messageKind() === 'error' ? 'alert' : 'status'"
          aria-live="polite"
        >
          <cs-icon
            [name]="
              messageKind() === 'error'
                ? 'circle-alert'
                : messageKind() === 'info'
                  ? 'circle-help'
                  : 'circle-check'
            "
            [size]="20"
            aria-hidden="true"
          />
          <p>{{ message() }}</p>
          <button
            type="button"
            class="feedback-toast__close"
            aria-label="Cerrar notificación"
            (click)="dismissMessage()"
          >
            <cs-icon name="x" [size]="16" aria-hidden="true" />
          </button>
        </div>
      }
      <section class="matrix-section" aria-labelledby="capture-title">
        <header class="page-header">
          <div class="page-header__content">
            <h1 id="capture-title">Capturas</h1>
            <p class="page-header__description">
              Consulta y gestiona las órdenes de captura registradas para las unidades.
            </p>
          </div>
          <div class="page-header__actions">
            <cs-button variant="default" size="sm" (click)="openBulkUpload()"
              ><cs-icon name="layers" [size]="16" aria-hidden="true" />Carga masiva de
              capturas</cs-button
            ><cs-button variant="primary" size="sm" (click)="openForm()"
              ><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar captura</cs-button
            >
          </div>
        </header>
        <div class="matrix-toolbar" aria-label="Filtros de la matriz de capturas">
          <div class="toolbar-field">
            <label for="capture-search">Buscar orden o unidad</label
            ><cs-input-group
              ><cs-input-group-addon
                ><cs-icon
                  name="search"
                  [size]="16"
                  style="color: var(--color-text-base-subtlest)"
                  aria-hidden="true" /></cs-input-group-addon
              ><cs-input-group-input
                id="capture-search"
                fieldSize="md"
                type="search"
                placeholder="Buscar por orden o unidad"
                [value]="searchTerm()"
                (valueChange)="setSearchTerm($event)"
            /></cs-input-group>
          </div>
          <div class="toolbar-field toolbar-field--status">
            <label id="capture-status-label">Estado</label
            ><cs-input-dropdown
              class="status-filter-control"
              aria-labelledby="capture-status-label"
              placeholder="Todos los estados"
              size="md"
              [options]="statusOptions"
              [value]="statusFilter()"
              (valueChange)="setStatusFilter($event)"
            />
          </div>
          <div class="toolbar-field toolbar-field--date-range">
            <label id="capture-date-range-label" for="capture-date-range">Fecha de registro</label>
            <div #captureDateTrigger class="date-range-trigger">
              <cs-input-group
                ><cs-input-group-input
                  id="capture-date-range"
                  fieldSize="md"
                  [readonly]="true"
                  [value]="dateRangeInputValue()"
                  placeholder="Selecciona un rango"
                  ariaHasPopup="dialog"
                  [ariaExpanded]="dateRangeOpen()"
                  ariaControls="capture-date-range-calendar"
                  ariaLabelledby="capture-date-range-label"
                  (focused)="openDateRangePicker()"
                  (enterKey)="toggleDateRangePicker()"
                  (escapeKey)="closeDateRangePicker()" /><cs-input-group-addon
                  align="inline-end"
                  [compact]="true"
                  ><button
                    type="button"
                    class="date-range-calendar-button"
                    aria-label="Abrir calendario de rango"
                    [attr.aria-expanded]="dateRangeOpen()"
                    aria-controls="capture-date-range-calendar"
                    (click)="toggleDateRangePicker()"
                  >
                    <cs-icon
                      name="calendar"
                      [size]="16"
                      aria-hidden="true"
                    /></button></cs-input-group-addon
              ></cs-input-group>
            </div>
            <cs-popover
              [isOpen]="dateRangeOpen()"
              [triggerRef]="captureDateTrigger"
              placement="bottom-start"
              [offset]="4"
              role="dialog"
              ariaLabel="Seleccionar rango de fechas de registro"
              [bare]="true"
              (closed)="closeDateRangePicker()"
              ><div id="capture-date-range-calendar" class="date-range-popover">
                <cs-calendar
                  [selected]="pendingDateRangeStart() ? [pendingDateRangeStart()!] : []"
                  [rangeSelected]="selectedDateRange()"
                  [weekStartDay]="1"
                  ariaLabelledby="capture-date-range-label"
                  (dateChange)="selectDateRangeDate($event)"
                />
                <div class="date-range-popover__actions">
                  <cs-button
                    variant="subtle"
                    size="sm"
                    [disabled]="!dateFrom()"
                    (click)="clearDateRange()"
                    >Limpiar</cs-button
                  >
                </div>
              </div></cs-popover
            >
          </div>
        </div>
        <div class="table-utilities">
          <cs-column-manager
            class="capture-column-manager"
            label=""
            aria-label="Configurar columnas de la matriz de capturas"
            size="md"
            [columns]="columnManagerColumns()"
            [minVisible]="3"
            (visibilityChange)="setVisibleColumns($event)"
            (orderChange)="setColumnOrder($event)"
          />
          <span #exportTrigger class="table-utilities__trigger"
            ><cs-button
              variant="default"
              size="sm"
              [attr.aria-expanded]="exportMenuOpen()"
              aria-controls="capture-export-menu"
              (click)="toggleExportMenu()"
              ><cs-icon name="download" [size]="16" aria-hidden="true" />Descargar<cs-icon
                name="chevron-down"
                [size]="16"
                aria-hidden="true" /></cs-button></span
          ><cs-popover
            [isOpen]="exportMenuOpen()"
            [triggerRef]="exportTrigger"
            placement="bottom-end"
            [offset]="4"
            role="menu"
            ariaLabel="Formatos de descarga"
            (closed)="closeExportMenu()"
            ><div id="capture-export-menu" class="export-menu">
              @for (item of exportOptions; track item.value) {
                <cs-dropdown-item
                  [item]="item"
                  size="sm"
                  selectionMode="none"
                  (itemSelect)="requestExport($event)"
                />
              }</div
          ></cs-popover>
        </div>
        <div class="table-area" [class.table-area--actions-shadow]="showActionsShadow()">
          <div class="table-frame">
            <cs-table
              #captureOrdersTable
              class="capture-orders-table"
              [columns]="tableColumns()"
              [rows]="tableRows()"
              [sortKey]="sortKey()"
              [sortOrder]="sortOrder()"
              caption="Matriz de órdenes de captura"
              [isLoading]="saving() || orders.fixturesLoading()"
              [minWidth]="tableMinWidth()"
              (sort)="setSort($event)"
              ><div emptyState class="empty-state" role="status">
                <div class="empty-state__message">
                  <cs-icon name="file-text" [size]="40" aria-hidden="true" />
                  <div>
                    <strong>{{ orders.fixturesError() || 'No encontramos capturas' }}</strong>
                    <p>
                      {{
                        orders.fixturesError()
                          ? 'Verifica tu conexión e inténtalo nuevamente.'
                          : 'Prueba con otra orden, unidad o estado.'
                      }}
                    </p>
                  </div>
                </div>
                @if (orders.fixturesError()) {
                  <cs-button variant="secondary" size="sm" (click)="retryFixtureLoad()"
                    >Reintentar</cs-button
                  >
                } @else {
                  <cs-button variant="secondary" size="sm" (click)="openForm()"
                    ><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar
                    captura</cs-button
                  >
                }
              </div></cs-table
            >
            <p class="visually-hidden" role="status" aria-live="polite">{{ sortDescription() }}</p>
          </div>
          <div class="table-footer">
            <div class="table-page-size">
              <span>Filas</span
              ><cs-input-dropdown
                aria-label="Filas por página"
                size="sm"
                [options]="pageSizeOptions"
                [value]="rowsPerPageValue()"
                (valueChange)="setRowsPerPage($event)"
              />
            </div>
            <p class="table-summary" role="status" aria-live="polite">{{ tableSummary() }}</p>
            <div class="table-pager">
              <span>Página {{ page() }} de {{ totalPages() }}</span>
              @if (filteredOrders().length > rowsPerPage()) {
                <cs-pagination
                  [totalPages]="totalPages()"
                  [page]="page()"
                  (pageChange)="setPage($event)"
                />
              }
            </div>
          </div>
        </div>
      </section>
      <app-side-drawer
        [isOpen]="formOpen()"
        [title]="dialogTitle()"
        surface="canvas"
        [primaryAction]="primaryAction()"
        [secondaryAction]="secondaryAction"
        (primaryActionClick)="requestSubmission()"
        (secondaryActionClick)="closeForm()"
        (closed)="closeForm()"
      >
        <div class="dialog-content">
          <form class="capture-form" (submit)="requestSubmission($event)" novalidate>
            <div class="field-grid">
              <div class="unit-selection-grid">
                <app-unit-type-multi-select
                  inputId="unit-type"
                  label="Tipo de unidad"
                  placeholder="Todos los tipos"
                  [options]="unitTypeOptions"
                  [value]="unitTypeFilter()"
                  (valueChange)="setUnitTypeFilter($event)"
                />
                <app-unit-autocomplete
                  inputId="unit-code"
                  label="Código de unidad"
                  [options]="filteredUnitOptions()"
                  [value]="draft().unitCode"
                  placeholder="Escribe 3 caracteres para buscar"
                  [invalid]="errors().unitCode !== ''"
                  [errorText]="errors().unitCode"
                  [required]="true"
                  (valueChange)="onUnitSelected($event)"
                />
              </div>
              @if (selectedUnit(); as unit) {
                <div class="selected-unit-summary" role="status" aria-live="polite">
                  <div class="selected-unit-summary__identity">
                    <p>Unidad seleccionada</p>
                    <span
                      ><strong>{{ unit.code }}</strong
                      >{{ unit.owner }}</span
                    >
                  </div>
                  <span class="selected-unit-summary__divider" aria-hidden="true"></span>
                  <div class="selected-unit-summary__location">
                    <p>Última ubicación</p>
                    <span>{{ unit.lastLocation }}</span>
                  </div>
                </div>
              }
              <div class="form-field">
                <cs-select
                  class="capture-source-select"
                  label="Fuente de la orden"
                  placeholder="Selecciona una fuente"
                  size="md"
                  [options]="sourceOptions"
                  [value]="draft().source"
                  (valueChange)="setField('source', asText($event))"
                  [required]="true"
                />
                @if (errors().source) {
                  <p class="field-error" role="alert">{{ errors().source }}</p>
                }
              </div>
              <div class="case-received-grid">
                <div class="form-field">
                  <label for="case-number"
                    >N.º de expediente
                    <span class="required-marker" aria-hidden="true">*</span></label
                  ><cs-input
                    id="case-number"
                    name="case-number"
                    fieldSize="md"
                    placeholder="{{ caseNumberPrefix }}0000"
                    autocomplete="off"
                    [value]="draft().caseNumber"
                    (valueChange)="setCaseNumber($event)"
                    [invalid]="errors().caseNumber !== ''"
                    aria-errormessage="case-number-error"
                    [required]="true"
                  />
                  @if (errors().caseNumber) {
                    <p id="case-number-error" class="field-error">{{ errors().caseNumber }}</p>
                  }
                </div>
                <div class="form-field">
                  <label for="received-on"
                    >Fecha de recepción
                    <span class="required-marker" aria-hidden="true">*</span></label
                  ><cs-input
                    id="received-on"
                    name="received-on"
                    type="date"
                    fieldSize="md"
                    [max]="today"
                    [value]="draft().receivedOn"
                    (valueChange)="setField('receivedOn', $event)"
                    [invalid]="errors().receivedOn !== ''"
                    aria-errormessage="received-on-error"
                    [required]="true"
                  />
                  @if (errors().receivedOn) {
                    <p id="received-on-error" class="field-error">{{ errors().receivedOn }}</p>
                  }
                </div>
              </div>
              <section
                class="document-section"
                aria-labelledby="documents-title"
                [class.has-error]="errors().documents !== ''"
              >
                <div class="document-section__header">
                  <div class="document-section__copy">
                    <h2 id="documents-title">
                      Documentos de respaldo
                      <span class="required-marker" aria-hidden="true">*</span>
                    </h2>
                    <p>Adjunta un PDF por cada documento. Tamaño máximo: 10 MB.</p>
                  </div>
                  <span class="document-section__count" aria-live="polite"
                    >{{ draft().documents.length }} de
                    {{ documentDefinitions.length }} adjuntos</span
                  >
                </div>
                <div class="document-list">
                  @for (document of documentDefinitions; track document.type) {
                    @let uploaded = uploadedDocument(document.type);
                    <article class="document-upload" [class.document-upload--complete]="uploaded">
                      <div class="document-upload__icon" aria-hidden="true">
                        <cs-icon [name]="uploaded ? 'check-circle-2' : 'file-text'" [size]="18" />
                      </div>
                      <div class="document-upload__content">
                        <h3>{{ document.label }}</h3>
                        @if (uploaded) {
                          <p class="document-upload__file" [title]="uploaded.fileName">
                            {{ uploaded.fileName }}
                            <span>· {{ formatFileSize(uploaded.fileSize) }}</span>
                          </p>
                        } @else {
                          <p>{{ document.description }}</p>
                        }
                      </div>
                      <input
                        #documentInput
                        class="document-upload__input"
                        [id]="'document-' + document.type"
                        type="file"
                        accept="application/pdf,.pdf"
                        [attr.aria-describedby]="'document-' + document.type + '-help'"
                        (change)="selectDocument(document.type, $event)"
                      />
                      <div class="document-upload__actions">
                        @if (uploaded) {
                          <cs-button
                            variant="subtle"
                            size="sm"
                            [aria-label]="'Reemplazar ' + document.label"
                            (click)="documentInput.click()"
                            ><cs-icon
                              name="folder"
                              [size]="16"
                              aria-hidden="true"
                            />Reemplazar</cs-button
                          ><cs-button
                            variant="subtle"
                            size="sm"
                            [aria-label]="'Quitar ' + document.label"
                            (click)="removeDocument(document.type)"
                            ><cs-icon
                              class="document-upload__remove-icon"
                              name="trash-2"
                              [size]="16"
                              aria-hidden="true"
                          /></cs-button>
                        } @else {
                          <cs-button
                            variant="default"
                            size="sm"
                            [aria-label]="'Adjuntar ' + document.label"
                            (click)="documentInput.click()"
                            ><cs-icon
                              name="plus"
                              [size]="16"
                              aria-hidden="true"
                            />Adjuntar</cs-button
                          >
                        }
                      </div>
                      <span class="visually-hidden" [id]="'document-' + document.type + '-help'"
                        >Solo se acepta un archivo PDF de hasta 10 MB.</span
                      >
                    </article>
                  }
                </div>
                @if (errors().documents) {
                  <p class="field-error" role="alert">{{ errors().documents }}</p>
                }
              </section>
            </div>
          </form>
        </div>
      </app-side-drawer>
      <cs-modal
        class="capture-surface-modal bulk-upload-modal"
        [isOpen]="bulkUploadOpen()"
        title="Carga masiva de capturas"
        width="lg"
        [primaryAction]="bulkPrimaryAction()"
        [secondaryAction]="bulkSecondaryAction()"
        (primaryActionClick)="runBulkPrimaryAction()"
        (secondaryActionClick)="closeBulkUpload()"
        (closed)="closeBulkUpload()"
      >
        <div class="bulk-upload-content">
          @if (bulkUploadStage() === 'select') {
            <div class="bulk-upload-intro">
              <p>
                Carga un archivo con órdenes de captura. Antes de registrar, validaremos su
                estructura, las unidades y las órdenes activas existentes.
              </p>
              <div class="bulk-template">
                <div>
                  <strong>Plantilla de carga</strong>
                  <span>Unidad, fuente de la orden, expediente y fecha de recepción.</span>
                </div>
                <cs-button variant="default" size="sm" (click)="downloadBulkTemplate()"
                  ><cs-icon name="download" [size]="16" aria-hidden="true" />Descargar plantilla</cs-button
                >
              </div>
            </div>
            <input
              #bulkFileInput
              class="visually-hidden"
              type="file"
              accept=".xlsx,.xls,.csv"
              (change)="selectBulkFile($event)"
            />
            <div
              class="bulk-dropzone"
              (dragover)="allowBulkDrop($event)"
              (drop)="dropBulkFile($event)"
            >
              <cs-icon name="file-text" [size]="24" aria-hidden="true" />
              <strong>Arrastra el archivo aquí</strong>
              <span>Formatos admitidos: XLSX, XLS o CSV. Tamaño máximo: 10 MB.</span>
              <cs-button variant="default" size="sm" (click)="bulkFileInput.click()"
                ><cs-icon name="file-text" [size]="16" aria-hidden="true" />Seleccionar archivo</cs-button
              >
            </div>
            @if (bulkUploadError()) {
              <p class="field-error" role="alert">{{ bulkUploadError() }}</p>
            }
          } @else if (bulkUploadStage() === 'validating') {
            <div class="bulk-upload-state" role="status" aria-live="polite">
              <cs-icon name="loader" [size]="24" aria-hidden="true" />
              <strong>Validando archivo…</strong>
              <span>Comprobamos columnas, datos obligatorios y órdenes activas.</span>
            </div>
          } @else if (bulkUploadStage() === 'review') {
            <div class="bulk-upload-review">
              <div class="bulk-upload-review__summary">
                <div>
                  <strong>{{ bulkValidRows().length }}</strong><span>listas para cargar</span>
                </div>
                <div class="is-rejected">
                  <strong>{{ bulkRejectedRows().length }}</strong><span>no se cargarán</span>
                </div>
              </div>
              <p>
                <strong>{{ bulkFileName() }}</strong> cumple la estructura de la plantilla. Solo se
                detallan las filas que requieren corrección.
              </p>
              <section class="bulk-errors" aria-labelledby="bulk-errors-title">
                <h3 id="bulk-errors-title">Filas que requieren corrección</h3>
                <div class="bulk-errors__table-frame">
                  <cs-table
                    [columns]="bulkErrorColumns"
                    [rows]="bulkErrorTableRows()"
                    caption="Filas rechazadas durante la validación de la carga masiva"
                  />
                  @if (bulkErrorPages() > 1) {
                    <footer class="bulk-errors__footer">
                      <span>{{ bulkErrorSummary() }}</span>
                      <cs-pagination
                        [page]="bulkErrorPage()"
                        [totalPages]="bulkErrorPages()"
                        navLabel="Paginación de filas rechazadas"
                        (pageChange)="setBulkErrorPage($event)"
                      />
                    </footer>
                  }
                </div>
              </section>
            </div>
          } @else if (bulkUploadStage() === 'uploading') {
            <div class="bulk-upload-state" role="status" aria-live="polite">
              <cs-icon name="loader" [size]="24" aria-hidden="true" />
              <strong>Cargando datos…</strong>
              <span>Registramos {{ bulkValidRows().length }} capturas válidas.</span>
            </div>
          } @else {
            <div class="bulk-upload-state bulk-upload-state--success" role="status" aria-live="polite">
              <cs-icon name="circle-check" [size]="28" aria-hidden="true" />
              <strong>Datos cargados exitosamente</strong>
              <span>
                Se registraron {{ bulkLoadedCount() }} capturas. Las {{ bulkRejectedRows().length }} filas
                observadas permanecen sin registrar.
              </span>
            </div>
          }
        </div>
      </cs-modal>
      <cs-modal
        class="capture-surface-modal"
        [isOpen]="closeOpen()"
        title="Cerrar captura"
        width="sm"
        [primaryAction]="closePrimaryAction()"
        [secondaryAction]="closeSecondaryAction"
        (primaryActionClick)="confirmClose()"
        (secondaryActionClick)="closeCloseConfirmation()"
        (closed)="closeCloseConfirmation()"
      >
        @if (closingOrder(); as order) {
          <div class="confirmation-content">
            <p>
              Cerrarás la orden {{ order.id }}. Esta acción quedará registrada en el historial y la
              captura ya no admitirá edición ni anulación.
            </p>
          </div>
        }
      </cs-modal>
      <cs-modal
        class="capture-surface-modal"
        [isOpen]="observationOpen()"
        title="Observar captura"
        width="md"
        [primaryAction]="observationPrimaryAction()"
        [secondaryAction]="observationSecondaryAction"
        (primaryActionClick)="confirmObservation()"
        (secondaryActionClick)="closeObservation()"
        (closed)="closeObservation()"
      >
        @if (observedOrder(); as order) {
          <div class="dialog-content dialog-content--reason">
            <div class="dialog-copy">
              <p>
                La orden {{ order.id }} pasará a Con observación. Describe qué debe corregirse antes
                de continuar.
              </p>
            </div>
            <div class="form-field">
              <label for="observation-reason">Descripción de la observación</label
              ><cs-input
                id="observation-reason"
                fieldSize="md"
                placeholder="Describe la observación"
                [value]="observationReason()"
                (valueChange)="setObservationReason($event)"
                [invalid]="observationReasonError() !== ''"
                [required]="true"
              />
              @if (observationReasonError()) {
                <p class="field-error" role="alert">{{ observationReasonError() }}</p>
              }
            </div>
          </div>
        }
      </cs-modal>
      <cs-modal
        class="capture-confirmation-modal capture-surface-modal"
        [isOpen]="confirmationOpen()"
        [title]="confirmationTitle()"
        width="sm"
        [primaryAction]="confirmationPrimaryAction()"
        [secondaryAction]="confirmationSecondaryAction"
        (primaryActionClick)="confirmSubmission()"
        (secondaryActionClick)="closeConfirmation()"
        (closed)="closeConfirmation()"
        ><div class="confirmation-content">
          <p>{{ confirmationCopy() }}</p>
        </div></cs-modal
      >
      <app-side-drawer
        [isOpen]="detailsOpen()"
        [title]="detailsTitle()"
        surface="canvas"
        (closed)="closeDetails()"
      >
        @if (selectedOrder(); as order) {
          <div class="details-content">
            <section class="detail-section" aria-labelledby="detail-information-title">
              <h3 id="detail-information-title">Información de la orden</h3>
              <dl class="detail-data">
                <div>
                  <dt>Unidad</dt>
                  <dd class="detail-data__unit">
                    <cs-icon [name]="unitIconOf(order.unitCode)" [size]="16" aria-hidden="true" />
                    {{ order.unitCode }}
                  </dd>
                </div>
                <div>
                  <dt>Propietario</dt>
                  <dd>{{ ownerOf(order.unitCode) }}</dd>
                </div>
                <div>
                  <dt>Fuente de la orden</dt>
                  <dd>{{ order.source }}</dd>
                </div>
                <div>
                  <dt>Expediente</dt>
                  <dd>{{ order.caseNumber }}</dd>
                </div>
                <div>
                  <dt>Fecha de recepción</dt>
                  <dd>{{ formatReceivedDate(order.receivedOn) }}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <cs-tag
                      [value]="order.status"
                      [severity]="statusSeverity(order.status)"
                      [rounded]="true"
                      size="lg"
                    />
                  </dd>
                </div>
                @if (order.annulmentReason) {
                  <div class="detail-data__full-width">
                    <dt>Motivo de anulación</dt>
                    <dd>{{ order.annulmentReason }}</dd>
                  </div>
                }
                @if (order.observationReason) {
                  <div class="detail-data__full-width">
                    <dt>Observación</dt>
                    <dd>{{ order.observationReason }}</dd>
                  </div>
                }
              </dl>
            </section>

            <section class="detail-section detail-location" aria-labelledby="detail-location-title">
              <div class="detail-location__header">
                <h3 id="detail-location-title">Última ubicación</h3>
                <span
                  class="detail-location__history"
                  aria-label="Historial de ubicaciones: próximamente disponible"
                >
                  <cs-icon name="history" [size]="16" aria-hidden="true" />Historial
                </span>
              </div>
              <div class="detail-location__value">
                <cs-icon name="map-pin" [size]="18" aria-hidden="true" />
                <div>
                  @if (locationOf(order.unitCode); as location) {
                    <span
                      class="detail-location__address copy-on-hover"
                      role="button"
                      tabindex="0"
                      [attr.aria-label]="
                        copiedLocation() === location.lastLocation
                          ? 'Ubicación copiada'
                          : 'Copiar última ubicación'
                      "
                      (click)="copyLastLocation(location.lastLocation)"
                      (keydown.enter)="copyLastLocation(location.lastLocation)"
                      (keydown.space)="$event.preventDefault(); copyLastLocation(location.lastLocation)"
                    >
                      {{ location.lastLocation }}
                      <cs-icon name="copy" [size]="14" aria-hidden="true" />
                    </span>
                    <span>Última posición disponible para la unidad.</span>
                  } @else {
                    <strong>Sin posición disponible</strong>
                    <span>La telemetría no reporta una posición para esta unidad.</span>
                  }
                </div>
              </div>
            </section>

            <section class="detail-actions" aria-labelledby="detail-actions-title">
              <h3 id="detail-actions-title">Acciones disponibles</h3>
              <div>
                @if (canClose(order)) {
                  <cs-button variant="default" size="sm" (click)="closeFromDetails(order)">
                    <cs-icon name="lock" [size]="16" aria-hidden="true" />Cerrar captura
                  </cs-button>
                }
                @if (canObserve(order)) {
                  <cs-button variant="default" size="sm" (click)="observeFromDetails(order)">
                    <cs-icon name="alert-triangle" [size]="16" aria-hidden="true" />Observar captura
                  </cs-button>
                }
                @if (canAnnul(order)) {
                  <cs-button variant="destructive" size="sm" (click)="annulFromDetails(order)">
                    <cs-icon name="x" [size]="16" aria-hidden="true" />Anular captura
                  </cs-button>
                }
                @if (!canClose(order) && !canObserve(order) && !canAnnul(order)) {
                  <p>No hay acciones disponibles para el estado actual.</p>
                }
              </div>
            </section>

            <section class="status-timeline" aria-labelledby="status-timeline-title">
              <h3 id="status-timeline-title">Historial de la orden</h3>
              <ol>
                @for (
                  entry of statusEntries(order);
                  track entry.action + entry.at;
                  let isCurrent = $last
                ) {
                  <li [class.is-current]="isCurrent">
                    <span class="status-timeline__marker" aria-hidden="true"></span>
                    <div class="status-timeline__entry">
                      <div class="status-timeline__heading">
                        <strong>{{ entry.action }}</strong>
                        <time>{{ entry.at }}</time>
                      </div>
                      <span>{{ entry.detail }}</span>
                    </div>
                  </li>
                }
              </ol>
            </section>
          </div>
        }
      </app-side-drawer>
      <cs-modal
        class="capture-surface-modal"
        [isOpen]="annulOpen()"
        title="Anular captura"
        appearance="danger"
        width="md"
        [primaryAction]="annulPrimaryAction()"
        [secondaryAction]="annulSecondaryAction"
        (primaryActionClick)="confirmAnnulment()"
        (secondaryActionClick)="closeAnnulment()"
        (closed)="closeAnnulment()"
      >
        @if (annulledOrder(); as order) {
          <div class="dialog-content dialog-content--reason">
            <div class="dialog-copy">
              <p>
                Anularás la orden {{ order.id }}. El registro seguirá disponible para consulta junto
                con el motivo y el historial de esta acción.
              </p>
            </div>
            <div class="form-field">
              <label for="annulment-reason">Motivo de anulación</label
              ><cs-input
                id="annulment-reason"
                fieldSize="md"
                placeholder="Describe el motivo"
                [value]="annulmentReason()"
                (valueChange)="setAnnulmentReason($event)"
                [invalid]="annulmentReasonError() !== ''"
                [required]="true"
              />
              @if (annulmentReasonError()) {
                <p class="field-error" role="alert">{{ annulmentReasonError() }}</p>
              }
            </div>
          </div>
        }
      </cs-modal>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
      .capture-matrix {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: var(--layout-padding-5xl);
        /* Exploración visual: tono cálido inspirado en la referencia compartida. */
        background: #f8f5ed;
      }
      .page-header,
      .page-header__actions {
        display: flex;
        align-items: center;
      }
      .page-header {
        justify-content: space-between;
        gap: var(--layout-gap-xl);
        margin-bottom: var(--layout-gap-xs);
      }
      .page-header__content {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .page-header__actions {
        gap: var(--layout-gap-md);
      }
      h1,
      p {
        margin: 0;
      }
      h1 {
        color: var(--color-text-base-default);
        font-family: var(--font-family-heading);
        font-size: var(--font-size-heading-small);
        line-height: var(--font-line-height-heading-small);
      }
      .page-header__description {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .dialog-copy p,
      .empty-state p {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .matrix-section {
        display: grid;
        grid-template-rows: auto auto auto minmax(min-content, 1fr);
        flex: 1;
        gap: var(--layout-gap-2xl);
      }
      .table-summary {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .matrix-toolbar {
        display: grid;
        grid-template-columns: minmax(220px, 480px) max-content 220px;
        align-items: end;
        gap: var(--layout-gap-md);
      }
      .toolbar-field {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .toolbar-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .toolbar-field--status {
        inline-size: max-content;
      }
      .status-filter-control {
        display: flex;
      }
      .toolbar-field--date-range {
        inline-size: 220px;
        min-inline-size: 220px;
        max-inline-size: 220px;
      }
      .date-range-trigger {
        min-inline-size: 0;
      }
      .date-range-calendar-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--layout-padding-xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-base-subtle);
        cursor: pointer;
      }
      .date-range-calendar-button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .date-range-popover {
        --elevation-surface-default: var(--color-background-base);
        display: grid;
        inline-size: 257px;
        overflow: hidden;
        gap: 0;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background-color: var(--color-background-base);
        box-shadow: var(--shadow-xs);
      }
      .date-range-popover__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-block-size: var(--layout-size-md);
        padding-inline: var(--layout-padding-md);
        border-top: var(--layout-border-thin) solid var(--color-border-divider);
      }
      .table-utilities {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--layout-gap-md);
        margin: 0;
      }
      .table-utilities__trigger {
        display: inline-flex;
      }
      .capture-column-manager {
        color: var(--color-text-base-default);
        font-family: var(--font-family-content);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-regular);
      }
      .export-menu {
        display: grid;
        min-inline-size: 164px;
        padding: var(--layout-padding-xs);
      }
      .table-area {
        container-name: capture-orders-table-area;
        container-type: inline-size;
        display: grid;
        grid-template-rows: minmax(min-content, 1fr) auto;
        overflow: hidden;
        border: var(--layout-border-thin) solid var(--color-border-neutral-subtle);
        border-radius: var(--radius-lg);
        background: var(--elevation-surface-default);
      }
      .table-frame {
        min-width: 0;
        background: var(--elevation-surface-default);
      }
      .table-footer,
      .table-page-size,
      .table-pager {
        display: flex;
        align-items: center;
      }
      .table-footer {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: var(--layout-gap-xl);
        padding: var(--layout-padding-lg) var(--layout-padding-xl);
      }
      .table-page-size {
        justify-self: start;
        flex-shrink: 0;
        gap: var(--layout-gap-sm);
      }
      .table-page-size > span,
      .table-pager > span {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        font-weight: var(--font-weight-accent);
      }
      .table-pager {
        justify-self: end;
        gap: var(--layout-gap-md);
      }
      .empty-state {
        display: grid;
        justify-items: center;
        gap: var(--layout-gap-lg);
        padding: var(--layout-padding-4xl);
        color: var(--color-text-base-subtle);
        text-align: center;
      }
      .empty-state__message {
        display: grid;
        justify-items: center;
        gap: var(--layout-gap-md);
      }
      .empty-state__message > cs-icon {
        color: var(--color-text-brand-default);
      }
      .empty-state__message > div {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .empty-state strong {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-caption);
        line-height: var(--font-line-height-content-caption);
      }
      .row-action-trigger {
        display: inline-flex;
      }
      .row-action-menu {
        box-sizing: border-box;
        display: grid;
        width: 139px;
        max-width: calc(100vw - var(--layout-padding-2xl));
        padding: var(--layout-padding-xs);
      }
      .row-action-menu__heading {
        margin: 0;
        padding: var(--layout-padding-xs) var(--layout-padding-sm);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        font-weight: var(--font-weight-accent);
      }
      .row-action-menu__divider {
        height: var(--layout-border-thin);
        margin-block: var(--layout-padding-xs);
        background: var(--color-border-divider);
      }
      .feedback-toast {
        position: fixed;
        top: var(--layout-padding-2xl);
        right: var(--layout-padding-2xl);
        z-index: var(--elevation-z-index-toast);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: start;
        gap: var(--layout-gap-md);
        width: min(420px, calc(100vw - var(--layout-padding-4xl)));
        padding: var(--layout-padding-lg);
        border: var(--layout-border-thin) solid var(--color-border-success-default);
        border-radius: var(--radius-lg);
        background: var(--color-background-success-subtlest);
        box-shadow: var(--shadow-xl);
        color: var(--color-text-success-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .feedback-toast > p {
        margin: 0;
      }
      .feedback-toast.is-error {
        border-color: var(--color-border-danger-default);
        background: var(--color-background-danger-subtlest);
        color: var(--color-text-danger-default);
      }
      .feedback-toast.is-info {
        border-color: var(--color-border-brand-default);
        background: var(--color-background-brand-subtlest);
        color: var(--color-text-brand-default);
      }
      .feedback-toast__close {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--layout-padding-2xs);
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .feedback-toast__close:focus-visible {
        outline: none;
        box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused);
      }
      .dialog-content {
        display: grid;
        gap: var(--layout-gap-2xl);
        padding-block: var(--layout-padding-lg);
      }
      .dialog-content--reason {
        gap: var(--layout-gap-lg);
        padding-block: 0;
      }
      .confirmation-content p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .capture-form {
        margin: 0;
      }
      .field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--layout-gap-xl);
      }
      .unit-selection-grid,
      .case-received-grid {
        display: grid;
        grid-template-columns: 180px minmax(0, 1fr);
        align-items: start;
        gap: var(--layout-gap-lg);
      }
      .case-received-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .form-field {
        display: grid;
        gap: var(--layout-gap-xs);
      }
      .form-field > label {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        font-weight: var(--font-weight-accent);
      }
      .required-marker {
        margin-left: var(--layout-gap-2xs);
        color: var(--color-text-danger-default);
      }
      .field-error {
        margin: 0;
        color: var(--color-text-danger-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .status-timeline {
        display: grid;
        gap: var(--layout-gap-md);
      }
      .status-timeline ol {
        display: grid;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .status-timeline li {
        position: relative;
        display: grid;
        grid-template-columns: var(--layout-padding-xl) minmax(0, 1fr);
        column-gap: var(--layout-gap-md);
      }
      .status-timeline li:not(:last-child)::before {
        position: absolute;
        top: var(--layout-padding-lg);
        bottom: calc(var(--layout-padding-lg) * -1);
        left: calc(var(--layout-padding-sm) - var(--layout-border-thin));
        width: var(--layout-border-thin);
        background: var(--color-border-divider);
        content: '';
      }
      .status-timeline__marker {
        z-index: 1;
        align-self: start;
        box-sizing: border-box;
        display: block;
        width: var(--layout-padding-lg);
        height: var(--layout-padding-lg);
        margin-top: var(--layout-padding-2xs);
        border: var(--layout-border-thick) solid var(--color-border-neutral-default);
        border-radius: var(--radius-full);
        background: var(--elevation-surface-default);
      }
      .status-timeline li.is-current .status-timeline__marker {
        border-color: var(--color-border-brand-default);
        background: var(--color-background-brand-default);
      }
      .status-timeline__entry {
        display: grid;
        gap: var(--layout-gap-xs);
        padding-bottom: var(--layout-padding-xl);
      }
      .status-timeline__heading {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: var(--layout-gap-sm);
      }
      .status-timeline li:last-child .status-timeline__entry {
        padding-bottom: 0;
      }
      .status-timeline strong {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
      }
      .status-timeline span,
      .status-timeline time {
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      @media (max-width: 1080px) {
        .matrix-toolbar {
          grid-template-columns: minmax(220px, 1fr) max-content;
        }
        .toolbar-field--date-range {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 960px) {
        .capture-matrix {
          padding-inline: var(--layout-padding-3xl);
        }
        .page-header {
          align-items: stretch;
          flex-direction: column;
        }
        .page-header__actions {
          justify-content: flex-start;
        }
      }
      @media (max-width: 767px) {
        .capture-matrix {
          padding: var(--layout-padding-xl);
        }
        .page-header__actions {
          align-items: stretch;
          flex-direction: column;
        }
        .page-header cs-button {
          width: 100%;
        }
        .matrix-toolbar,
        .field-grid,
        .unit-selection-grid,
        .case-received-grid {
          grid-template-columns: 1fr;
        }
        .toolbar-field--status,
        .status-filter-control,
        .toolbar-field--date-range {
          inline-size: 100%;
          min-inline-size: 0;
          max-inline-size: none;
        }
        .table-utilities {
          justify-content: stretch;
          flex-direction: column;
        }
        .table-utilities__trigger,
        .table-utilities__trigger cs-button,
        .table-utilities cs-column-manager {
          width: 100%;
        }
        .table-footer {
          display: flex;
          align-items: flex-start;
          flex-direction: column;
          gap: var(--layout-gap-md);
        }
        .table-page-size,
        .table-pager {
          justify-self: auto;
        }
        .table-pager {
          justify-content: flex-start;
          overflow-x: auto;
          padding-bottom: var(--layout-padding-xs);
        }
      }
    `,
  ],
})
export class NewCaptureOrderPage implements AfterViewInit, OnDestroy {
  protected readonly sourceOptions: SelectOption[] = [
    { label: 'Centro de operaciones', value: 'Centro de operaciones' },
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Autoridad competente', value: 'Autoridad competente' },
    { label: 'Operación en campo', value: 'Operación en campo' },
  ];
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly statusOptions: InputDropdownOption[] = [
    { label: 'Todos los estados', value: '__all__' },
    ...CAPTURE_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
  ];
  protected readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
  protected readonly documentDefinitions = DOCUMENT_DEFINITIONS;
  protected readonly pageSizeOptions: InputDropdownOption[] = [10, 25, 50, 100].map((size) => ({
    label: `${size} por página`,
    value: String(size),
  }));
  protected readonly exportOptions: DropdownItem[] = [
    { label: 'Descargar PDF', value: 'pdf', icon: 'file-text' },
    { label: 'Descargar Excel', value: 'excel', icon: 'file-text' },
  ];
  @ViewChild('statusCell', { static: true }) private statusCellRef!: TemplateRef<unknown>;
  @ViewChild('unitCell', { static: true }) private unitCellRef!: TemplateRef<unknown>;
  @ViewChild('bulkErrorUnitCell', { static: true })
  private bulkErrorUnitCellRef!: TemplateRef<unknown>;
  @ViewChild('lastLocationCell', { static: true })
  private lastLocationCellRef!: TemplateRef<unknown>;
  @ViewChild('actionsCell', { static: true }) private actionsCellRef!: TemplateRef<unknown>;
  @ViewChild('captureOrdersTable', { read: ElementRef })
  private captureOrdersTableRef!: ElementRef<HTMLElement>;
  private readonly configurableTableColumns: readonly TableColumn[] = [
    { key: 'id', label: 'Orden', width: '128px', isSortable: true },
    { key: 'unit', label: 'Unidad', width: '128px', isSortable: true },
    { key: 'owner', label: 'Propietario', width: '144px', isSortable: true },
    { key: 'lastLocation', label: 'Última ubicación', isSortable: true },
    { key: 'source', label: 'Fuente', width: '176px', isSortable: true },
    { key: 'status', label: 'Estado', width: '160px', isSortable: true },
    { key: 'created', label: 'Registro', width: '176px', isSortable: true },
  ];
  private readonly actionsTableColumn: TableColumn = {
    key: 'actions',
    label: 'Acciones',
    width: '72px',
    align: 'center',
  };
  protected readonly bulkErrorColumns: TableColumn[] = [
    { key: 'row', label: 'Fila', width: '72px' },
    { key: 'unit', label: 'Unidad', width: '128px' },
    { key: 'reason', label: 'Motivo' },
  ];
  private readonly tableColumnMinWidths: Readonly<Record<string, number>> = {
    id: 128,
    unit: 128,
    owner: 144,
    lastLocation: 272,
    source: 176,
    status: 160,
    created: 176,
    actions: 72,
  };
  protected readonly draft = signal<CaptureOrderDraft>({
    unitCode: '',
    source: '',
    caseNumber: '',
    receivedOn: '',
    documents: [],
  });
  protected readonly errors = signal<Record<FormField, string>>({
    unitCode: '',
    source: '',
    caseNumber: '',
    receivedOn: '',
    documents: '',
  });
  protected readonly saving = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly confirmationOpen = signal(false);
  protected readonly message = signal('');
  protected readonly messageKind = signal<'success' | 'error' | 'info'>('success');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly unitTypeFilter = signal<UnitType[]>([]);
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly dateRangeOpen = signal(false);
  protected readonly exportMenuOpen = signal(false);
  protected readonly bulkUploadOpen = signal(false);
  protected readonly bulkUploadStage = signal<BulkUploadStage>('select');
  protected readonly bulkFileName = signal('');
  protected readonly bulkUploadError = signal('');
  protected readonly bulkLoadedCount = signal(0);
  protected readonly bulkValidationRows = signal<readonly BulkValidationRow[]>([]);
  protected readonly bulkErrorPage = signal(1);
  protected readonly copiedBulkUnitCode = signal<string | null>(null);
  protected readonly copiedLocation = signal<string | null>(null);
  protected readonly showActionsShadow = signal(false);
  protected readonly visibleColumnKeys = signal<string[]>(
    this.configurableTableColumns.map((column) => column.key),
  );
  protected readonly columnOrder = signal<string[]>(
    this.configurableTableColumns.map((column) => column.key),
  );
  protected readonly rowsPerPage = signal<RowsPerPage>(10);
  protected readonly page = signal(1);
  protected readonly sortKey = signal(DEFAULT_SORT.key);
  protected readonly sortOrder = signal<SortOrder>(DEFAULT_SORT.order);
  protected readonly today = this.localToday();
  protected readonly caseNumberPrefix = `EXP-${this.today.slice(0, 4)}-`;
  protected readonly selectedOrder = signal<CaptureOrder | null>(null);
  protected readonly detailsOpen = signal(false);
  protected readonly actionMenuOrderId = signal<string | null>(null);
  protected readonly editingOrder = signal<CaptureOrder | null>(null);
  protected readonly closingOrder = signal<CaptureOrder | null>(null);
  protected readonly closeOpen = signal(false);
  protected readonly observedOrder = signal<CaptureOrder | null>(null);
  protected readonly observationOpen = signal(false);
  protected readonly observationReason = signal('');
  protected readonly observationReasonError = signal('');
  protected readonly annulledOrder = signal<CaptureOrder | null>(null);
  protected readonly annulOpen = signal(false);
  protected readonly annulmentReason = signal('');
  protected readonly annulmentReasonError = signal('');
  protected readonly annulSecondaryAction = { label: 'Cancelar' };
  protected readonly closeSecondaryAction = { label: 'Cancelar' };
  protected readonly observationSecondaryAction = { label: 'Cancelar' };
  private feedbackTimeout?: number;
  private copyFeedbackTimeout?: number;
  private tableScrollCleanup?: () => void;
  protected readonly allOrders = computed(() => [
    ...this.orders.orders(),
    ...this.orders.fixtureOrders(),
  ]);
  protected readonly pendingDateRangeStart = computed(() =>
    this.dateFrom() && !this.dateTo() ? this.dateFrom() : '',
  );
  protected readonly selectedDateRange = computed(() =>
    this.dateFrom() && this.dateTo()
      ? ([this.dateFrom(), this.dateTo()] as [string, string])
      : undefined,
  );
  protected readonly dateRangeLabel = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from) return 'Selecciona un rango';
    if (!to) return `Desde ${this.formatFilterDate(from)}`;
    return `${this.formatFilterDate(from)} — ${this.formatFilterDate(to)}`;
  });
  protected readonly dateRangeInputValue = computed(() =>
    this.dateFrom() ? this.dateRangeLabel() : '',
  );
  protected readonly bulkValidRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'valid'),
  );
  protected readonly bulkRejectedRows = computed(() =>
    this.bulkValidationRows().filter((row) => row.outcome === 'rejected'),
  );
  protected readonly bulkErrorPages = computed(() =>
    Math.max(1, Math.ceil(this.bulkRejectedRows().length / BULK_ERROR_PAGE_SIZE)),
  );
  protected readonly bulkErrorTableRows = computed<TableRow[]>(() => {
    const start = (this.bulkErrorPage() - 1) * BULK_ERROR_PAGE_SIZE;
    return this.bulkRejectedRows()
      .slice(start, start + BULK_ERROR_PAGE_SIZE)
      .map((row) => ({
        key: `bulk-error-${row.row}`,
        cells: [
          String(row.row),
          { template: this.bulkErrorUnitCellRef, context: { $implicit: row } },
          row.reason ?? 'Requiere corrección.',
        ],
      }));
  });
  protected readonly bulkErrorSummary = computed(() => {
    const total = this.bulkRejectedRows().length;
    const start = (this.bulkErrorPage() - 1) * BULK_ERROR_PAGE_SIZE + 1;
    return `${start}–${Math.min(start + BULK_ERROR_PAGE_SIZE - 1, total)} de ${total} filas`;
  });
  protected readonly bulkPrimaryAction = computed(() => {
    const stage = this.bulkUploadStage();
    if (stage === 'review') return { label: `Cargar ${this.bulkValidRows().length} datos` };
    if (stage === 'uploading') return { label: 'Cargando datos', loading: true, disabled: true };
    if (stage === 'success') return { label: 'Cerrar' };
    return { label: 'Selecciona un archivo', disabled: true };
  });
  protected readonly bulkSecondaryAction = computed(() =>
    this.bulkUploadStage() === 'success' || this.bulkUploadStage() === 'uploading'
      ? undefined
      : { label: 'Cancelar' },
  );
  protected readonly columnManagerColumns = computed<ColumnManagerItem[]>(() => {
    const visibleColumns = new Set(this.visibleColumnKeys());
    return this.columnOrder().flatMap((key) => {
      const column = this.configurableTableColumns.find((item) => item.key === key);
      return column
        ? [{ key: column.key, label: column.label, visible: visibleColumns.has(key) }]
        : [];
    });
  });
  protected readonly tableColumns = computed<TableColumn[]>(() => {
    const visibleColumns = new Set(this.visibleColumnKeys());
    const configuredColumns = this.columnOrder().flatMap((key) => {
      const column = this.configurableTableColumns.find((item) => item.key === key);
      return column && visibleColumns.has(key) ? [column] : [];
    });
    return [...configuredColumns, this.actionsTableColumn];
  });
  protected readonly tableMinWidth = computed(
    () =>
      `${this.tableColumns().reduce(
        (total, column) => total + (this.tableColumnMinWidths[column.key] ?? 0),
        0,
      )}px`,
  );
  protected readonly filteredUnitOptions = computed(() => {
    const selectedTypes = this.unitTypeFilter();
    return selectedTypes.length
      ? this.unitOptions.filter((unit) => selectedTypes.includes(this.unitTypeOf(unit.code)))
      : this.unitOptions;
  });
  protected readonly selectedUnit = computed(() => {
    const unitCode = this.draft().unitCode;
    return this.unitOptions.find((unit) => unit.code === unitCode) ?? null;
  });
  protected readonly filteredOrders = computed(() => {
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
  protected readonly sortedOrders = computed(() => {
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
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedOrders().length / this.rowsPerPage())),
  );
  protected readonly visibleOrders = computed(() => {
    const start = (this.page() - 1) * this.rowsPerPage();
    return this.sortedOrders().slice(start, start + this.rowsPerPage());
  });
  protected readonly tableRows = computed<TableRow[]>(() =>
    this.visibleOrders().map((order) => ({
      key: order.id,
      cells: this.tableColumns().map((column) => this.tableCellFor(order, column.key)),
    })),
  );
  protected readonly tableSummary = computed(() => {
    if (this.orders.fixturesLoading()) return 'Cargando capturas';
    const total = this.filteredOrders().length;
    if (!total) return '0 registros';
    const first = (this.page() - 1) * this.rowsPerPage() + 1;
    return `${first}–${Math.min(first + this.rowsPerPage() - 1, total)} de ${total} registros`;
  });
  protected readonly sortDescription = computed(() => {
    const column = this.tableColumns().find(({ key }) => key === this.sortKey());
    return `Ordenado por ${column?.label ?? 'Registro'}, ${this.sortOrder() === 'asc' ? 'ascendente' : 'descendente'}.`;
  });
  protected readonly dialogTitle = computed(() =>
    this.editingOrder() ? 'Editar captura' : 'Registrar captura',
  );
  protected readonly detailsTitle = computed(() =>
    this.selectedOrder() ? `Detalle de ${this.selectedOrder()!.id}` : 'Detalle de captura',
  );
  protected readonly primaryAction = computed(() =>
    this.editingOrder()
      ? { label: 'Guardar cambios', icon: 'save' as const }
      : { label: 'Registrar captura', icon: 'file-text' as const },
  );
  protected readonly secondaryAction = { label: 'Cancelar' };
  protected readonly confirmationTitle = computed(() =>
    this.editingOrder() ? 'Confirmar cambios' : 'Confirmar registro',
  );
  protected readonly confirmationCopy = computed(() => {
    const draft = this.draft();
    const context = `Fuente: ${draft.source} · Fecha de recepción: ${this.formatConfirmationDate(draft.receivedOn)} · Documentos adjuntos: ${draft.documents.length}`;
    return this.editingOrder()
      ? `¿Confirmas guardar los cambios de la captura ${this.editingOrder()!.id} de la unidad ${draft.unitCode}? ${context}`
      : `¿Confirmas registrar la captura de la unidad ${draft.unitCode}? ${context}`;
  });
  protected readonly confirmationPrimaryAction = computed(() => ({
    label: this.editingOrder() ? 'Guardar cambios' : 'Confirmar registro',
    loading: this.saving(),
  }));
  protected readonly confirmationSecondaryAction = { label: 'Cancelar' };
  protected readonly annulPrimaryAction = computed(() => ({
    label: 'Anular captura',
    disabled: !this.annulmentReason().trim(),
    loading: this.saving(),
  }));
  protected readonly closePrimaryAction = computed(() => ({
    label: 'Cerrar captura',
    loading: this.saving(),
  }));
  protected readonly observationPrimaryAction = computed(() => ({
    label: 'Registrar observación',
    disabled: !this.observationReason().trim(),
    loading: this.saving(),
  }));
  constructor(protected readonly orders: MockCaptureOrdersService) {
    void this.orders.loadFixtureOrders();
  }
  ngAfterViewInit(): void {
    const scrollArea =
      this.captureOrdersTableRef.nativeElement.querySelector<HTMLElement>('.cs-table__wrap');
    if (!scrollArea) return;

    scrollArea.addEventListener('scroll', this.updateActionsShadow, { passive: true });
    const resizeObserver = new ResizeObserver(this.updateActionsShadow);
    resizeObserver.observe(scrollArea);
    requestAnimationFrame(this.updateActionsShadow);

    this.tableScrollCleanup = () => {
      scrollArea.removeEventListener('scroll', this.updateActionsShadow);
      resizeObserver.disconnect();
    };
  }
  private readonly updateActionsShadow = (): void => {
    const scrollArea =
      this.captureOrdersTableRef?.nativeElement.querySelector<HTMLElement>('.cs-table__wrap');
    if (!scrollArea) {
      this.showActionsShadow.set(false);
      return;
    }
    const remainingWidth = scrollArea.scrollWidth - scrollArea.clientWidth - scrollArea.scrollLeft;
    this.showActionsShadow.set(remainingWidth > 1);
  };
  protected readonly onUnitSelected = (unitCode: string): void =>
    this.setField('unitCode', unitCode);
  protected asText(value: string | string[]): string {
    return typeof value === 'string' ? value : '';
  }
  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }
  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value === '__all__' ? '' : value);
    this.page.set(1);
  }
  protected setUnitTypeFilter(value: readonly string[]): void {
    const nextTypes = value.filter((type): type is UnitType =>
      UNIT_TYPE_OPTIONS.some((option) => option.value === type),
    );
    this.unitTypeFilter.set(nextTypes);
    const selectedUnit = this.draft().unitCode;
    if (selectedUnit && nextTypes.length && !nextTypes.includes(this.unitTypeOf(selectedUnit)))
      this.setField('unitCode', '');
  }
  protected openDateRangePicker(): void {
    this.dateRangeOpen.set(true);
  }
  protected toggleDateRangePicker(): void {
    this.dateRangeOpen.update((isOpen) => !isOpen);
  }
  protected closeDateRangePicker(): void {
    this.dateRangeOpen.set(false);
  }
  protected selectDateRangeDate(value: string): void {
    const from = this.dateFrom();
    if (!from || this.dateTo()) {
      this.dateFrom.set(value);
      this.dateTo.set('');
      return;
    }
    const [start, end] = [from, value].sort();
    this.dateFrom.set(start);
    this.dateTo.set(end);
    this.dateRangeOpen.set(false);
    this.page.set(1);
  }
  protected clearDateRange(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
  }
  protected rowsPerPageValue(): string {
    return String(this.rowsPerPage());
  }
  protected setRowsPerPage(value: string): void {
    const size = Number(value);
    this.rowsPerPage.set(
      ([10, 25, 50, 100] as const).includes(size as RowsPerPage) ? (size as RowsPerPage) : 10,
    );
    this.page.set(1);
  }
  protected setVisibleColumns(keys: string[]): void {
    const allowedKeys = new Set(this.configurableTableColumns.map((column) => column.key));
    const visibleKeys = keys.filter((key) => allowedKeys.has(key));
    if (visibleKeys.length < 3) return;
    this.visibleColumnKeys.set(visibleKeys);
    requestAnimationFrame(this.updateActionsShadow);
  }
  protected setColumnOrder(keys: string[]): void {
    const allowedKeys = new Set(this.configurableTableColumns.map((column) => column.key));
    const orderedKeys = keys.filter((key) => allowedKeys.has(key));
    const missingKeys = this.configurableTableColumns
      .map((column) => column.key)
      .filter((key) => !orderedKeys.includes(key));
    this.columnOrder.set([...orderedKeys, ...missingKeys]);
  }
  protected setPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }
  protected retryFixtureLoad(): void {
    void this.orders.loadFixtureOrders();
  }
  protected setSort(key: string): void {
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
  protected openDetails(order: CaptureOrder): void {
    this.selectedOrder.set(order);
    this.detailsOpen.set(true);
  }
  protected closeDetails(): void {
    this.detailsOpen.set(false);
  }
  protected closeFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openCloseConfirmation(order), 220);
  }
  protected annulFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openAnnulment(order), 220);
  }
  protected observeFromDetails(order: CaptureOrder): void {
    this.closeDetails();
    window.setTimeout(() => this.openObservation(order), 220);
  }
  protected actionItems(order: CaptureOrder): DropdownItem[] {
    const items: DropdownItem[] = [{ label: 'Ver detalle', value: 'view', icon: 'eye' }];
    if (this.canEdit(order)) items.push({ label: 'Editar', value: 'edit', icon: 'pencil' });
    if (this.canClose(order)) items.push({ label: 'Cerrar captura', value: 'close', icon: 'lock' });
    if (this.canObserve(order)) {
      items.push({ label: 'Observar captura', value: 'observe', icon: 'alert-triangle' });
    }
    if (this.canAnnul(order)) {
      items[items.length - 1].dividerAfter = true;
      items.push({ label: 'Anular captura', value: 'annul', icon: 'x', variant: 'destructive' });
    }
    return items;
  }
  protected toggleActionMenu(orderId: string): void {
    this.actionMenuOrderId.update((activeId) => (activeId === orderId ? null : orderId));
  }
  protected closeActionMenu(): void {
    this.actionMenuOrderId.set(null);
  }
  protected runAction(order: CaptureOrder, item: DropdownItem): void {
    this.closeActionMenu();
    if (item.value === 'view') this.openDetails(order);
    if (item.value === 'edit') this.openEdit(order);
    if (item.value === 'close') this.openCloseConfirmation(order);
    if (item.value === 'observe') this.openObservation(order);
    if (item.value === 'annul') this.openAnnulment(order);
  }
  protected statusEntries(order: CaptureOrder): CaptureOrderAuditEntry[] {
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
  protected statusSeverity(status: string): TagSeverity {
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
  private tableCellFor(order: CaptureOrder, key: string): TableRow['cells'][number] {
    switch (key) {
      case 'id':
        return order.id;
      case 'unit':
        return { template: this.unitCellRef, context: { $implicit: order } };
      case 'owner':
        return this.ownerOf(order.unitCode);
      case 'lastLocation':
        return { template: this.lastLocationCellRef, context: { $implicit: order } };
      case 'source':
        return order.source;
      case 'status':
        return { template: this.statusCellRef, context: { $implicit: order.status } };
      case 'created':
        return order.createdAt;
      case 'actions':
        return { template: this.actionsCellRef, context: { $implicit: order } };
      default:
        return '';
    }
  }
  private unitTypeOf(unitCode: string): UnitType {
    const prefix = unitCode.split('-', 1)[0];
    return (UNIT_TYPE_OPTIONS.some((type) => type.value === prefix) ? prefix : 'VHC') as UnitType;
  }
  protected unitIconOf(unitCode: string): IconName {
    const selectedUnit = this.unitOptions.find((unit) => unit.code === unitCode);
    if (selectedUnit) return selectedUnit.icon;

    const type = this.unitTypeOf(unitCode);
    return type === 'BUS' ? 'bus' : type === 'VHC' ? 'car' : 'truck';
  }
  protected ownerOf(unitCode: string): string {
    const selectedUnit = this.unitOptions.find((unit) => unit.code === unitCode);
    if (selectedUnit) return selectedUnit.owner;

    const sequence = Number(unitCode.split('-')[1]);
    return DEMO_OWNERS[Math.abs(Number.isFinite(sequence) ? sequence : 0) % DEMO_OWNERS.length];
  }
  protected locationOf(unitCode: string): UnitOption | null {
    const knownUnit = this.unitOptions.find((unit) => unit.code === unitCode);
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
  protected formatReceivedDate(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : 'No disponible';
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
  private formatFilterDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }
  protected toggleExportMenu(): void {
    this.exportMenuOpen.update((isOpen) => !isOpen);
  }
  protected closeExportMenu(): void {
    this.exportMenuOpen.set(false);
  }
  protected requestExport(item: DropdownItem): void {
    this.closeExportMenu();
    const format = item.value === 'excel' ? 'Excel' : 'PDF';
    this.showMessage('info', `La descarga en ${format} usará los filtros y el orden actuales.`);
  }
  protected openBulkUpload(): void {
    this.dismissMessage();
    this.bulkUploadStage.set('select');
    this.bulkFileName.set('');
    this.bulkUploadError.set('');
    this.bulkLoadedCount.set(0);
    this.bulkValidationRows.set([]);
    this.bulkErrorPage.set(1);
    this.bulkUploadOpen.set(true);
  }
  protected closeBulkUpload(): void {
    if (this.bulkUploadStage() !== 'uploading') this.bulkUploadOpen.set(false);
  }
  protected allowBulkDrop(event: DragEvent): void {
    event.preventDefault();
  }
  protected dropBulkFile(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0);
    if (file) this.validateBulkFile(file);
  }
  protected selectBulkFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (file) this.validateBulkFile(file);
  }
  protected downloadBulkTemplate(): void {
    const template = `\uFEFF${[
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
  protected runBulkPrimaryAction(): void {
    if (this.bulkUploadStage() === 'review') void this.uploadBulkRows();
    if (this.bulkUploadStage() === 'success') this.closeBulkUpload();
  }
  protected setBulkErrorPage(page: number): void {
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
    const result = await this.orders.createBulk(
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
  protected openForm(): void {
    this.dismissMessage();
    this.confirmationOpen.set(false);
    this.editingOrder.set(null);
    this.unitTypeFilter.set([]);
    this.draft.set(this.emptyDraft());
    this.errors.set(this.emptyErrors());
    this.formOpen.set(true);
  }
  protected openEdit(order: CaptureOrder): void {
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
  protected closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
      this.editingOrder.set(null);
    }
  }
  protected dismissMessage(): void {
    if (this.feedbackTimeout !== undefined) window.clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = undefined;
    this.message.set('');
  }
  ngOnDestroy(): void {
    this.tableScrollCleanup?.();
    this.dismissMessage();
    if (this.copyFeedbackTimeout !== undefined) window.clearTimeout(this.copyFeedbackTimeout);
  }
  protected async copyBulkUnitCode(unitCode: string): Promise<void> {
    if (!(await this.copyText(unitCode))) return;
    this.copiedLocation.set(null);
    this.copiedBulkUnitCode.set(unitCode);
    this.resetCopyFeedback();
  }
  protected async copyLastLocation(location: string): Promise<void> {
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
  protected setField(field: DraftField, value: string): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.errors.update((errors) => ({ ...errors, [field]: '' }));
  }
  protected setCaseNumber(value: string): void {
    const suffix = value.startsWith(this.caseNumberPrefix)
      ? value.slice(this.caseNumberPrefix.length)
      : value.replace(/^EXP-\d{4}-?/i, '');
    this.setField('caseNumber', `${this.caseNumberPrefix}${suffix.replace(/\D/g, '')}`);
  }
  protected uploadedDocument(type: CaptureDocumentType): CaptureOrderDocument | undefined {
    return this.draft().documents.find((document) => document.type === type);
  }
  protected documentLabel(type: CaptureDocumentType): string {
    return (
      this.documentDefinitions.find((document) => document.type === type)?.label ?? 'Documento'
    );
  }
  protected selectDocument(type: CaptureDocumentType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.errors.update((errors) => ({
        ...errors,
        documents: 'Adjunta documentos en formato PDF.',
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errors.update((errors) => ({
        ...errors,
        documents: 'Cada documento puede tener un tamaño máximo de 10 MB.',
      }));
      return;
    }
    const nextDocument: CaptureOrderDocument = { type, fileName: file.name, fileSize: file.size };
    this.draft.update((draft) => ({
      ...draft,
      documents: [...draft.documents.filter((document) => document.type !== type), nextDocument],
    }));
    this.errors.update((errors) => ({ ...errors, documents: '' }));
  }
  protected removeDocument(type: CaptureDocumentType): void {
    this.draft.update((draft) => ({
      ...draft,
      documents: draft.documents.filter((document) => document.type !== type),
    }));
  }
  protected formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  protected requestSubmission(event?: Event): void {
    event?.preventDefault();
    if (!this.validate()) return;
    if (this.orders.hasActiveCaptureOrder(this.draft().unitCode, this.editingOrder()?.id)) {
      this.errors.update((errors) => ({
        ...errors,
        unitCode: 'Esta unidad ya tiene una orden de captura registrada.',
      }));
      return;
    }
    this.formOpen.set(false);
    this.confirmationOpen.set(true);
  }
  protected closeConfirmation(): void {
    if (this.saving()) return;
    this.confirmationOpen.set(false);
    this.formOpen.set(true);
  }
  protected confirmSubmission(): void {
    void this.register();
  }
  protected openAnnulment(order: CaptureOrder): void {
    if (!this.canAnnul(order)) return;
    this.annulledOrder.set(order);
    this.annulmentReason.set('');
    this.annulmentReasonError.set('');
    this.annulOpen.set(true);
  }
  protected openObservation(order: CaptureOrder): void {
    if (!this.canObserve(order)) return;
    this.observedOrder.set(order);
    this.observationReason.set('');
    this.observationReasonError.set('');
    this.observationOpen.set(true);
  }
  protected openCloseConfirmation(order: CaptureOrder): void {
    if (!this.canClose(order)) return;
    this.closingOrder.set(order);
    this.closeOpen.set(true);
  }
  protected closeCloseConfirmation(): void {
    if (this.saving()) return;
    this.closeOpen.set(false);
    this.closingOrder.set(null);
  }
  protected async confirmClose(): Promise<void> {
    const order = this.closingOrder();
    if (!order) return;
    this.saving.set(true);
    const result = await this.orders.close(order.id);
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
  protected closeAnnulment(): void {
    if (!this.saving()) {
      this.annulOpen.set(false);
      this.annulledOrder.set(null);
      this.annulmentReason.set('');
      this.annulmentReasonError.set('');
    }
  }
  protected closeObservation(): void {
    if (this.saving()) return;
    this.observationOpen.set(false);
    this.observedOrder.set(null);
    this.observationReason.set('');
    this.observationReasonError.set('');
  }
  protected setObservationReason(value: string): void {
    this.observationReason.set(value);
    this.observationReasonError.set('');
  }
  protected async confirmObservation(): Promise<void> {
    const order = this.observedOrder();
    if (!order) return;
    if (!this.observationReason().trim()) {
      this.observationReasonError.set('Describe la observación.');
      return;
    }

    this.saving.set(true);
    const result = await this.orders.observe(order.id, this.observationReason());
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.observationReasonError.set(result.message);
      return;
    }

    this.closeObservation();
    this.selectedOrder.set(result.order);
    this.showMessage('success', `La orden ${result.order.id} quedó con observación.`);
  }
  protected setAnnulmentReason(value: string): void {
    this.annulmentReason.set(value);
    this.annulmentReasonError.set('');
  }
  protected async confirmAnnulment(): Promise<void> {
    const order = this.annulledOrder();
    if (!order) return;
    if (!this.annulmentReason().trim()) {
      this.annulmentReasonError.set('Describe el motivo de anulación.');
      return;
    }
    this.saving.set(true);
    const result = await this.orders.annul(order.id, this.annulmentReason());
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
  private async register(): Promise<void> {
    this.saving.set(true);
    const editing = this.editingOrder();
    const result = editing
      ? await this.orders.update(editing.id, this.draft())
      : await this.orders.create(this.draft());
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
    const hasAllDocuments = this.documentDefinitions.every((definition) =>
      draft.documents.some((document) => document.type === definition.type),
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
  private showMessage(kind: 'success' | 'error' | 'info', message: string): void {
    this.dismissMessage();
    this.messageKind.set(kind);
    this.message.set(message);
    if (kind !== 'error')
      this.feedbackTimeout = window.setTimeout(() => this.dismissMessage(), 4000);
  }
  protected canEdit(order: CaptureOrder): boolean {
    return order.status === 'Registrada' || order.status === 'Con observación';
  }
  protected canClose(order: CaptureOrder): boolean {
    return order.status === 'Registrada';
  }
  protected canObserve(order: CaptureOrder): boolean {
    return order.status === 'Registrada' || order.status === 'En revisión';
  }
  protected canAnnul(order: CaptureOrder): boolean {
    return order.status !== 'Cerrada' && order.status !== 'Anulada';
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
}
