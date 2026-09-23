import { Component, TemplateRef, ViewChild, computed, inject } from '@angular/core';
import {
  Button,
  Icon,
  Modal,
  Pagination,
  Radio,
  RadioGroup,
  Table,
  TableColumn,
  TableRow,
} from '@iamacalupuenzo-ui/comsatel-ds';
import type { ResolveConflictChoice } from '../../../core/orders/mock-capture-orders.service';
import { CaptureOrdersService } from '../capture-orders.service';

/**
 * Diálogo de carga masiva de capturas. Extraído de
 * `new-capture-order.page.ts` (el `cs-modal` "Carga masiva de capturas",
 * líneas ~812-921 del archivo original).
 *
 * La tabla de revisión es UNA sola (`state.bulkReviewRows()`), no dos
 * secciones separadas: combina las filas rechazadas por un error real del
 * archivo (duplicado dentro del mismo archivo) y las filas en conflicto
 * (el sistema y el archivo no coinciden). La última columna muestra el
 * motivo como texto para las rechazadas, o el control Sistema/Archivo para
 * las que requieren una decisión — misma tabla, misma paginación.
 *
 * `copiedBulkUnitCode`/`copyBulkUnitCode` viven en `CaptureOrdersService`
 * porque el original compartía una sola señal de "recién copiado" con la
 * celda de última ubicación de la tabla y el detalle de la orden (copiar en
 * un lugar apaga el aviso del otro); separar esa señal por componente
 * cambiaría ese comportamiento.
 */
@Component({
  selector: 'app-capture-order-bulk-upload-dialog',
  imports: [Button, Icon, Modal, Pagination, Radio, RadioGroup, Table],
  template: `
    <ng-template #bulkReviewUnitCell let-row>
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
    <ng-template #bulkReviewDecisionCell let-row>
      @if (row.kind === 'conflict') {
        <span class="bulk-review-decision">
          <cs-radio-group
            orientation="horizontal"
            [value]="state.bulkConflictChoices()[row.orderId] ?? ''"
            [ariaLabel]="'Resolver conflicto de ' + row.unitCode"
            (valueChange)="onConflictChoice(row.orderId, $event)"
          >
            <cs-radio value="keep-system" [label]="'Sistema (' + row.currentStatus + ')'" size="sm" />
            <cs-radio
              value="accept-upload"
              [label]="'Archivo (' + row.acceptedStatus + ')'"
              size="sm"
            />
          </cs-radio-group>
        </span>
      } @else {
        {{ row.reason }}
      }
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
              Carga un archivo con órdenes de captura de Santander o Mapfre. El sistema detecta
              automáticamente a qué proveedor pertenece por la estructura de sus columnas — no hace
              falta elegirlo ni seguir una plantilla fija.
            </p>
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
            <div class="bulk-progress" role="progressbar" [attr.aria-valuenow]="state.bulkValidationProgress()" aria-valuemin="0" aria-valuemax="100">
              <div class="bulk-progress__fill" [style.width.%]="state.bulkValidationProgress()"></div>
            </div>
            <strong>Validando archivo… {{ state.bulkValidationProgress() }}%</strong>
            <span>Comprobamos formato, unidades, contrato (SAP) y última posición.</span>
          </div>
        } @else if (state.bulkUploadStage() === 'review') {
          <div class="bulk-upload-review">
            <div class="bulk-upload-review__summary">
              <div>
                <strong>{{ state.bulkValidRows().length }}</strong><span>listas para cargar</span>
              </div>
              @if (state.bulkConflictRows().length) {
                <div class="is-conflict">
                  <strong>{{ state.bulkConflictRows().length }}</strong
                  ><span>requieren una decisión</span>
                </div>
              }
              <div class="is-rejected">
                <strong>{{ state.bulkRejectedRows().length }}</strong><span>no se cargarán</span>
              </div>
            </div>
            <p>
              <strong>{{ state.bulkFileName() }}</strong> — formato detectado:
              <strong>{{ state.bulkDetectedFinanciera() }}</strong>. Solo se detallan las filas que
              requieren corrección o una decisión.
            </p>
            <section class="bulk-errors" aria-labelledby="bulk-errors-title">
              <h3 id="bulk-errors-title">Filas que requieren corrección o una decisión</h3>
              <div class="bulk-errors__table-frame">
                <cs-table
                  [columns]="bulkReviewColumns"
                  [rows]="bulkReviewTableRows()"
                  caption="Filas que requieren corrección o una decisión antes de cargar"
                />
                @if (state.bulkReviewPages() > 1) {
                  <footer class="bulk-errors__footer">
                    <span>{{ state.bulkReviewSummary() }}</span>
                    <cs-pagination
                      [page]="state.bulkReviewPage()"
                      [totalPages]="state.bulkReviewPages()"
                      navLabel="Paginación de filas de revisión"
                      (pageChange)="state.setBulkReviewPage($event)"
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
      /* El radio va centrado verticalmente dentro de la celda, igual que el
         estándar de casillas de la columna "Documentos" de la matriz. */
      .bulk-review-decision {
        display: flex;
        align-items: center;
      }
      .bulk-review-decision cs-radio-group {
        display: flex;
        align-items: center;
      }
    `,
  ],
})
export class CaptureOrderBulkUploadDialogComponent {
  protected readonly state = inject(CaptureOrdersService);

  protected onConflictChoice(orderId: string, value: string): void {
    this.state.setBulkConflictChoice(orderId, value as ResolveConflictChoice);
  }

  protected readonly bulkReviewColumns: TableColumn[] = [
    { key: 'row', label: 'Fila', width: '72px' },
    { key: 'unit', label: 'Unidad', width: '128px' },
    { key: 'decision', label: 'Motivo / Decisión' },
  ];

  @ViewChild('bulkReviewUnitCell', { static: true })
  private bulkReviewUnitCellRef!: TemplateRef<unknown>;
  @ViewChild('bulkReviewDecisionCell', { static: true })
  private bulkReviewDecisionCellRef!: TemplateRef<unknown>;

  protected readonly bulkReviewTableRows = computed<TableRow[]>(() =>
    this.state.bulkReviewRowsForPage().map((row, index) => ({
      key: row.kind === 'conflict' ? `conflict-${row.orderId}` : `rejected-${row.rowNumber}-${index}`,
      cells: [
        row.rowNumber != null ? String(row.rowNumber) : '—',
        { template: this.bulkReviewUnitCellRef, context: { $implicit: row } },
        { template: this.bulkReviewDecisionCellRef, context: { $implicit: row } },
      ],
    })),
  );
}
