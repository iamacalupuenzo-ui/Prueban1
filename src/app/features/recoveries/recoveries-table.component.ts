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
  type ColumnManagerItem,
  type DropdownItem,
} from '@iamacalupuenzo-ui/comsatel-ds';
import { RecoveryOrder } from '../../core/recoveries/mock-recovery-orders.service';
import { RecoveriesService } from './recoveries.service';

/**
 * Tabla de la matriz de recuperos: gestor de columnas, menú de descarga,
 * paginación y el menú de acciones por fila. Espeja `CaptureOrderTableComponent`
 * — mismo patrón de celdas por `ng-template`, gestor de columnas, sombra de
 * scroll sobre "Acciones" y menú de descarga — conectada a
 * `RecoveriesService` en vez de `CaptureOrdersService`.
 *
 * Diferencias de contrato frente a Capturas (ver
 * `docs/plan-construccion-recuperos.md`): columnas propias de Recuperos
 * (fuente, referencia, fecha del recupero), la celda de última ubicación usa
 * `state.locationOf(...)` (null cuando la unidad no tiene GPS, con el
 * mensaje "Sin GPS disponible" en vez de uno genérico) y el menú de acciones
 * por fila solo ofrece "Ver detalle"/"Editar" — la matriz de
 * cerrar/observar/anular sigue pendiente de aprobación de Producto para este
 * feature, así que esas acciones no existen todavía en `RecoveriesService`.
 *
 * La visibilidad/orden de columnas, el menú de acciones por fila y el menú
 * de descarga son UI propia de esta tabla, igual que en Capturas: quedan
 * como estado local en vez de sumarse a `RecoveriesService`.
 */
@Component({
  selector: 'app-recoveries-table',
  imports: [
    Button,
    ColumnManager,
    DropdownItemComponent,
    Icon,
    InputDropdown,
    Pagination,
    Popover,
    Table,
    Tag,
  ],
  template: `
    <ng-template #statusCell let-status
      ><cs-tag [value]="status" [severity]="state.statusSeverity(status)" [rounded]="true" size="lg"
    /></ng-template>
    <ng-template #unitCell let-order>
      <span class="recoveries-table__unit">
        <cs-icon [name]="state.unitIconOf(order.unitCode)" [size]="16" aria-hidden="true" />
        <span>{{ order.unitCode }}</span>
      </span>
    </ng-template>
    <ng-template #lastLocationCell let-order>
      @if (state.locationOf(order.unitCode); as location) {
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
      } @else {
        <span>Sin GPS disponible</span>
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
          }</div
      ></cs-popover>
    </ng-template>
    <div class="table-utilities">
      <cs-column-manager
        class="recoveries-column-manager"
        label=""
        aria-label="Configurar columnas de la matriz de recuperos"
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
          aria-controls="recovery-export-menu"
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
        ><div id="recovery-export-menu" class="export-menu">
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
          #recoveriesTable
          class="recoveries-table"
          [columns]="tableColumns()"
          [rows]="tableRows()"
          [sortKey]="state.sortKey()"
          [sortOrder]="state.sortOrder()"
          caption="Matriz de órdenes de recupero"
          [isLoading]="state.saving() || state.fixturesLoading()"
          [minWidth]="tableMinWidth()"
          (sort)="state.setSort($event)"
          ><div emptyState class="empty-state" role="status">
            <div class="empty-state__message">
              <cs-icon name="file-text" [size]="40" aria-hidden="true" />
              <div>
                <strong>{{ state.fixturesError() || 'No encontramos recuperos' }}</strong>
                <p>
                  {{
                    state.fixturesError()
                      ? 'Verifica tu conexión e inténtalo nuevamente.'
                      : 'Prueba con otra orden, unidad, fuente o estado.'
                  }}
                </p>
              </div>
            </div>
            @if (state.fixturesError()) {
              <cs-button variant="secondary" size="sm" (click)="state.retryFixtureLoad()"
                >Reintentar</cs-button
              >
            } @else {
              <cs-button variant="secondary" size="sm" (click)="state.openCreate()"
                ><cs-icon name="plus" [size]="16" aria-hidden="true" />Registrar
                recupero</cs-button
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
      .recoveries-table__unit {
        display: inline-flex;
        align-items: center;
        gap: var(--layout-gap-xs);
        white-space: nowrap;
      }
      .recoveries-table__unit cs-icon {
        color: var(--color-text-brand-default);
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
      .recoveries-column-manager {
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
        container-name: recoveries-table-area;
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
    `,
  ],
})
export class RecoveriesTableComponent implements AfterViewInit, OnDestroy {
  protected readonly state = inject(RecoveriesService);

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
  @ViewChild('actionsCell', { static: true }) private actionsCellRef!: TemplateRef<unknown>;
  @ViewChild('recoveriesTable', { read: ElementRef })
  private recoveriesTableRef!: ElementRef<HTMLElement>;

  private readonly configurableTableColumns: readonly TableColumn[] = [
    { key: 'id', label: 'Orden', width: '128px', isSortable: true },
    { key: 'unit', label: 'Unidad', width: '128px', isSortable: true },
    { key: 'source', label: 'Fuente', width: '176px', isSortable: true },
    { key: 'reference', label: 'Referencia', isSortable: true },
    { key: 'lastLocation', label: 'Última ubicación', isSortable: true },
    { key: 'recoveredAt', label: 'Fecha de recuperación', width: '160px', isSortable: true },
    { key: 'status', label: 'Estado', width: '160px', isSortable: true },
    { key: 'created', label: 'Registro', width: '176px', isSortable: true },
  ];
  private readonly actionsTableColumn: TableColumn = {
    key: 'actions',
    label: 'Acciones',
    width: '72px',
    align: 'center',
  };
  private readonly tableColumnMinWidths: Readonly<Record<string, number>> = {
    id: 128,
    unit: 128,
    source: 176,
    reference: 160,
    lastLocation: 272,
    recoveredAt: 160,
    status: 160,
    created: 176,
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
      this.recoveriesTableRef.nativeElement.querySelector<HTMLElement>('.cs-table__wrap');
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
      this.recoveriesTableRef?.nativeElement.querySelector<HTMLElement>('.cs-table__wrap');
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
    this.state.showMessage('info', `La descarga en ${format} usará los filtros y el orden actuales de recuperos.`);
  }
  protected toggleActionMenu(orderId: string): void {
    this.actionMenuOrderId.update((activeId) => (activeId === orderId ? null : orderId));
  }
  protected closeActionMenu(): void {
    this.actionMenuOrderId.set(null);
  }
  protected actionItems(order: RecoveryOrder): DropdownItem[] {
    const items: DropdownItem[] = [{ label: 'Ver detalle', value: 'view', icon: 'eye' }];
    if (this.state.canEdit(order)) items.push({ label: 'Editar', value: 'edit', icon: 'pencil' });
    return items;
  }
  protected runAction(order: RecoveryOrder, item: DropdownItem): void {
    this.closeActionMenu();
    if (item.value === 'view') this.state.openDetails(order);
    if (item.value === 'edit') this.state.openEdit(order);
  }
  private tableCellFor(order: RecoveryOrder, key: string): TableRow['cells'][number] {
    switch (key) {
      case 'id':
        return order.id;
      case 'unit':
        return { template: this.unitCellRef, context: { $implicit: order } };
      case 'source':
        return order.sourceName;
      case 'reference':
        return order.referenceNumber;
      case 'lastLocation':
        return { template: this.lastLocationCellRef, context: { $implicit: order } };
      case 'recoveredAt':
        return this.state.recoveredLabel(order);
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
}
