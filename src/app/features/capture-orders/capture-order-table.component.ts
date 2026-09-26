import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Button,
  ColumnManager,
  DropdownItemComponent,
  Icon,
  InputDropdown,
  InputDropdownOption,
  Pagination,
  Popover,
  Table,
  TableColumn,
  TableRow,
  Tag,
  Tooltip,
  type ColumnManagerItem,
  type DropdownItem,
} from '@iamacalupuenzo-ui/comsatel-ds';
import {
  CAPTURE_DOCUMENT_DEFINITIONS,
  CaptureOrder,
} from '../../core/orders/mock-capture-orders.service';
import { CaptureOrdersService } from './capture-orders.service';

/**
 * Tabla de la matriz de capturas: gestor de columnas, menú de descarga,
 * paginación y el menú de acciones por fila. Extraído de
 * `new-capture-order.page.ts` (bloques `.table-utilities` y `.table-area`).
 *
 * La visibilidad/orden de columnas, el menú de acciones por fila y el menú
 * de descarga son UI propia de esta tabla (nadie más los necesita), así que
 * quedan como estado local en vez de sumarse a `CaptureOrdersService`. Los
 * datos que sí vienen del servicio (`visibleOrders`, orden, paginación)
 * llegan ya filtrados/ordenados/paginados; esta tabla solo decide cómo
 * pintarlos.
 */
@Component({
  selector: 'app-capture-order-table',
  imports: [
    Button,
    // ColumnManager, — gestor de columnas oculto, ver comentario junto a `.table-utilities` en el template.
    DropdownItemComponent,
    Icon,
    InputDropdown,
    Pagination,
    Popover,
    Table,
    Tag,
    Tooltip,
  ],
  template: `
    <ng-template #statusCell let-order
      ><cs-tag
        [value]="order.status"
        [severity]="state.statusSeverity(order.status)"
        [rounded]="true"
        size="lg"
    /></ng-template>
    <ng-template #unitCell let-order>
      <span class="capture-orders-table__unit">
        <span>{{ order.unitCode }}</span>
      </span>
    </ng-template>
    <ng-template #gpsCell let-order>
      <cs-tag
        [value]="state.gpsStatusLabelOf(order.unitCode)"
        [severity]="state.gpsStatusSeverityOf(order.unitCode)"
        icon="satellite"
        [rounded]="true"
        size="lg"
      />
    </ng-template>
    <ng-template #lastLocationCell let-order>
      @if (state.locationOf(order.unitCode); as location) {
        @if (state.locationIsStaleOf(order.unitCode)) {
          <span class="last-location-empty">Sin ubicación en los últimos 30 días</span>
        } @else {
          <span
            class="copy-on-hover"
            role="button"
            tabindex="0"
            [attr.aria-label]="
              state.copiedLocation() === location.lastLocation
                ? 'Ubicación copiada'
                : 'Copiar última ubicación de ' + order.unitCode
            "
            (click)="state.copyLastLocation(location.lastLocation)"
            (keydown.enter)="state.copyLastLocation(location.lastLocation)"
            (keydown.space)="$event.preventDefault(); state.copyLastLocation(location.lastLocation)"
          >
            <span>{{ location.lastLocation }}</span>
            <cs-icon name="copy" [size]="12" aria-hidden="true" />
          </span>
        }
      } @else {
        <span class="last-location-empty">Sin posición disponible</span>
      }
    </ng-template>
    <ng-template #caseNumberCell let-order>
      @if (order.caseNumber; as caseNumber) {
        <span
          class="copy-on-hover"
          role="button"
          tabindex="0"
          [attr.aria-label]="
            state.copiedCaseNumber() === caseNumber
              ? 'Expediente copiado'
              : 'Copiar expediente de ' + order.unitCode
          "
          (click)="state.copyCaseNumber(caseNumber)"
          (keydown.enter)="state.copyCaseNumber(caseNumber)"
          (keydown.space)="$event.preventDefault(); state.copyCaseNumber(caseNumber)"
        >
          <span>{{ caseNumber }}</span>
          <cs-icon name="copy" [size]="12" aria-hidden="true" />
        </span>
      } @else {
        <span>Sin expediente</span>
      }
    </ng-template>
    <ng-template #contractCell let-order>
      <cs-tag
        [value]="state.contractStatusOf(order.unitCode)"
        [severity]="state.contractStatusSeverity(state.contractStatusOf(order.unitCode))"
        [rounded]="true"
        size="lg"
      />
    </ng-template>
    <ng-template #documentsCell let-order>
      <span class="documents-checklist" [attr.aria-label]="documentsSummary(order)">
        @for (definition of documentDefinitions; track definition.type) {
          <cs-tooltip [content]="definition.label" side="top">
            <button
              type="button"
              class="documents-checklist__box"
              role="checkbox"
              [attr.aria-checked]="state.hasDocument(order, definition.type)"
              [attr.aria-label]="
                (state.hasDocument(order, definition.type) ? 'Quitar ' : 'Marcar ') +
                definition.label +
                ' — ' +
                order.unitCode
              "
              (click)="state.toggleDocumentMark(order, definition.type); blurTrigger($event)"
            >
              @if (state.hasDocument(order, definition.type)) {
                <cs-icon name="check" [size]="12" aria-hidden="true" />
              }
            </button>
          </cs-tooltip>
        }
        <cs-tooltip [content]="state.mapStatusReason(order)" side="top">
          <span
            class="documents-checklist__map-status"
            role="img"
            [attr.aria-label]="
              (state.appearsOnMap(order) ? 'Visible en el mapa — ' : 'No visible en el mapa — ') +
              state.mapStatusReason(order)
            "
          >
            <cs-icon
              name="map-pin"
              [size]="14"
              [style.color]="
                state.appearsOnMap(order)
                  ? 'var(--color-text-success-default)'
                  : 'var(--color-icon-neutral-subtlest)'
              "
              aria-hidden="true"
            />
          </span>
        </cs-tooltip>
      </span>
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
    <!--
      Gestor de columnas y menú de descarga ocultos a pedido: todavía no
      existen como componentes del sistema de diseño (comsatel-ds), así que
      se dejan comentados en vez de borrarse — se restauran cuando el DS los
      incorpore. La lógica en la clase (columnManagerColumns, exportOptions,
      setVisibleColumns, etc.) queda intacta para ese momento.
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
    -->

    <div class="table-area" [class.table-area--actions-shadow]="showActionsShadow()">
      <div class="table-frame">
        <cs-table
          #captureOrdersTable
          class="capture-orders-table"
          [columns]="tableColumns()"
          [rows]="tableRows()"
          [sortKey]="state.sortKey()"
          [sortOrder]="state.sortOrder()"
          caption="Matriz de órdenes de captura"
          [isLoading]="state.saving() || state.fixturesLoading()"
          [minWidth]="tableMinWidth()"
          (sort)="state.setSort($event)"
          ><div emptyState class="empty-state" role="status">
            <div class="empty-state__message">
              <cs-icon name="file-text" [size]="40" aria-hidden="true" />
              <div>
                <strong>{{ state.fixturesError() || 'No encontramos capturas' }}</strong>
                <p>
                  {{
                    state.fixturesError()
                      ? 'Verifica tu conexión e inténtalo nuevamente.'
                      : 'Prueba con otra orden, unidad o estado.'
                  }}
                </p>
              </div>
            </div>
            @if (state.fixturesError()) {
              <cs-button variant="secondary" size="sm" (click)="state.retryFixtureLoad()"
                >Reintentar</cs-button
              >
            } @else {
              <cs-button variant="default" size="sm" (click)="state.openForm()"
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
            [value]="state.rowsPerPageValue()"
            (valueChange)="state.setRowsPerPage($event)"
          />
        </div>
        <p class="table-summary" role="status" aria-live="polite">{{ state.tableSummary() }}</p>
        <div class="table-pager">
          <span>Página {{ state.page() }} de {{ state.totalPages() }}</span>
          @if (state.filteredOrders().length > state.rowsPerPage()) {
            <cs-pagination
              [totalPages]="state.totalPages()"
              [page]="state.page()"
              (pageChange)="state.setPage($event)"
            />
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
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
      .table-summary {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
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
      .empty-state p {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
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
        gap: var(--layout-gap-md);
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
        width: 208px;
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
      @media (max-width: 767px) {
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
      .last-location-empty {
        color: var(--color-text-base-subtle);
      }
    `,
  ],
})
export class CaptureOrderTableComponent implements AfterViewInit, OnDestroy {
  protected readonly state = inject(CaptureOrdersService);
  protected readonly documentDefinitions = CAPTURE_DOCUMENT_DEFINITIONS;

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
  @ViewChild('lastLocationCell', { static: true })
  private lastLocationCellRef!: TemplateRef<unknown>;
  @ViewChild('caseNumberCell', { static: true })
  private caseNumberCellRef!: TemplateRef<unknown>;
  @ViewChild('contractCell', { static: true }) private contractCellRef!: TemplateRef<unknown>;
  @ViewChild('gpsCell', { static: true }) private gpsCellRef!: TemplateRef<unknown>;
  @ViewChild('documentsCell', { static: true }) private documentsCellRef!: TemplateRef<unknown>;
  @ViewChild('actionsCell', { static: true }) private actionsCellRef!: TemplateRef<unknown>;
  @ViewChild('captureOrdersTable', { read: ElementRef })
  private captureOrdersTableRef!: ElementRef<HTMLElement>;

  private readonly configurableTableColumns: readonly TableColumn[] = [
    { key: 'created', label: 'Fecha de registro', width: '132px', isSortable: true },
    { key: 'financiera', label: 'Financiera', width: '116px', isSortable: true },
    { key: 'unit', label: 'Placa', width: '128px', isSortable: true },
    { key: 'engine', label: 'Motor', width: '144px', isSortable: true },
    { key: 'caseNumber', label: 'Expediente', width: '176px', isSortable: true },
    { key: 'contract', label: 'Contrato', width: '128px', isSortable: true },
    { key: 'gps', label: 'GPS', width: '128px', isSortable: true },
    { key: 'documents', label: 'Documentos', width: '140px', isSortable: true },
    { key: 'lastLocation', label: 'Última ubicación', isSortable: true },
    { key: 'status', label: 'Estado', width: '160px', isSortable: true },
  ];
  private readonly actionsTableColumn: TableColumn = {
    key: 'actions',
    label: 'Acciones',
    width: '72px',
    align: 'center',
  };
  private readonly tableColumnMinWidths: Readonly<Record<string, number>> = {
    created: 132,
    financiera: 116,
    unit: 128,
    engine: 144,
    caseNumber: 176,
    contract: 128,
    gps: 128,
    documents: 140,
    lastLocation: 272,
    status: 160,
    actions: 72,
  };

  protected readonly visibleColumnKeys = signal<string[]>(
    this.configurableTableColumns.map((column) => column.key),
  );
  protected readonly columnOrder = signal<string[]>(
    this.configurableTableColumns.map((column) => column.key),
  );
  protected readonly exportMenuOpen = signal(false);
  protected readonly actionMenuOrderId = signal<string | null>(null);
  protected readonly showActionsShadow = signal(false);
  private tableScrollCleanup?: () => void;

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
  protected readonly tableRows = computed<TableRow[]>(() =>
    this.state.visibleOrders().map((order) => ({
      key: order.id,
      cells: this.tableColumns().map((column) => this.tableCellFor(order, column.key)),
    })),
  );
  protected readonly sortDescription = computed(() => {
    const column = this.tableColumns().find(({ key }) => key === this.state.sortKey());
    return `Ordenado por ${column?.label ?? 'Registro'}, ${this.state.sortOrder() === 'asc' ? 'ascendente' : 'descendente'}.`;
  });

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
  ngOnDestroy(): void {
    this.tableScrollCleanup?.();
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
  protected toggleExportMenu(): void {
    this.exportMenuOpen.update((isOpen) => !isOpen);
  }
  protected closeExportMenu(): void {
    this.exportMenuOpen.set(false);
  }
  protected requestExport(item: DropdownItem): void {
    this.closeExportMenu();
    const format = item.value === 'excel' ? 'Excel' : 'PDF';
    this.state.showMessage('info', `La descarga en ${format} usará los filtros y el orden actuales.`);
  }
  protected toggleActionMenu(orderId: string): void {
    this.actionMenuOrderId.update((activeId) => (activeId === orderId ? null : orderId));
  }
  protected closeActionMenu(): void {
    this.actionMenuOrderId.set(null);
  }
  protected actionItems(order: CaptureOrder): DropdownItem[] {
    const items: DropdownItem[] = [{ label: 'Ver detalle', value: 'view', icon: 'eye' }];
    // Edición individual fuera de alcance (ver docs/arquitectura-new-capture-order.md#capturas-sin-registro-individual):
    // if (this.state.canEdit(order)) items.push({ label: 'Editar', value: 'edit', icon: 'pencil' });
    if (this.state.canClose(order))
      items.push({ label: 'Marcar como capturado', value: 'close', icon: 'lock' });
    if (this.state.canObserve(order)) {
      items.push({ label: 'Observar captura', value: 'observe', icon: 'alert-triangle' });
    }
    if (this.state.canRevertToPending(order)) {
      items.push({ label: 'Volver a pendiente', value: 'revert-to-pending', icon: 'circle-dot' });
    }
    if (this.state.canAnnul(order)) {
      items[items.length - 1].dividerAfter = true;
      items.push({ label: 'Paralizar captura', value: 'annul', icon: 'x', variant: 'destructive' });
    }
    return items;
  }
  protected runAction(order: CaptureOrder, item: DropdownItem): void {
    this.closeActionMenu();
    if (item.value === 'view') this.state.openDetails(order);
    // if (item.value === 'edit') this.state.openEdit(order); — ver nota en actionItems().
    if (item.value === 'close') this.state.openCloseConfirmation(order);
    if (item.value === 'observe') this.state.openObservation(order);
    if (item.value === 'revert-to-pending') this.state.openRevertConfirmation(order);
    if (item.value === 'annul') this.state.openAnnulment(order);
  }
  protected documentsSummary(order: CaptureOrder): string {
    return `${this.state.documentsCompleteCountOf(order)} de ${this.documentDefinitions.length} documentos adjuntos`;
  }
  /**
   * `cs-tooltip` se mantiene visible mientras su trigger tiene foco
   * (`:focus-within`) — al marcar/desmarcar un documento con clic, el botón
   * queda enfocado y el tooltip se ve "pegado" en vez de comportarse como
   * un hover normal. Quitar el foco después del clic lo devuelve a ese
   * comportamiento: solo se muestra mientras el mouse está encima.
   */
  protected blurTrigger(event: Event): void {
    (event.currentTarget as HTMLElement | null)?.blur();
  }
  private tableCellFor(order: CaptureOrder, key: string): TableRow['cells'][number] {
    switch (key) {
      case 'financiera':
        return order.financiera;
      case 'unit':
        return { template: this.unitCellRef, context: { $implicit: order } };
      case 'lastLocation':
        return { template: this.lastLocationCellRef, context: { $implicit: order } };
      case 'engine':
        return this.state.engineCodeOf(order.unitCode);
      case 'caseNumber':
        return { template: this.caseNumberCellRef, context: { $implicit: order } };
      case 'contract':
        return { template: this.contractCellRef, context: { $implicit: order } };
      case 'gps':
        return { template: this.gpsCellRef, context: { $implicit: order } };
      case 'documents':
        return { template: this.documentsCellRef, context: { $implicit: order } };
      case 'status':
        return { template: this.statusCellRef, context: { $implicit: order } };
      case 'created':
        return this.state.createdDateLabel(order.createdAt);
      case 'actions':
        return { template: this.actionsCellRef, context: { $implicit: order } };
      default:
        return '';
    }
  }
}
