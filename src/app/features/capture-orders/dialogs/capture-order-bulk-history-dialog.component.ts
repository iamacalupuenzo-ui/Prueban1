import { Component, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Icon, Pagination, Table, type TableColumn, type TableRow } from '@iamacalupuenzo-ui/comsatel-ds';
import { SideDrawerComponent } from '../../../shared/side-drawer.component';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Historial de cargas masivas — permite confirmar que ya se hicieron cargas
 * anteriores sin tener que revisar el `auditTrail` de cada orden por
 * separado. Usa el mismo estándar visual que la matriz de Capturas
 * (`capture-order-table.component.ts`): `cs-table` con borde/radio propio y
 * el mismo pie con resumen + `cs-pagination`, no una tabla HTML aparte. A
 * diferencia de la matriz, las filas por página son fijas (10, sin
 * selector) — el historial no necesita esa configuración. Solo 2 columnas
 * — Archivo (con la fecha debajo, sin financiera) y Resultado (una sola
 * frase, no una columna por métrica) — para no salirse del ancho del
 * drawer.
 */
@Component({
  selector: 'app-capture-order-bulk-history-dialog',
  imports: [Icon, Pagination, SideDrawerComponent, Table],
  template: `
    <ng-template #fileCell let-batch>
      <span class="bulk-history-file">
        <cs-icon name="file-text" [size]="16" aria-hidden="true" />
        <span>
          <strong>{{ batch.fileName }}</strong>
          <span class="bulk-history-file__date">{{ batch.uploadedAt }}</span>
        </span>
      </span>
    </ng-template>
    <ng-template #resultCell let-batch>{{ resultSummary(batch) }}</ng-template>
    <app-side-drawer
      [isOpen]="state.bulkHistoryOpen()"
      title="Historial de cargas masivas"
      surface="canvas"
      (closed)="state.closeBulkHistory()"
    >
      <div class="table-area">
        <div class="table-frame">
          <cs-table
            [columns]="tableColumns"
            [rows]="tableRows()"
            caption="Historial de cargas masivas de capturas"
            [isLoading]="false"
          >
            <div emptyState class="bulk-history-empty">
              Todavía no se registró ninguna carga masiva.
            </div>
          </cs-table>
        </div>
        <div class="table-footer">
          <p class="table-summary" role="status" aria-live="polite">{{ tableSummary() }}</p>
          <div class="table-pager">
            <span>Página {{ page() }} de {{ totalPages() }}</span>
            @if (state.bulkUploadBatches().length > rowsPerPage) {
              <cs-pagination [totalPages]="totalPages()" [page]="page()" (pageChange)="page.set($event)" />
            }
          </div>
        </div>
      </div>
    </app-side-drawer>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .bulk-history-file {
        display: flex;
        align-items: center;
        gap: var(--layout-gap-xs);
        color: var(--color-text-base-subtle);
      }
      .bulk-history-file strong {
        display: block;
        color: var(--color-text-base-default);
        font-weight: var(--font-weight-accent);
      }
      .bulk-history-file__date {
        display: block;
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .bulk-history-empty {
        padding: var(--layout-padding-4xl);
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-ui);
        line-height: var(--font-line-height-content-ui);
        text-align: center;
      }
      .table-area {
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
      .table-pager {
        display: flex;
        align-items: center;
      }
      .table-footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--layout-gap-xl);
        padding: var(--layout-padding-lg) var(--layout-padding-xl);
      }
      .table-pager > span {
        color: var(--color-text-base-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
        font-weight: var(--font-weight-accent);
      }
      .table-summary {
        margin: 0;
        color: var(--color-text-base-subtle);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
      .table-pager {
        justify-self: end;
        gap: var(--layout-gap-md);
      }
      @media (max-width: 767px) {
        .table-footer {
          display: flex;
          align-items: flex-start;
          flex-direction: column;
          gap: var(--layout-gap-md);
        }
      }
    `,
  ],
})
export class CaptureOrderBulkHistoryDialogComponent {
  protected readonly state = inject(CaptureOrdersService);

  @ViewChild('fileCell', { static: true }) private fileCellRef!: TemplateRef<unknown>;
  @ViewChild('resultCell', { static: true }) private resultCellRef!: TemplateRef<unknown>;

  protected readonly tableColumns: TableColumn[] = [
    { key: 'file', label: 'Archivo' },
    { key: 'result', label: 'Resultado' },
  ];
  /** Fijo, no configurable — a diferencia de la matriz de Capturas, aquí no hay selector de "Filas por página". */
  protected readonly rowsPerPage = 10;
  protected readonly page = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.state.bulkUploadBatches().length / this.rowsPerPage)),
  );
  protected readonly visibleBatches = computed(() => {
    const start = (this.page() - 1) * this.rowsPerPage;
    return this.state.bulkUploadBatches().slice(start, start + this.rowsPerPage);
  });
  protected readonly tableRows = computed<TableRow[]>(() =>
    this.visibleBatches().map((batch) => ({
      key: batch.id,
      cells: [
        { template: this.fileCellRef, context: { $implicit: batch } },
        { template: this.resultCellRef, context: { $implicit: batch } },
      ],
    })),
  );
  protected readonly tableSummary = computed(() => {
    const total = this.state.bulkUploadBatches().length;
    if (!total) return '0 registros';
    const first = (this.page() - 1) * this.rowsPerPage + 1;
    return `${first}–${Math.min(first + this.rowsPerPage - 1, total)} de ${total} registros`;
  });

  protected resultSummary(batch: { totalRows: number; createdCount: number; autoClosedCount: number }): string {
    return `${batch.totalRows} filas · ${batch.createdCount} creadas · ${batch.autoClosedCount} actualizadas`;
  }
}
