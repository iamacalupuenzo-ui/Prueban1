import * as XLSX from 'xlsx';
import { normalizeHeader } from './capture-order-formats';

export interface CaptureWorkbookRows {
  /** Encabezados ya normalizados (`normalizeHeader`) — listos para `detectCaptureFormat`/`parseCaptureRows`. */
  headers: string[];
  rows: unknown[][];
}

/**
 * Único punto de contacto con SheetJS — el resto del código no importa
 * `xlsx` directo. `cellDates: true` para que las fechas (Excel las guarda
 * como número serie, ej. `15108`) lleguen como `Date` reales en vez de tener
 * que parsear el serial a mano. Sirve para `.xlsx`, `.xls` y `.csv` por
 * igual: SheetJS los parsea todos con el mismo `read`.
 */
export async function readCaptureWorkbook(file: File): Promise<CaptureWorkbookRows> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const [headerRow, ...dataRows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headers = (headerRow ?? []).map((header) => normalizeHeader(String(header ?? '')));
  return { headers, rows: dataRows };
}
