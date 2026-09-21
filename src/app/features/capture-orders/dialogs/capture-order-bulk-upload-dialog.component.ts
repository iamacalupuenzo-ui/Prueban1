import { Component, TemplateRef, ViewChild, computed, inject } from '@angular/core';
import { Button, Icon, Modal, Pagination, Table, TableColumn, TableRow } from '@iamacalupuenzo-ui/comsatel-ds';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Diálogo de carga masiva de capturas. Extraído de
 * `new-capture-order.page.ts` (el `cs-modal` "Carga masiva de capturas",
 * líneas ~812-921 del archivo original).
 *
 * `copiedBulkUnitCode`/`copyBulkUnitCode` viven en `CaptureOrdersService`
 * porque el original compartía una sola señal de "recién copiado" con la
 * celda de última ubicación de la tabla y el detalle de la orden (copiar en
 * un lugar apaga el aviso del otro); separar esa señal por componente
 * cambiaría ese comportamiento.
 */
@Component({
  selector: 'app-capture-order-bulk-upload-dialog',
  imports: [Button, Icon, Modal, Pagination, Table],
  template: `
    <ng-template #bulkErrorUnitCell let-row>
      <span
        class="copy-on-hover"
        role="button"
        tabindex="0"
        [attr.aria-label]="
          state.copiedBulkUnitCode() === row.unitCode
            ? 'Código de unidad ' + row.unitCode + ' copiado'
            : 'Copiar código de unidad ' + row.unitCode
        "
        (click)="state.copyBulkUnitCode(row.unitCode)"
        (keydown.enter)="state.copyBulkUnitCode(row.unitCode)"
        (keydown.space)="$event.preventDefault(); state.copyBulkUnitCode(row.unitCode)"
      >
        <span>{{ row.unitCode }}</span>
        <cs-icon name="copy" [size]="12" aria-hidden="true" />
      </span>
    </ng-template>
    <cs-modal
      class="capture-surface-modal bulk-upload-modal"
      [isOpen]="state.bulkUploadOpen()"
      title="Carga masiva de capturas"
      width="lg"
      [primaryAction]="state.bulkPrimaryAction()"
      [secondaryAction]="state.bulkSecondaryAction()"
      (primaryActionClick)="state.runBulkPrimaryAction()"
      (secondaryActionClick)="state.closeBulkUpload()"
      (closed)="state.closeBulkUpload()"
    >
      <div class="bulk-upload-content">
        @if (state.bulkUploadStage() === 'select') {
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
              <cs-button variant="default" size="sm" (click)="state.downloadBulkTemplate()"
                ><cs-icon name="download" [size]="16" aria-hidden="true" />Descargar plantilla</cs-button
              >
            </div>
          </div>
          <input
            #bulkFileInput
            class="visually-hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            (change)="state.selectBulkFile($event)"
          />
          <div
            class="bulk-dropzone"
            (dragover)="state.allowBulkDrop($event)"
            (drop)="state.dropBulkFile($event)"
          >
            <cs-icon name="file-text" [size]="24" aria-hidden="true" />
            <strong>Arrastra el archivo aquí</strong>
            <span>Formatos admitidos: XLSX, XLS o CSV. Tamaño máximo: 10 MB.</span>
            <cs-button variant="default" size="sm" (click)="bulkFileInput.click()"
              ><cs-icon name="file-text" [size]="16" aria-hidden="true" />Seleccionar archivo</cs-button
            >
          </div>
          @if (state.bulkUploadError()) {
            <p class="field-error" role="alert">{{ state.bulkUploadError() }}</p>
          }
        } @else if (state.bulkUploadStage() === 'validating') {
          <div class="bulk-upload-state" role="status" aria-live="polite">
            <cs-icon name="loader" [size]="24" aria-hidden="true" />
            <strong>Validando archivo…</strong>
            <span>Comprobamos columnas, datos obligatorios y órdenes activas.</span>
          </div>
        } @else if (state.bulkUploadStage() === 'review') {
          <div class="bulk-upload-review">
            <div class="bulk-upload-review__summary">
              <div>
                <strong>{{ state.bulkValidRows().length }}</strong><span>listas para cargar</span>
              </div>
              <div class="is-rejected">
                <strong>{{ state.bulkRejectedRows().length }}</strong><span>no se cargarán</span>
              </div>
            </div>
            <p>
              <strong>{{ state.bulkFileName() }}</strong> cumple la estructura de la plantilla. Solo se
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
                @if (state.bulkErrorPages() > 1) {
                  <footer class="bulk-errors__footer">
                    <span>{{ state.bulkErrorSummary() }}</span>
                    <cs-pagination
                      [page]="state.bulkErrorPage()"
                      [totalPages]="state.bulkErrorPages()"
                      navLabel="Paginación de filas rechazadas"
                      (pageChange)="state.setBulkErrorPage($event)"
                    />
                  </footer>
                }
              </div>
            </section>
          </div>
        } @else if (state.bulkUploadStage() === 'uploading') {
          <div class="bulk-upload-state" role="status" aria-live="polite">
            <cs-icon name="loader" [size]="24" aria-hidden="true" />
            <strong>Cargando datos…</strong>
            <span>Registramos {{ state.bulkValidRows().length }} capturas válidas.</span>
          </div>
        } @else {
          <div class="bulk-upload-state bulk-upload-state--success" role="status" aria-live="polite">
            <cs-icon name="circle-check" [size]="28" aria-hidden="true" />
            <strong>Datos cargados exitosamente</strong>
            <span>
              Se registraron {{ state.bulkLoadedCount() }} capturas. Las
              {{ state.bulkRejectedRows().length }} filas observadas permanecen sin registrar.
            </span>
          </div>
        }
      </div>
    </cs-modal>
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
      .field-error {
        margin: 0;
        color: var(--color-text-danger-default);
        font-size: var(--font-size-content-note);
        line-height: var(--font-line-height-content-note);
      }
    `,
  ],
})
export class CaptureOrderBulkUploadDialogComponent {
  protected readonly state = inject(CaptureOrdersService);

  protected readonly bulkErrorColumns: TableColumn[] = [
    { key: 'row', label: 'Fila', width: '72px' },
    { key: 'unit', label: 'Unidad', width: '128px' },
    { key: 'reason', label: 'Motivo' },
  ];

  @ViewChild('bulkErrorUnitCell', { static: true })
  private bulkErrorUnitCellRef!: TemplateRef<unknown>;

  protected readonly bulkErrorTableRows = computed<TableRow[]>(() =>
    this.state.bulkErrorRowsForPage().map((row) => ({
      key: `bulk-error-${row.row}`,
      cells: [
        String(row.row),
        { template: this.bulkErrorUnitCellRef, context: { $implicit: row } },
        row.reason ?? 'Requiere corrección.',
      ],
    })),
  );
}
