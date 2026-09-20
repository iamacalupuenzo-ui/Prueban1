import { Component, OnDestroy, TemplateRef, ViewChild, computed, signal } from '@angular/core';
import { Button, Calendar, DropdownItemComponent, Icon, Input, InputDropdown, InputDropdownOption, InputGroup, InputGroupAddon, InputGroupInput, Modal, Pagination, Popover, Select, SelectOption, SortOrder, Table, TableColumn, TableRow, Tag, type DropdownItem, type TagSeverity } from '@iamacalupuenzo-ui/comsatel-ds';
import { CAPTURE_ORDER_STATUSES, CaptureOrder, CaptureOrderDraft, MockCaptureOrdersService } from '../../core/orders/mock-capture-orders.service';
import { SideDrawerComponent } from '../../shared/side-drawer.component';
import { UnitAutocompleteComponent, UnitOption } from './unit-autocomplete.component';
import { UnitTypeFilterOption, UnitTypeMultiSelectComponent } from './unit-type-multi-select.component';

type DraftField = keyof CaptureOrderDraft;
type RowsPerPage = 10 | 25 | 50 | 100;
type UnitType = 'VHC' | 'TRK' | 'VAN' | 'BUS';

const DEFAULT_SORT = { key: 'created', order: 'desc' as const };

const UNIT_TYPE_OPTIONS: ReadonlyArray<UnitTypeFilterOption & { value: UnitType }> = [
  { label: 'Van de distribución', value: 'VHC' },
  { label: 'Camión rígido', value: 'TRK' },
  { label: 'Furgón operativo', value: 'VAN' },
  { label: 'Bus de personal', value: 'BUS' },
];

const UNIT_OPTIONS: UnitOption[] = [
  { code: 'VHC-1024', description: 'Van de distribución — Lima centro' },
  { code: 'VHC-1041', description: 'Van de distribución — Lima norte' },
  { code: 'VHC-1158', description: 'Van de distribución — Callao' },
  { code: 'TRK-2087', description: 'Camión rígido — Lima sur' },
  { code: 'TRK-2143', description: 'Camión rígido — Huancayo' },
  { code: 'TRK-2206', description: 'Camión rígido — Arequipa' },
  { code: 'VAN-0412', description: 'Furgón operativo — Cusco' },
  { code: 'VAN-0534', description: 'Furgón operativo — Trujillo' },
  { code: 'BUS-0379', description: 'Bus de personal — Lima este' },
];

@Component({
  imports: [Button, Calendar, DropdownItemComponent, Icon, Input, InputDropdown, InputGroup, InputGroupAddon, InputGroupInput, Modal, Pagination, Popover, Select, SideDrawerComponent, Table, Tag, UnitAutocompleteComponent, UnitTypeMultiSelectComponent],
  template: `
    <ng-template #statusCell let-status><cs-tag [value]="status" [severity]="statusSeverity(status)" [rounded]="true" size="lg" /></ng-template>
    <ng-template #actionsCell let-order>
      <span #actionTrigger class="row-action-trigger"><cs-button variant="subtle" size="sm" [aria-label]="'Acciones para ' + order.id" (click)="toggleActionMenu(order.id)"><cs-icon name="more-horizontal" [size]="16" aria-hidden="true" /></cs-button></span>
      <cs-popover [isOpen]="actionMenuOrderId() === order.id" [triggerRef]="actionTrigger" placement="bottom-end" role="menu" [ariaLabel]="'Acciones para ' + order.id" (closed)="closeActionMenu()"><div class="row-action-menu"><p class="row-action-menu__heading">Acciones</p><div class="row-action-menu__divider" aria-hidden="true"></div>@for (item of actionItems(order); track item.value) { <cs-dropdown-item [item]="item" size="sm" selectionMode="none" (itemSelect)="runAction(order, $event)" />@if (item.dividerAfter) { <div class="row-action-menu__divider" aria-hidden="true"></div> } }</div></cs-popover>
    </ng-template>
    <main class="capture-matrix" aria-labelledby="capture-title">
      @if (message()) {
        <div class="feedback-toast" [class.is-error]="messageKind() === 'error'" [class.is-info]="messageKind() === 'info'" [attr.role]="messageKind() === 'error' ? 'alert' : 'status'" aria-live="polite">
          <cs-icon [name]="messageKind() === 'error' ? 'circle-alert' : messageKind() === 'info' ? 'circle-help' : 'circle-check'" [size]="20" aria-hidden="true" />
          <p>{{ message() }}</p>
          <button type="button" class="feedback-toast__close" aria-label="Cerrar notificación" (click)="dismissMessage()"><cs-icon name="x" [size]="16" aria-hidden="true" /></button>
        </div>
      }
      <section class="matrix-section" aria-labelledby="capture-title">
        <header class="page-header">
          <div class="page-header__content"><h1 id="capture-title">Capturas</h1><p class="page-header__description">Consulta y gestiona las órdenes de captura registradas para las unidades.</p></div>
          <div class="page-header__actions"><cs-button variant="default" size="sm" (click)="showBulkUploadNotice()"><cs-icon name="layers" [size]="16" aria-hidden="true" />Carga masiva de recuperos</cs-button><cs-button variant="primary" size="sm" (click)="openForm()"><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar captura</cs-button></div>
        </header>
        <div class="matrix-toolbar" aria-label="Filtros de la matriz de capturas">
          <div class="toolbar-field"><label for="capture-search">Buscar orden o unidad</label><cs-input-group><cs-input-group-addon><cs-icon name="search" [size]="16" style="color: var(--color-text-base-subtlest)" aria-hidden="true" /></cs-input-group-addon><cs-input-group-input id="capture-search" fieldSize="md" type="search" placeholder="Buscar por orden o unidad" [value]="searchTerm()" (valueChange)="setSearchTerm($event)" /></cs-input-group></div>
          <div class="toolbar-field toolbar-field--status"><label id="capture-status-label">Estado</label><cs-input-dropdown class="status-filter-control" [fullWidth]="true" aria-labelledby="capture-status-label" placeholder="Todos los estados" size="md" [options]="statusOptions" [value]="statusFilter()" (valueChange)="setStatusFilter($event)" /></div>
          <div class="toolbar-field toolbar-field--date-range"><label id="capture-date-range-label" for="capture-date-range">Fecha de registro</label><div #captureDateTrigger class="date-range-trigger"><cs-input-group><cs-input-group-input id="capture-date-range" fieldSize="md" [readonly]="true" [value]="dateRangeInputValue()" placeholder="Selecciona un rango" ariaHasPopup="dialog" [ariaExpanded]="dateRangeOpen()" ariaControls="capture-date-range-calendar" ariaLabelledby="capture-date-range-label" (focused)="openDateRangePicker()" (enterKey)="toggleDateRangePicker()" (escapeKey)="closeDateRangePicker()" /><cs-input-group-addon align="inline-end" [compact]="true"><button type="button" class="date-range-calendar-button" aria-label="Abrir calendario de rango" [attr.aria-expanded]="dateRangeOpen()" aria-controls="capture-date-range-calendar" (click)="toggleDateRangePicker()"><cs-icon name="calendar" [size]="16" aria-hidden="true" /></button></cs-input-group-addon></cs-input-group></div><cs-popover [isOpen]="dateRangeOpen()" [triggerRef]="captureDateTrigger" placement="bottom-start" role="dialog" ariaLabel="Seleccionar rango de fechas de registro" [bare]="true" (closed)="closeDateRangePicker()"><div id="capture-date-range-calendar" class="date-range-popover"><cs-calendar [selected]="pendingDateRangeStart() ? [pendingDateRangeStart()!] : []" [rangeSelected]="selectedDateRange()" [weekStartDay]="1" ariaLabelledby="capture-date-range-label" (dateChange)="selectDateRangeDate($event)" /><div class="date-range-popover__actions"><cs-button variant="subtle" size="sm" [disabled]="!dateFrom()" (click)="clearDateRange()">Limpiar</cs-button></div></div></cs-popover></div>
        </div>
        <div class="table-utilities"><span #exportTrigger class="table-utilities__trigger"><cs-button variant="default" size="sm" [attr.aria-expanded]="exportMenuOpen()" aria-controls="capture-export-menu" (click)="toggleExportMenu()"><cs-icon name="download" [size]="16" aria-hidden="true" />Descargar<cs-icon name="chevron-down" [size]="16" aria-hidden="true" /></cs-button></span><cs-popover [isOpen]="exportMenuOpen()" [triggerRef]="exportTrigger" placement="bottom-end" role="menu" ariaLabel="Formatos de descarga" (closed)="closeExportMenu()"><div id="capture-export-menu" class="export-menu">@for (item of exportOptions; track item.value) { <cs-dropdown-item [item]="item" size="sm" selectionMode="none" (itemSelect)="requestExport($event)" /> }</div></cs-popover></div>
        <div class="table-area">
            <div class="table-frame"><cs-table class="capture-orders-table" [columns]="tableColumns" [rows]="tableRows()" [sortKey]="sortKey()" [sortOrder]="sortOrder()" caption="Matriz de órdenes de captura" [isLoading]="saving() || orders.fixturesLoading()" minWidth="840px" (sort)="setSort($event)"><div emptyState class="empty-state" role="status"><div class="empty-state__message"><cs-icon name="file-text" [size]="40" aria-hidden="true" /><div><strong>{{ orders.fixturesError() || 'No encontramos capturas' }}</strong><p>{{ orders.fixturesError() ? 'Verifica tu conexión e inténtalo nuevamente.' : 'Prueba con otra orden, unidad o estado.' }}</p></div></div>@if (orders.fixturesError()) { <cs-button variant="secondary" size="sm" (click)="retryFixtureLoad()">Reintentar</cs-button> } @else { <cs-button variant="secondary" size="sm" (click)="openForm()"><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar captura</cs-button> }</div></cs-table><p class="visually-hidden" role="status" aria-live="polite">{{ sortDescription() }}</p></div>
            <div class="table-footer">
              <div class="table-page-size"><span>Filas</span><cs-input-dropdown aria-label="Filas por página" size="sm" [options]="pageSizeOptions" [value]="rowsPerPageValue()" (valueChange)="setRowsPerPage($event)" /></div>
              <p class="table-summary" role="status" aria-live="polite">{{ tableSummary() }}</p>
              <div class="table-pager"><span>Página {{ page() }} de {{ totalPages() }}</span>@if (filteredOrders().length > rowsPerPage()) { <cs-pagination [totalPages]="totalPages()" [page]="page()" (pageChange)="setPage($event)" /> }</div>
            </div>
        </div>
      </section>
      <app-side-drawer [isOpen]="formOpen()" [title]="dialogTitle()" [primaryAction]="primaryAction()" [secondaryAction]="secondaryAction" (primaryActionClick)="requestSubmission()" (secondaryActionClick)="closeForm()" (closed)="closeForm()">
        <div class="dialog-content">
          <form class="capture-form" (submit)="requestSubmission($event)" novalidate>
            <div class="field-grid">
              <div class="unit-selection-grid">
                <app-unit-type-multi-select inputId="unit-type" label="Tipo de unidad" placeholder="Todos los tipos" [options]="unitTypeOptions" [value]="unitTypeFilter()" (valueChange)="setUnitTypeFilter($event)" />
                <app-unit-autocomplete inputId="unit-code" label="Código de unidad" [options]="filteredUnitOptions()" [value]="draft().unitCode" placeholder="Escribe 3 caracteres para buscar" [invalid]="errors().unitCode !== ''" [errorText]="errors().unitCode" [required]="true" (valueChange)="onUnitSelected($event)" />
              </div>
              <div class="form-field"><cs-select class="capture-source-select" label="Fuente de la orden" placeholder="Selecciona una fuente" size="md" [options]="sourceOptions" [value]="draft().source" (valueChange)="setField('source', asText($event))" [required]="true" />@if (errors().source) { <p class="field-error" role="alert">{{ errors().source }}</p> }</div>
              <div class="form-field"><label for="case-number">N.º de expediente <span class="required-marker" aria-hidden="true">*</span></label><cs-input id="case-number" name="case-number" fieldSize="md" placeholder="{{ caseNumberPrefix }}0000" autocomplete="off" [value]="draft().caseNumber" (valueChange)="setCaseNumber($event)" [invalid]="errors().caseNumber !== ''" aria-errormessage="case-number-error" [required]="true" />@if (errors().caseNumber) { <p id="case-number-error" class="field-error">{{ errors().caseNumber }}</p> }</div>
              <div class="form-field"><label for="received-on">Fecha de recepción <span class="required-marker" aria-hidden="true">*</span></label><cs-input id="received-on" name="received-on" type="date" fieldSize="md" [max]="today" [value]="draft().receivedOn" (valueChange)="setField('receivedOn', $event)" [invalid]="errors().receivedOn !== ''" aria-errormessage="received-on-error" [required]="true" />@if (errors().receivedOn) { <p id="received-on-error" class="field-error">{{ errors().receivedOn }}</p> }</div>
            </div>
          </form>
        </div>
      </app-side-drawer>
      <cs-modal class="capture-confirmation-modal" [isOpen]="confirmationOpen()" [title]="confirmationTitle()" width="sm" [primaryAction]="confirmationPrimaryAction()" [secondaryAction]="confirmationSecondaryAction" (primaryActionClick)="confirmSubmission()" (secondaryActionClick)="closeConfirmation()" (closed)="closeConfirmation()"><div class="confirmation-content"><p>{{ confirmationCopy() }}</p></div></cs-modal>
      <app-side-drawer [isOpen]="detailsOpen()" [title]="detailsTitle()" (closed)="closeDetails()">
        @if (selectedOrder(); as order) { <div class="details-content"><dl class="review-list"><div><dt>Orden</dt><dd>{{ order.id }}</dd></div><div><dt>Unidad</dt><dd>{{ order.unitCode }}</dd></div><div><dt>Fuente</dt><dd>{{ order.source }}</dd></div><div><dt>Estado</dt><dd>{{ order.status }}</dd></div><div><dt>Expediente</dt><dd>{{ order.caseNumber }}</dd></div><div><dt>Registro</dt><dd>{{ order.createdAt }}</dd></div>@if (order.annulmentReason) { <div><dt>Motivo de anulación</dt><dd>{{ order.annulmentReason }}</dd></div> }</dl><section class="status-timeline" aria-labelledby="status-timeline-title"><h2 id="status-timeline-title">Estado de la orden</h2><ol>@for (entry of statusEntries(order); track entry.action + entry.at; let isCurrent = $last) { <li [class.is-current]="isCurrent"><span class="status-timeline__marker" aria-hidden="true"></span><div class="status-timeline__entry"><strong>{{ entry.action }}</strong><span>{{ entry.detail }}</span><time>{{ entry.at }}</time></div></li> }</ol></section></div> }
      </app-side-drawer>
      <cs-modal [isOpen]="annulOpen()" title="Anular captura" appearance="danger" width="md" [primaryAction]="annulPrimaryAction()" [secondaryAction]="annulSecondaryAction" (primaryActionClick)="confirmAnnulment()" (secondaryActionClick)="closeAnnulment()" (closed)="closeAnnulment()">
        @if (annulledOrder(); as order) { <div class="dialog-content"><div class="dialog-copy"><p>Anularás la orden {{ order.id }}. El registro seguirá disponible para consulta junto con el motivo y el historial de esta acción.</p></div><div class="form-field"><label for="annulment-reason">Motivo de anulación</label><cs-input id="annulment-reason" fieldSize="md" placeholder="Describe el motivo" [value]="annulmentReason()" (valueChange)="setAnnulmentReason($event)" [invalid]="annulmentReasonError() !== ''" [required]="true" />@if (annulmentReasonError()) { <p class="field-error" role="alert">{{ annulmentReasonError() }}</p> }</div></div> }
      </cs-modal>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100%; }
    .capture-matrix { display: grid; align-content: start; min-height: 100%; gap: var(--layout-gap-xl); padding: var(--layout-padding-5xl); background: var(--color-background-neutral-subtlest); }
    .page-header, .page-header__actions { display: flex; align-items: center; } .page-header { justify-content: space-between; gap: var(--layout-gap-xl); margin-bottom: var(--layout-gap-xs); } .page-header__content { display: grid; gap: var(--layout-gap-xs); } .page-header__actions { gap: var(--layout-gap-md); } h1, p { margin: 0; }
    h1 { color: var(--color-text-base-default); font-family: var(--font-family-heading); font-size: var(--font-size-heading-small); line-height: var(--font-line-height-heading-small); } .page-header__description { color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
    .dialog-copy p, .empty-state p { color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .matrix-section { display: grid; gap: var(--layout-gap-2xl); } .table-summary { margin: 0; color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); } .matrix-toolbar { display: grid; grid-template-columns: minmax(220px, 480px) 180px 257px; align-items: end; gap: var(--layout-gap-md); } .toolbar-field { display: grid; gap: var(--layout-gap-xs); } .toolbar-field > label { color: var(--color-text-base-default); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); font-weight: var(--font-weight-accent); } .toolbar-field--status { inline-size: 180px; min-inline-size: 180px; max-inline-size: 180px; } .status-filter-control { display: flex; flex: 0 0 180px; inline-size: 180px; min-inline-size: 180px; max-inline-size: 180px; } .toolbar-field--date-range { inline-size: 257px; min-inline-size: 257px; max-inline-size: 257px; } .date-range-trigger { min-inline-size: 0; } .date-range-calendar-button { display: inline-flex; align-items: center; justify-content: center; padding: var(--layout-padding-xs); border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text-base-subtle); cursor: pointer; } .date-range-calendar-button:focus-visible { outline: none; box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused); } .date-range-popover { display: grid; inline-size: 257px; gap: 0; } .date-range-popover__actions { display: flex; align-items: center; justify-content: flex-end; min-block-size: var(--layout-size-md); padding-inline: var(--layout-padding-md); border-top: var(--layout-border-thin) solid var(--color-border-divider); } .table-utilities { display: flex; justify-content: flex-end; margin-top: calc(var(--layout-gap-xl) * -1); } .table-utilities__trigger { display: inline-flex; } .export-menu { display: grid; min-inline-size: 164px; padding: var(--layout-padding-xs); } .table-area { container-name: capture-orders-table-area; container-type: inline-size; overflow: hidden; border: var(--layout-border-thin) solid var(--color-border-neutral-subtle); border-radius: var(--radius-lg); background: var(--elevation-surface-default); } .table-frame { min-width: 0; } .table-footer, .table-page-size, .table-pager { display: flex; align-items: center; } .table-footer { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--layout-gap-xl); padding: var(--layout-padding-lg) var(--layout-padding-xl); } .table-page-size { justify-self: start; flex-shrink: 0; gap: var(--layout-gap-sm); } .table-page-size > span, .table-pager > span { color: var(--color-text-base-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); font-weight: var(--font-weight-accent); } .table-pager { justify-self: end; gap: var(--layout-gap-md); }
    .empty-state { display: grid; justify-items: center; gap: var(--layout-gap-lg); padding: var(--layout-padding-4xl); color: var(--color-text-base-subtle); text-align: center; } .empty-state__message { display: grid; justify-items: center; gap: var(--layout-gap-md); } .empty-state__message > cs-icon { color: var(--color-text-brand-default); } .empty-state__message > div { display: grid; gap: var(--layout-gap-xs); } .empty-state strong { color: var(--color-text-base-default); font-size: var(--font-size-content-caption); line-height: var(--font-line-height-content-caption); }
    .row-action-trigger { display: inline-flex; } .row-action-menu { box-sizing: border-box; display: grid; width: 139px; max-width: calc(100vw - var(--layout-padding-2xl)); padding: var(--layout-padding-xs); } .row-action-menu__heading { margin: 0; padding: var(--layout-padding-xs) var(--layout-padding-sm); color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); font-weight: var(--font-weight-accent); } .row-action-menu__divider { height: var(--layout-border-thin); margin-block: var(--layout-padding-xs); background: var(--color-border-divider); }
    .feedback-toast { position: fixed; top: var(--layout-padding-2xl); right: var(--layout-padding-2xl); z-index: var(--elevation-z-index-toast); display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--layout-gap-md); width: min(420px, calc(100vw - var(--layout-padding-4xl))); padding: var(--layout-padding-lg); border: var(--layout-border-thin) solid var(--color-border-success-default); border-radius: var(--radius-lg); background: var(--color-background-success-subtlest); box-shadow: var(--shadow-xl); color: var(--color-text-success-default); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); } .feedback-toast > p { margin: 0; } .feedback-toast.is-error { border-color: var(--color-border-danger-default); background: var(--color-background-danger-subtlest); color: var(--color-text-danger-default); } .feedback-toast.is-info { border-color: var(--color-border-brand-default); background: var(--color-background-brand-subtlest); color: var(--color-text-brand-default); } .feedback-toast__close { display: flex; align-items: center; justify-content: center; padding: var(--layout-padding-2xs); border: 0; border-radius: var(--radius-sm); background: transparent; color: inherit; cursor: pointer; } .feedback-toast__close:focus-visible { outline: none; box-shadow: 0 0 0 var(--layout-border-thick) var(--color-border-focused); }
    .dialog-content { display: grid; gap: var(--layout-gap-2xl); padding-block: var(--layout-padding-lg); } .confirmation-content p { margin: 0; color: var(--color-text-base-subtle); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); } .capture-form { margin: 0; } .field-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--layout-gap-xl); } .unit-selection-grid { display: grid; grid-template-columns: 180px minmax(0, 1fr); align-items: start; gap: var(--layout-gap-lg); } .form-field { display: grid; gap: var(--layout-gap-xs); } .form-field > label { color: var(--color-text-base-default); font-size: var(--font-size-content-ui); line-height: var(--font-line-height-content-ui); font-weight: var(--font-weight-accent); } .required-marker { margin-left: var(--layout-gap-2xs); color: var(--color-text-danger-default); } .field-error { color: var(--color-text-danger-default); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    .review-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--layout-gap-lg); margin: 0; padding: var(--layout-padding-lg); border: var(--layout-border-thin) solid var(--color-border-divider); border-radius: var(--radius-sm); } .review-list div { display: grid; gap: var(--layout-gap-xs); } dt { color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); } dd { margin: 0; color: var(--color-text-base-default); font-size: var(--font-size-content-ui); font-weight: var(--font-weight-accent); } .details-content { display: grid; gap: var(--layout-gap-2xl); padding-block: var(--layout-padding-lg); } .status-timeline { display: grid; gap: var(--layout-gap-md); } .status-timeline h2 { margin: 0; color: var(--color-text-base-default); font-family: var(--font-family-heading); font-size: var(--font-size-content-caption); line-height: var(--font-line-height-content-caption); } .status-timeline ol { display: grid; margin: 0; padding: 0; list-style: none; } .status-timeline li { position: relative; display: grid; grid-template-columns: var(--layout-padding-xl) minmax(0, 1fr); column-gap: var(--layout-gap-md); } .status-timeline li:not(:last-child)::before { position: absolute; top: var(--layout-padding-lg); bottom: calc(var(--layout-padding-lg) * -1); left: calc(var(--layout-padding-sm) - var(--layout-border-thin)); width: var(--layout-border-thin); background: var(--color-border-divider); content: ''; } .status-timeline__marker { z-index: 1; align-self: start; box-sizing: border-box; display: block; width: var(--layout-padding-lg); height: var(--layout-padding-lg); margin-top: var(--layout-padding-2xs); border: var(--layout-border-thick) solid var(--color-border-neutral-default); border-radius: var(--radius-full); background: var(--elevation-surface-default); } .status-timeline li.is-current .status-timeline__marker { border-color: var(--color-border-brand-default); background: var(--color-background-brand-default); box-shadow: 0 0 0 var(--layout-border-thin) var(--color-background-brand-subtlest); } .status-timeline__entry { display: grid; gap: var(--layout-gap-xs); padding-bottom: var(--layout-padding-xl); } .status-timeline li:last-child .status-timeline__entry { padding-bottom: 0; } .status-timeline strong { color: var(--color-text-base-default); font-size: var(--font-size-content-ui); } .status-timeline span, .status-timeline time { color: var(--color-text-base-subtle); font-size: var(--font-size-content-note); line-height: var(--font-line-height-content-note); }
    @media (max-width: 1080px) { .matrix-toolbar { grid-template-columns: minmax(220px, 1fr) 180px; } .toolbar-field--date-range { grid-column: 1 / -1; } } @media (max-width: 960px) { .capture-matrix { padding-inline: var(--layout-padding-3xl); } .page-header { align-items: stretch; flex-direction: column; } .page-header__actions { justify-content: flex-start; } } @media (max-width: 767px) { .capture-matrix { padding: var(--layout-padding-xl); } .page-header__actions { align-items: stretch; flex-direction: column; } .page-header cs-button { width: 100%; } .matrix-toolbar, .field-grid, .unit-selection-grid, .review-list { grid-template-columns: 1fr; } .toolbar-field--status, .status-filter-control, .toolbar-field--date-range { inline-size: 100%; min-inline-size: 0; max-inline-size: none; } .table-utilities { justify-content: stretch; margin-top: calc(var(--layout-gap-xl) * -1); } .table-utilities__trigger, .table-utilities__trigger cs-button { width: 100%; } .table-footer { display: flex; align-items: flex-start; flex-direction: column; gap: var(--layout-gap-md); } .table-page-size, .table-pager { justify-self: auto; } .table-pager { justify-content: flex-start; overflow-x: auto; padding-bottom: var(--layout-padding-xs); } }
  `],
})
export class NewCaptureOrderPage implements OnDestroy {
  protected readonly sourceOptions: SelectOption[] = [{ label: 'Centro de operaciones', value: 'Centro de operaciones' }, { label: 'Cliente', value: 'Cliente' }, { label: 'Autoridad competente', value: 'Autoridad competente' }, { label: 'Operación en campo', value: 'Operación en campo' }];
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly statusOptions: InputDropdownOption[] = [{ label: 'Todos los estados', value: '__all__' }, ...CAPTURE_ORDER_STATUSES.map((status) => ({ label: status, value: status }))];
  protected readonly unitTypeOptions = UNIT_TYPE_OPTIONS;
  protected readonly pageSizeOptions: InputDropdownOption[] = [10, 25, 50, 100].map((size) => ({ label: `${size} por página`, value: String(size) }));
  protected readonly exportOptions: DropdownItem[] = [{ label: 'Descargar PDF', value: 'pdf', icon: 'file-text' }, { label: 'Descargar Excel', value: 'excel', icon: 'file-text' }];
  @ViewChild('statusCell', { static: true }) private statusCellRef!: TemplateRef<unknown>;
  @ViewChild('actionsCell', { static: true }) private actionsCellRef!: TemplateRef<unknown>;
  protected readonly tableColumns: TableColumn[] = [
    { key: 'id', label: 'Orden', width: '128px', isSortable: true },
    { key: 'unit', label: 'Unidad', width: '128px', isSortable: true },
    { key: 'source', label: 'Fuente', isSortable: true },
    { key: 'status', label: 'Estado', width: '160px', isSortable: true },
    { key: 'created', label: 'Registro', width: '176px', isSortable: true },
    { key: 'actions', label: 'Acciones', width: '72px', align: 'center' },
  ];
  protected readonly draft = signal<CaptureOrderDraft>({ unitCode: '', source: '', caseNumber: '', receivedOn: '' });
  protected readonly errors = signal<Record<DraftField, string>>({ unitCode: '', source: '', caseNumber: '', receivedOn: '' });
  protected readonly saving = signal(false); protected readonly formOpen = signal(false); protected readonly confirmationOpen = signal(false); protected readonly message = signal(''); protected readonly messageKind = signal<'success' | 'error' | 'info'>('success'); protected readonly searchTerm = signal(''); protected readonly statusFilter = signal(''); protected readonly unitTypeFilter = signal<UnitType[]>([]); protected readonly dateFrom = signal(''); protected readonly dateTo = signal(''); protected readonly dateRangeOpen = signal(false); protected readonly exportMenuOpen = signal(false); protected readonly rowsPerPage = signal<RowsPerPage>(10); protected readonly page = signal(1); protected readonly sortKey = signal(DEFAULT_SORT.key); protected readonly sortOrder = signal<SortOrder>(DEFAULT_SORT.order); protected readonly today = this.localToday(); protected readonly caseNumberPrefix = `EXP-${this.today.slice(0, 4)}-`;
  protected readonly selectedOrder = signal<CaptureOrder | null>(null); protected readonly detailsOpen = signal(false); protected readonly actionMenuOrderId = signal<string | null>(null); protected readonly editingOrder = signal<CaptureOrder | null>(null); protected readonly annulledOrder = signal<CaptureOrder | null>(null); protected readonly annulOpen = signal(false); protected readonly annulmentReason = signal(''); protected readonly annulmentReasonError = signal(''); protected readonly annulSecondaryAction = { label: 'Cancelar' };
  private feedbackTimeout?: number;
  protected readonly allOrders = computed(() => [...this.orders.orders(), ...this.orders.fixtureOrders()]);
  protected readonly pendingDateRangeStart = computed(() => this.dateFrom() && !this.dateTo() ? this.dateFrom() : '');
  protected readonly selectedDateRange = computed(() => this.dateFrom() && this.dateTo() ? [this.dateFrom(), this.dateTo()] as [string, string] : undefined);
  protected readonly dateRangeLabel = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from) return 'Selecciona un rango';
    if (!to) return `Desde ${this.formatFilterDate(from)}`;
    return `${this.formatFilterDate(from)} — ${this.formatFilterDate(to)}`;
  });
  protected readonly dateRangeInputValue = computed(() => this.dateFrom() ? this.dateRangeLabel() : '');
  protected readonly filteredUnitOptions = computed(() => {
    const selectedTypes = this.unitTypeFilter();
    return selectedTypes.length
      ? this.unitOptions.filter((unit) => selectedTypes.includes(this.unitTypeOf(unit.code)))
      : this.unitOptions;
  });
  protected readonly filteredOrders = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const hasDateRange = !!from && !!to;
    return this.allOrders().filter((order) => {
      const registrationDate = this.registrationDate(order.createdAt);
      return (!search || `${order.id} ${order.unitCode}`.toLocaleLowerCase().includes(search))
        && (!status || order.status === status)
        && (!hasDateRange || registrationDate >= from && registrationDate <= to);
    });
  });
  protected readonly sortedOrders = computed(() => {
    const key = this.sortKey();
    const direction = this.sortOrder() === 'asc' ? 1 : -1;
    return [...this.filteredOrders()].sort((first, second) => {
      const firstValue = this.sortValue(first, key);
      const secondValue = this.sortValue(second, key);
      const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue), 'es', { numeric: true });
      return direction * comparison;
    });
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedOrders().length / this.rowsPerPage())));
  protected readonly visibleOrders = computed(() => { const start = (this.page() - 1) * this.rowsPerPage(); return this.sortedOrders().slice(start, start + this.rowsPerPage()); });
  protected readonly tableRows = computed<TableRow[]>(() => this.visibleOrders().map((order) => ({ key: order.id, cells: [order.id, order.unitCode, order.source, { template: this.statusCellRef, context: { $implicit: order.status } }, order.createdAt, { template: this.actionsCellRef, context: { $implicit: order } }] })));
  protected readonly tableSummary = computed(() => { if (this.orders.fixturesLoading()) return 'Cargando capturas'; const total = this.filteredOrders().length; if (!total) return '0 registros'; const first = (this.page() - 1) * this.rowsPerPage() + 1; return `${first}–${Math.min(first + this.rowsPerPage() - 1, total)} de ${total} registros`; });
  protected readonly sortDescription = computed(() => {
    const column = this.tableColumns.find(({ key }) => key === this.sortKey());
    return `Ordenado por ${column?.label ?? 'Registro'}, ${this.sortOrder() === 'asc' ? 'ascendente' : 'descendente'}.`;
  });
  protected readonly dialogTitle = computed(() => this.editingOrder() ? 'Editar captura' : 'Registrar captura');
  protected readonly detailsTitle = computed(() => this.selectedOrder() ? `Detalle de ${this.selectedOrder()!.id}` : 'Detalle de captura');
  protected readonly primaryAction = computed(() => this.editingOrder()
    ? { label: 'Guardar cambios', icon: 'save' as const }
    : { label: 'Registrar captura', icon: 'file-text' as const });
  protected readonly secondaryAction = { label: 'Cancelar' };
  protected readonly confirmationTitle = computed(() => this.editingOrder() ? 'Confirmar cambios' : 'Confirmar registro');
  protected readonly confirmationCopy = computed(() => {
    const draft = this.draft();
    const context = `Fuente: ${draft.source} · Fecha de recepción: ${this.formatConfirmationDate(draft.receivedOn)}`;
    return this.editingOrder()
      ? `¿Confirmas guardar los cambios de la captura ${this.editingOrder()!.id} de la unidad ${draft.unitCode}? ${context}`
      : `¿Confirmas registrar la captura de la unidad ${draft.unitCode}? ${context}`;
  });
  protected readonly confirmationPrimaryAction = computed(() => ({ label: this.editingOrder() ? 'Guardar cambios' : 'Confirmar registro', loading: this.saving() }));
  protected readonly confirmationSecondaryAction = { label: 'Cancelar' };
  protected readonly annulPrimaryAction = computed(() => ({ label: 'Anular captura', disabled: !this.annulmentReason().trim(), loading: this.saving() }));
  constructor(protected readonly orders: MockCaptureOrdersService) { void this.orders.loadFixtureOrders(); }
  protected readonly onUnitSelected = (unitCode: string): void => this.setField('unitCode', unitCode);
  protected asText(value: string | string[]): string { return typeof value === 'string' ? value : ''; }
  protected setSearchTerm(value: string): void { this.searchTerm.set(value); this.page.set(1); }
  protected setStatusFilter(value: string): void { this.statusFilter.set(value === '__all__' ? '' : value); this.page.set(1); }
  protected setUnitTypeFilter(value: readonly string[]): void {
    const nextTypes = value.filter((type): type is UnitType => UNIT_TYPE_OPTIONS.some((option) => option.value === type));
    this.unitTypeFilter.set(nextTypes);
    const selectedUnit = this.draft().unitCode;
    if (selectedUnit && nextTypes.length && !nextTypes.includes(this.unitTypeOf(selectedUnit))) this.setField('unitCode', '');
  }
  protected openDateRangePicker(): void { this.dateRangeOpen.set(true); }
  protected toggleDateRangePicker(): void { this.dateRangeOpen.update((isOpen) => !isOpen); }
  protected closeDateRangePicker(): void { this.dateRangeOpen.set(false); }
  protected selectDateRangeDate(value: string): void {
    const from = this.dateFrom();
    if (!from || this.dateTo()) { this.dateFrom.set(value); this.dateTo.set(''); return; }
    const [start, end] = [from, value].sort();
    this.dateFrom.set(start); this.dateTo.set(end); this.dateRangeOpen.set(false); this.page.set(1);
  }
  protected clearDateRange(): void { this.dateFrom.set(''); this.dateTo.set(''); this.page.set(1); }
  protected rowsPerPageValue(): string { return String(this.rowsPerPage()); }
  protected setRowsPerPage(value: string): void { const size = Number(value); this.rowsPerPage.set(([10, 25, 50, 100] as const).includes(size as RowsPerPage) ? size as RowsPerPage : 10); this.page.set(1); }
  protected setPage(page: number): void { this.page.set(Math.min(Math.max(1, page), this.totalPages())); }
  protected retryFixtureLoad(): void { void this.orders.loadFixtureOrders(); }
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
  protected openDetails(order: CaptureOrder): void { this.selectedOrder.set(order); this.detailsOpen.set(true); }
  protected closeDetails(): void { this.detailsOpen.set(false); }
  protected actionItems(order: CaptureOrder): DropdownItem[] {
    const items: DropdownItem[] = [{ label: 'Ver detalle', value: 'view', icon: 'eye' }];
    if (this.canEdit(order)) items.push({ label: 'Editar', value: 'edit', icon: 'pencil' });
    if (this.canAnnul(order)) {
      items[items.length - 1].dividerAfter = true;
      items.push({ label: 'Anular captura', value: 'annul', icon: 'x', variant: 'destructive' });
    }
    return items;
  }
  protected toggleActionMenu(orderId: string): void { this.actionMenuOrderId.update((activeId) => activeId === orderId ? null : orderId); }
  protected closeActionMenu(): void { this.actionMenuOrderId.set(null); }
  protected runAction(order: CaptureOrder, item: DropdownItem): void {
    this.closeActionMenu();
    if (item.value === 'view') this.openDetails(order);
    if (item.value === 'edit') this.openEdit(order);
    if (item.value === 'annul') this.openAnnulment(order);
  }
  protected statusEntries(order: CaptureOrder): NonNullable<CaptureOrder['auditTrail']> {
    return (order.auditTrail ?? [{ action: 'Creación', at: order.createdAt, detail: 'Orden registrada.' }])
      .filter((entry) => entry.action !== 'Edición');
  }
  protected statusSeverity(status: string): TagSeverity { return ({ 'Registrada': 'info', 'En revisión': 'warn', 'Con observación': 'danger', Cerrada: 'secondary', Anulada: 'danger' } as Record<string, TagSeverity>)[status] ?? 'secondary'; }
  private sortValue(order: CaptureOrder, key: string): string | number {
    if (key === 'created') return this.registrationTimestamp(order.createdAt);
    return ({ id: order.id, unit: order.unitCode, source: order.source, status: order.status } as Record<string, string>)[key] ?? '';
  }
  private unitTypeOf(unitCode: string): UnitType {
    const prefix = unitCode.split('-', 1)[0];
    return (UNIT_TYPE_OPTIONS.some((type) => type.value === prefix) ? prefix : 'VHC') as UnitType;
  }
  private registrationTimestamp(value: string): number {
    const months: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
    const match = value.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.\s+(\d{4}),\s+(\d{2}):(\d{2})$/i);
    if (!match) return 0;
    return new Date(Number(match[3]), months[match[2].toLowerCase()], Number(match[1]), Number(match[4]), Number(match[5])).getTime();
  }
  private registrationDate(value: string): string {
    const match = value.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.\s+(\d{4}),/i);
    if (!match) return '';
    const months: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
    return `${match[3]}-${String(months[match[2].toLowerCase()]).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  private formatFilterDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  }
  protected toggleExportMenu(): void { this.exportMenuOpen.update((isOpen) => !isOpen); }
  protected closeExportMenu(): void { this.exportMenuOpen.set(false); }
  protected requestExport(item: DropdownItem): void {
    this.closeExportMenu();
    const format = item.value === 'excel' ? 'Excel' : 'PDF';
    this.showMessage('info', `La descarga en ${format} usará los filtros y el orden actuales.`);
  }
  protected showBulkUploadNotice(): void {
    this.showMessage('info', 'La carga masiva de recuperos se realizará en un flujo dedicado.');
  }
  protected openForm(): void { this.dismissMessage(); this.confirmationOpen.set(false); this.editingOrder.set(null); this.unitTypeFilter.set([]); this.draft.set(this.emptyDraft()); this.errors.set(this.emptyErrors()); this.formOpen.set(true); }
  protected openEdit(order: CaptureOrder): void {
    if (!this.canEdit(order)) return;
    this.dismissMessage(); this.confirmationOpen.set(false); this.editingOrder.set(order); this.unitTypeFilter.set([this.unitTypeOf(order.unitCode)]); this.draft.set({ unitCode: order.unitCode, source: order.source, caseNumber: order.caseNumber, receivedOn: order.receivedOn }); this.errors.set(this.emptyErrors()); this.formOpen.set(true);
  }
  protected closeForm(): void { if (!this.saving()) { this.formOpen.set(false); this.editingOrder.set(null); } }
  protected dismissMessage(): void { if (this.feedbackTimeout !== undefined) window.clearTimeout(this.feedbackTimeout); this.feedbackTimeout = undefined; this.message.set(''); }
  ngOnDestroy(): void { this.dismissMessage(); }
  protected setField(field: DraftField, value: string): void { this.draft.update((draft) => ({ ...draft, [field]: value })); this.errors.update((errors) => ({ ...errors, [field]: '' })); }
  protected setCaseNumber(value: string): void {
    const suffix = value.startsWith(this.caseNumberPrefix) ? value.slice(this.caseNumberPrefix.length) : value.replace(/^EXP-\d{4}-?/i, '');
    this.setField('caseNumber', `${this.caseNumberPrefix}${suffix.replace(/\D/g, '')}`);
  }
  protected requestSubmission(event?: Event): void {
    event?.preventDefault();
    if (!this.validate()) return;
    if (this.orders.hasActiveCaptureOrder(this.draft().unitCode, this.editingOrder()?.id)) {
      this.errors.update((errors) => ({ ...errors, unitCode: 'Esta unidad ya tiene una orden de captura registrada.' }));
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
  protected confirmSubmission(): void { void this.register(); }
  protected openAnnulment(order: CaptureOrder): void {
    if (!this.canAnnul(order)) return;
    this.annulledOrder.set(order); this.annulmentReason.set(''); this.annulmentReasonError.set(''); this.annulOpen.set(true);
  }
  protected closeAnnulment(): void { if (!this.saving()) { this.annulOpen.set(false); this.annulledOrder.set(null); this.annulmentReason.set(''); this.annulmentReasonError.set(''); } }
  protected setAnnulmentReason(value: string): void { this.annulmentReason.set(value); this.annulmentReasonError.set(''); }
  protected async confirmAnnulment(): Promise<void> {
    const order = this.annulledOrder();
    if (!order) return;
    if (!this.annulmentReason().trim()) { this.annulmentReasonError.set('Describe el motivo de anulación.'); return; }
    this.saving.set(true); const result = await this.orders.annul(order.id, this.annulmentReason()); this.saving.set(false);
    if (result.kind !== 'success') { this.annulmentReasonError.set(result.message); return; }
    this.closeAnnulment(); this.showMessage('success', `La orden ${result.order.id} fue anulada y se conserva en el historial.`);
  }
  private async register(): Promise<void> {
    this.saving.set(true);
    const editing = this.editingOrder();
    const result = editing ? await this.orders.update(editing.id, this.draft()) : await this.orders.create(this.draft());
    this.saving.set(false);
    if (result.kind !== 'success') {
      this.confirmationOpen.set(false);
      this.formOpen.set(true);
      if (result.kind === 'duplicate') this.errors.update((errors) => ({ ...errors, unitCode: result.message }));
      else this.showMessage('error', result.message);
      return;
    }
    const wasEditing = !!editing;
    this.confirmationOpen.set(false); this.formOpen.set(false); this.editingOrder.set(null); this.showMessage('success', wasEditing ? `La orden ${result.order.id} fue actualizada y su edición quedó registrada.` : `La orden ${result.order.id} fue registrada con el estado “${result.order.status}”.`); this.draft.set(this.emptyDraft());
  }
  private validate(): boolean { const draft = this.draft(); const caseNumberDigits = draft.caseNumber.slice(this.caseNumberPrefix.length); const errors: Record<DraftField, string> = { unitCode: draft.unitCode.trim() ? '' : 'Ingresa el código de la unidad.', source: draft.source ? '' : 'Selecciona la fuente de la orden.', caseNumber: caseNumberDigits ? '' : 'Ingresa los dígitos del expediente.', receivedOn: !draft.receivedOn ? 'Selecciona la fecha de recepción.' : draft.receivedOn > this.today ? 'La fecha no puede ser futura.' : '' }; this.errors.set(errors); return Object.values(errors).every((error) => !error); }
  private formatConfirmationDate(value: string): string { const [year, month, day] = value.split('-'); return year && month && day ? `${day}/${month}/${year}` : value; }
  private showMessage(kind: 'success' | 'error' | 'info', message: string): void {
    this.dismissMessage();
    this.messageKind.set(kind);
    this.message.set(message);
    if (kind !== 'error') this.feedbackTimeout = window.setTimeout(() => this.dismissMessage(), 4000);
  }
  private canEdit(order: CaptureOrder): boolean { return order.status === 'Registrada' || order.status === 'Con observación'; }
  private canAnnul(order: CaptureOrder): boolean { return order.status !== 'Cerrada' && order.status !== 'Anulada'; }
  private emptyDraft(): CaptureOrderDraft { return { unitCode: '', source: '', caseNumber: this.caseNumberPrefix, receivedOn: this.today }; }
  private emptyErrors(): Record<DraftField, string> { return { unitCode: '', source: '', caseNumber: '', receivedOn: '' }; }
  private localToday(): string { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
}
