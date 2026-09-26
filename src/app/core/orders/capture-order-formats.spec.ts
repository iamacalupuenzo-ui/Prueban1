import { describe, expect, it } from 'vitest';
import {
  cleanAlphanumeric,
  detectCaptureFormat,
  normalizeHeader,
  parseCaptureRows,
  CAPTURE_FORMAT_SIGNATURES,
} from './capture-order-formats';

// Headers reales de cada proveedor (Santander: 41 columnas UPPER_SNAKE_CASE,
// MAF: 20 columnas Title_Case) — solo las que importan para detección y
// mapeo, los datos de las filas son sintéticos (no las PII reales del
// archivo compartido).
const SANTANDER_HEADERS = [
  'DNI',
  'CLIENTE',
  'ESTUDIO',
  'PLACA',
  'MARCA',
  'MODELO',
  'TIPO_MORA',
  'N_MOTOR',
  'CHASIS',
  'DIVPOLTRAN_GENERAL',
  'NRO_EXPEDIENTE_INCAUTACION',
  'FECHA_RECEPCION_OFICIO_ORDEN_CAPTURA',
];

const MAF_HEADERS = [
  'Num_Ope',
  'Cliente',
  'Placa',
  'Expediente',
  'Estado',
  'Estudio',
  'Proveedor Gps',
  'Modelo',
  'Marca',
  'Motor',
  'Chasis',
  'Estado_Operacion',
  'RQ',
  'Fec_asignacion_Estados',
];

describe('normalizeHeader', () => {
  it('trata mayúsculas, guiones bajos y espacios como el mismo header', () => {
    expect(normalizeHeader('Proveedor Gps')).toBe(normalizeHeader('PROVEEDOR_GPS'));
    expect(normalizeHeader('  N_Motor ')).toBe('N MOTOR');
  });
});

describe('detectCaptureFormat', () => {
  it('reconoce Santander por sus columnas distintivas', () => {
    expect(detectCaptureFormat(SANTANDER_HEADERS)?.financiera).toBe('Santander');
  });

  it('reconoce MAF por sus columnas distintivas', () => {
    expect(detectCaptureFormat(MAF_HEADERS)?.financiera).toBe('MAF');
  });

  it('devuelve null cuando el archivo no coincide con ningún formato conocido', () => {
    expect(detectCaptureFormat(['NOMBRE', 'CORREO', 'TELEFONO'])).toBeNull();
  });

  it('cada firma conocida se detecta a sí misma', () => {
    for (const signature of CAPTURE_FORMAT_SIGNATURES) {
      expect(detectCaptureFormat(signature.requiredColumns)?.financiera).toBe(signature.financiera);
    }
  });
});

describe('cleanAlphanumeric', () => {
  it('quita guiones, puntos y espacios de placas y motores', () => {
    expect(cleanAlphanumeric('B-SQ 205')).toBe('BSQ205');
    expect(cleanAlphanumeric('GPW-574.813')).toBe('GPW574813');
  });
});

describe('parseCaptureRows', () => {
  it('mapea y limpia las columnas de Santander', () => {
    const signature = detectCaptureFormat(SANTANDER_HEADERS)!;
    const dataRows = [
      [
        '00214727',
        'CLIENTE DE PRUEBA UNO',
        'VILLALOBOS',
        'B-SQ 205',
        'TOYOTA',
        'YARIS',
        '[61 - ++]',
        '460-624',
        '1C4HJXFG9PW574813',
        'DIRECCION GENERAL',
        '12754-2021-0-1817-JR-CO-05',
        new Date(2026, 0, 15),
      ],
    ];
    const [row] = parseCaptureRows(signature, SANTANDER_HEADERS.map(normalizeHeader), dataRows);
    expect(row.unitCode).toBe('BSQ205');
    expect(row.engineCode).toBe('460624');
    expect(row.clientName).toBe('CLIENTE DE PRUEBA UNO');
    expect(row.source).toBe('VILLALOBOS');
    expect(row.caseNumber).toBe('12754-2021-0-1817-JR-CO-05');
    expect(row.receivedOn).toBe('2026-01-15');
  });

  it('mapea y limpia las columnas de MAF', () => {
    const signature = detectCaptureFormat(MAF_HEADERS)!;
    const dataRows = [
      [
        '61215',
        'CLIENTE DE PRUEBA DOS',
        'BAB.711',
        '09740-2021',
        'POR CAPTURAR',
        'MUÑIZ',
        'HUNTER',
        'Hilux 4x2',
        'TOYOTA',
        '2GD-4553316',
        '8AJJB8DD1K4276028',
        'Castigado',
        'SI',
        new Date(2021, 5, 20),
      ],
    ];
    const [row] = parseCaptureRows(signature, MAFRE_HEADERS.map(normalizeHeader), dataRows);
    expect(row.unitCode).toBe('BAB711');
    expect(row.engineCode).toBe('2GD4553316');
    expect(row.clientName).toBe('CLIENTE DE PRUEBA DOS');
    expect(row.source).toBe('MUÑIZ');
    expect(row.caseNumber).toBe('09740-2021');
  });
});
