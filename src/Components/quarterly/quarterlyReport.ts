import * as XLSX from 'xlsx';

export const MONTH_NAMES = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

const MONTH_STEMS = [
  'січ', 'лют', 'берез', 'квіт', 'трав', 'черв',
  'лип', 'серп', 'верес', 'жовт', 'листоп', 'груд',
];

export const MISSING_VALUE = 'Немає';
export const INVALID_VALUE = 'Н/Д';
export const DUPLICATE_VALUE = 'Дубль';

export type ReportStatus = 'Співпадає' | 'Розбіжність' | 'Немає місяця' | 'Помилка даних';
type SourceValue = string | number | boolean | null;
export type ReportValue = number | typeof MISSING_VALUE | typeof INVALID_VALUE | typeof DUPLICATE_VALUE;

export interface VehicleRecord {
  key: string | null;
  carNumber: string;
  rowNumber: number;
  sheetName: string;
  start: number | null;
  mileage: number | null;
  end: number | null;
  raw: SourceValue[];
  issues: string[];
}

export interface MonthlyData {
  monthIndex: number;
  fileName: string;
  records: VehicleRecord[];
}

export interface QuarterlyRow {
  carNumber: string;
  months: ReportValue[];
  total: number | null;
  start: number | null;
  expectedEnd: number | null;
  actualEnd: number | null;
  difference: number | null;
  missingMonths: string[];
  status: ReportStatus;
  notes: string;
}

export interface ProblemRecord {
  monthName: string;
  fileName: string;
  record: VehicleRecord;
}

export interface QuarterlyReport {
  months: MonthlyData[];
  rows: QuarterlyRow[];
  problems: ProblemRecord[];
  unidentifiedCount: number;
  counts: Record<ReportStatus, number>;
}

export const detectMonth = (fileName: string): number | null => {
  const words = fileName.toLocaleLowerCase('uk').split(/[^а-яіїєґ]+/u);
  const matches = MONTH_STEMS.map((stem, index) => (
    words.some((word) => word.startsWith(stem)) ? index : -1
  )).filter((index) => index !== -1);
  return matches.length === 1 ? matches[0] : null;
};

export const isConsecutivePeriod = (months: number[]): boolean => (
  months.length === 3
  && months.every((month) => Number.isInteger(month) && month >= 0 && month < 12)
  && months[1] === (months[0] + 1) % 12
  && months[2] === (months[0] + 2) % 12
);

/** Finds the chronological order even for November–January or December–February. */
export const orderDetectedMonths = (months: number[]): number[] | null => {
  if (new Set(months).size !== 3) return null;
  for (const first of months) {
    const ordered = [first, (first + 1) % 12, (first + 2) % 12];
    if (ordered.every((month) => months.includes(month))) return ordered;
  }
  return null;
};

const normalizeHeader = (value: unknown): string => (
  String(value ?? '').normalize('NFKC').toLocaleLowerCase('uk').replace(/[^а-яіїєґa-z0-9]/gu, '')
);

const asSourceValue = (value: unknown): SourceValue => {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
};

const isBlank = (value: unknown): boolean => value == null || String(value).trim() === '';

/** Keep the whole registration number and leading zeroes; only normalize visual separators. */
export const normalizeCarNumber = (value: unknown): string | null => {
  if ((typeof value !== 'string' && typeof value !== 'number') || isBlank(value)) return null;
  const text = String(value).normalize('NFKC').trim().toUpperCase();
  if (!/\d/.test(text)) return null;
  const lookalikes: Record<string, string> = {
    А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', І: 'I', К: 'K',
    М: 'M', О: 'O', Р: 'P', Т: 'T', Х: 'X', У: 'Y',
  };
  return text.replace(/[АВСЕНІКМОРТХУ]/g, (letter) => lookalikes[letter])
    .replace(/[\s\u200B\uFEFF\-–—]/g, '');
};

export const parseMileage = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || isBlank(value)) return null;
  const normalized = value.trim().replace(/\s*км\.?$/iu, '').replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const headerColumns = (row: unknown[]): number[] | null => {
  const headers = row.map(normalizeHeader);
  const numberAliases = ['номер', 'номеравтомобіля', 'номермашини', 'державнийномер', 'реєстраційнийномер'];
  const columns = [
    headers.findIndex((header) => numberAliases.includes(header)),
    headers.findIndex((header) => header.startsWith('кілометражнапочатокмісяця')),
    headers.findIndex((header) => header.startsWith('кілометражзамісяць')),
    headers.findIndex((header) => header.startsWith('кілометражнакінецьмісяця')),
  ];
  return columns.every((column) => column >= 0) ? columns : null;
};

export const readMonthlyWorkbook = (
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
  monthIndex: number,
): MonthlyData => {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const records: VehicleRecord[] = [];
  let foundHeader = false;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet['!ref']) continue;
    const sourceRange = XLSX.utils.decode_range(sheet['!ref']);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1, raw: true, defval: null, blankrows: true,
    });
    const headerIndex = rows.findIndex((row) => headerColumns(row) !== null);
    if (headerIndex < 0) continue;
    const columns = headerColumns(rows[headerIndex]);
    if (!columns) continue;
    foundHeader = true;

    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const source = rows[rowIndex];
      if (source.every(isBlank) || headerColumns(source)) continue;
      // Use cached formula results. A formula without a cached value is an error, never zero.
      const raw = columns.map((column) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: sourceRange.s.r + rowIndex, c: sourceRange.s.c + column })];
        if (cell?.t === 'e') return cell.w || '#ERROR!';
        if (cell?.f && cell.v == null) return `Формула без результату: ${cell.f}`;
        return asSourceValue(source[column]);
      });
      if (raw.every(isBlank)) continue;
      const carNumber = String(raw[0] ?? '').trim();
      const key = normalizeCarNumber(raw[0]);
      const values = raw.slice(1).map(parseMileage);
      const issues: string[] = key ? [] : ['Номер автомобіля відсутній або невідомий. Неможливо зіставити місяці.'];
      ['Кілометраж на початок', 'Кілометраж за місяць', 'Кілометраж на кінець'].forEach((label, index) => {
        if (values[index] == null) issues.push(`${label}: ${isBlank(raw[index + 1]) ? 'порожня клітинка' : 'нечислове значення'}.`);
        else if (values[index]! < 0) issues.push(`${label}: від’ємне значення.`);
      });
      records.push({
        key, carNumber, rowNumber: sourceRange.s.r + rowIndex + 1, sheetName,
        start: values[0], mileage: values[1], end: values[2], raw, issues,
      });
    }
  }

  if (!foundHeader) {
    throw new Error(`Файл «${fileName}»: не знайдено колонок «Номер», «Кілометраж на початок місяця», «Кілометраж за місяць», «Кілометраж на кінець місяця».`);
  }
  if (records.length === 0) throw new Error(`Файл «${fileName}» не містить даних автомобілів.`);
  return { monthIndex, fileName, records };
};

export const buildQuarterlyReport = (input: MonthlyData[]): QuarterlyReport => {
  if (!isConsecutivePeriod(input.map((month) => month.monthIndex))) {
    throw new Error('Оберіть три послідовні місяці в хронологічному порядку.');
  }
  // Work on copies: regenerating a report must not accumulate duplicate diagnostics.
  const months = input.map((month) => ({
    ...month, records: month.records.map((record) => ({ ...record, issues: [...record.issues] })),
  }));
  const numbers = new Map<string, string>();
  const problems: ProblemRecord[] = [];
  let unidentifiedCount = 0;
  const maps = months.map((month) => {
    const map = new Map<string, VehicleRecord[]>();
    month.records.forEach((record) => {
      if (!record.key) {
        unidentifiedCount += 1;
        return;
      }
      if (!numbers.has(record.key)) numbers.set(record.key, record.carNumber);
      const matches = map.get(record.key) || [];
      matches.push(record);
      map.set(record.key, matches);
    });
    map.forEach((records) => {
      if (records.length > 1) {
        records.forEach((record) => record.issues.push('Дублікат номера в цьому місяці. Значення не підсумовано: неможливо визначити правильний рядок.'));
      }
    });
    month.records.forEach((record) => {
      if (record.issues.length) problems.push({ monthName: MONTH_NAMES[month.monthIndex], fileName: month.fileName, record });
    });
    return map;
  });

  const counts: Record<ReportStatus, number> = {
    Співпадає: 0, Розбіжність: 0, 'Немає місяця': 0, 'Помилка даних': 0,
  };
  const rows: QuarterlyRow[] = [];
  numbers.forEach((carNumber, key) => {
    const matches = maps.map((map) => map.get(key) || []);
    const missingMonths = matches.flatMap((records, index) => (
      records.length === 0 ? [MONTH_NAMES[months[index].monthIndex]] : []
    ));
    const notes: string[] = [];
    const values: ReportValue[] = matches.map((records, index) => {
      const monthName = MONTH_NAMES[months[index].monthIndex];
      if (records.length === 0) return MISSING_VALUE;
      if (records.length > 1) {
        notes.push(`${monthName}: дублікат номера (${records.map((record) => `${record.sheetName}, рядок ${record.rowNumber}`).join('; ')}). Див. «Проблемні дані».`);
        return DUPLICATE_VALUE;
      }
      records[0].issues.forEach((issue) => notes.push(`${monthName}: ${issue}`));
      return records[0].mileage ?? INVALID_VALUE;
    });
    const hasInvalidMileage = values.some((value) => value === INVALID_VALUE || value === DUPLICATE_VALUE);
    const total = hasInvalidMileage ? null : values.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
    // Never substitute the first/last available month for the actual period boundaries.
    const start = matches[0].length === 1 ? matches[0][0].start : null;
    const actualEnd = matches[2].length === 1 ? matches[2][0].end : null;
    const expectedEnd = start !== null && total !== null ? start + total : null;
    const difference = expectedEnd !== null && actualEnd !== null
      ? Math.round((expectedEnd - actualEnd) * 1_000_000) / 1_000_000 : null;
    const hasDataIssues = notes.length > 0;
    if (missingMonths.length) {
      notes.unshift(`Немає номера в місяцях: ${missingMonths.join(', ')}. Сума лише за наявними місяцями; перевірка кварталу неповна.`);
    }
    const status: ReportStatus = missingMonths.length ? 'Немає місяця'
      : hasDataIssues || total === null || difference === null ? 'Помилка даних'
        : difference === 0 ? 'Співпадає' : 'Розбіжність';
    counts[status] += 1;
    rows.push({ carNumber, months: values, total, start, expectedEnd, actualEnd, difference, missingMonths, status, notes: notes.join(' ') });
  });
  return { months, rows, problems, unidentifiedCount, counts };
};
