import type { CaptureFinanciera } from './mock-capture-orders.service';

/**
 * Detección de proveedor por firma de columnas — ninguno de los dos formatos
 * reales (Santander, Mapfre) trae una columna de "financiera/concesionario":
 * la entidad se infiere por qué columnas trae el archivo, nunca se lee de un
 * valor. Columnas DISTINTIVAS a propósito (no las 41/20 completas de cada
 * formato): un proveedor real agrega/quita columnas con el tiempo, así que
 * exigir el 100% del set se rompería con el primer cambio menor.
 */
export interface CaptureFormatColumnMap {
  unitCode: string;
  engineCode: string;
  chassisCode?: string;
  clientName?: string;
  marca?: string;
  modelo?: string;
  caseNumber?: string;
  source?: string;
  receivedOn?: string;
}

export interface CaptureFormatSignature {
  financiera: CaptureFinanciera;
  /** Headers normalizados (ver `normalizeHeader`) que deben estar TODOS presentes para reconocer este formato. */
  requiredColumns: readonly string[];
  columnMap: CaptureFormatColumnMap;
}

/** `"Proveedor Gps"`, `"PROVEEDOR_GPS"` y `"proveedor  gps"` deben comparar igual. */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, ' ');
}

export const CAPTURE_FORMAT_SIGNATURES: readonly CaptureFormatSignature[] = [
  {
    financiera: 'Santander',
    requiredColumns: ['DNI', 'TIPO MORA', 'N MOTOR', 'DIVPOLTRAN GENERAL'],
    columnMap: {
      unitCode: 'PLACA',
      engineCode: 'N MOTOR',
      chassisCode: 'CHASIS',
      clientName: 'CLIENTE',
      marca: 'MARCA',
      modelo: 'MODELO',
      caseNumber: 'NRO EXPEDIENTE INCAUTACION',
      source: 'ESTUDIO',
      receivedOn: 'FECHA RECEPCION OFICIO ORDEN CAPTURA',
    },
  },
  {
    financiera: 'Mapfre',
    requiredColumns: ['NUM OPE', 'PROVEEDOR GPS', 'RQ', 'ESTADO OPERACION'],
    columnMap: {
      unitCode: 'PLACA',
      engineCode: 'MOTOR',
      chassisCode: 'CHASIS',
      clientName: 'CLIENTE',
      marca: 'MARCA',
      modelo: 'MODELO',
      caseNumber: 'EXPEDIENTE',
      source: 'ESTUDIO',
      receivedOn: 'FEC ASIGNACION ESTADOS',
    },
  },
];

/**
 * Devuelve la firma cuyas columnas distintivas están TODAS presentes en el
 * archivo, o `null` si no matchea ninguna ("formato no reconocido" — se
 * indica al usuario, no se intenta adivinar ni "aprender" un formato nuevo).
 */
export function detectCaptureFormat(headers: readonly string[]): CaptureFormatSignature | null {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  return (
    CAPTURE_FORMAT_SIGNATURES.find((signature) =>
      signature.requiredColumns.every((column) => normalizedHeaders.has(column)),
    ) ?? null
  );
}

/** Quita guiones, puntos, espacios y cualquier otro caracter no alfanumérico de placas y motores — los datos de origen llegan "sucios". */
export function cleanAlphanumeric(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface ParsedCaptureRow {
  /** Fila real del archivo (1 = encabezado, 2 = primer registro) — para mostrarla tal cual en la revisión, igual que hoy. */
  rowNumber: number;
  unitCode: string;
  engineCode: string;
  chassisCode: string;
  clientName: string;
  marca: string;
  modelo: string;
  caseNumber: string;
  source: string;
  receivedOn: string;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** `headerRow` ya normalizado a mayúsculas por `normalizeHeader` en el mismo orden que `dataRows`. */
export function parseCaptureRows(
  signature: CaptureFormatSignature,
  headerRow: readonly string[],
  dataRows: readonly unknown[][],
): ParsedCaptureRow[] {
  const columnIndex = new Map(headerRow.map((header, index) => [header, index]));
  const indexOf = (column: string | undefined): number =>
    column !== undefined ? (columnIndex.get(column) ?? -1) : -1;

  const unitCodeIndex = indexOf(signature.columnMap.unitCode);
  const engineCodeIndex = indexOf(signature.columnMap.engineCode);
  const chassisCodeIndex = indexOf(signature.columnMap.chassisCode);
  const clientNameIndex = indexOf(signature.columnMap.clientName);
  const marcaIndex = indexOf(signature.columnMap.marca);
  const modeloIndex = indexOf(signature.columnMap.modelo);
  const caseNumberIndex = indexOf(signature.columnMap.caseNumber);
  const sourceIndex = indexOf(signature.columnMap.source);
  const receivedOnIndex = indexOf(signature.columnMap.receivedOn);

  return dataRows.map((row, index) => ({
    rowNumber: index + 2,
    unitCode: cleanAlphanumeric(cellText(row[unitCodeIndex])),
    engineCode: cleanAlphanumeric(cellText(row[engineCodeIndex])),
    chassisCode: cellText(row[chassisCodeIndex]),
    clientName: cellText(row[clientNameIndex]),
    marca: cellText(row[marcaIndex]),
    modelo: cellText(row[modeloIndex]),
    caseNumber: cellText(row[caseNumberIndex]),
    source: cellText(row[sourceIndex]),
    receivedOn: cellText(row[receivedOnIndex]),
  }));
}
