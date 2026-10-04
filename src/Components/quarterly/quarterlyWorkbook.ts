import ExcelJS from 'exceljs';

import {
  INVALID_VALUE, MONTH_NAMES, MISSING_VALUE,
} from './quarterlyReport';
import type { QuarterlyReport } from './quarterlyReport';

// General preserves fractional mileage without adding a trailing decimal separator to integers.
const NUMBER_FORMAT = 'General';
const BLUE_FILL = 'FFDCEBFF';
const RED_FILL = 'FFFFDEDE';

const styleHeader = (sheet: ExcelJS.Worksheet, rowNumber: number) => {
  const row = sheet.getRow(rowNumber);
  row.height = 54;
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF24486B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
};

/** Uses ExcelJS already present in the app, so no new runtime dependency is needed. */
export const createQuarterlyWorkbook = (report: QuarterlyReport): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Квартальна відомість', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 8, showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const names = report.months.map((month) => MONTH_NAMES[month.monthIndex]);
  sheet.columns = [
    { width: 21 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 21 }, { width: 23 }, { width: 23 }, { width: 23 },
    { width: 17 }, { width: 21 }, { width: 72 },
  ];
  sheet.getCell('A2').value = `Квартальна відомість: ${names.join(', ')}`;
  sheet.getCell('A2').font = { name: 'Arial', size: 14, bold: true };
  sheet.getRow(2).height = 24;
  sheet.getCell('A3').value = 'Усі значення — км. Різниця = розрахований кінець − кінець з третього файлу.';
  sheet.getCell('A4').value = 'Червоний: розбіжність або помилка даних. Синій: номера немає хоча б в одному місяці (пріоритет кольору).';
  sheet.getCell('A5').value = '«Немає» — відсутній автомобіль; «Н/Д» — немає коректного значення; «Дубль» — номер повторюється.';
  sheet.getCell('A6').value = report.unidentifiedCount
    ? `Рядків без визначеного номера: ${report.unidentifiedCount}. Вони збережені на аркуші «Проблемні дані» й не об’єднані між собою.`
    : 'Автомобілі зіставлено за номером. Порядок першого файлу збережено; нові номери додано в кінці.';
  [3, 4, 5, 6].forEach((row) => {
    sheet.getCell(`A${row}`).font = { name: 'Arial', size: 10 };
    sheet.getRow(row).height = 18;
  });
  sheet.getRow(8).values = [
    'Номер автомобіля', ...names,
    'Сума за три місяці, км', `На початок: ${names[0]}, км`,
    'Розрахований кінець, км', `На кінець: ${names[2]}, км`,
    'Різниця, км', 'Перевірка', 'Примітки',
  ];
  styleHeader(sheet, 8);

  report.rows.forEach((record, index) => {
    const rowNumber = index + 9;
    const row = sheet.getRow(rowNumber);
    row.values = [
      record.carNumber, ...record.months, null, record.start ?? INVALID_VALUE,
      null, record.actualEnd ?? INVALID_VALUE, null, null, record.notes || null,
    ];
    // Cached results keep the report readable even in viewers without formula recalculation.
    row.getCell(5).value = {
      formula: `IF(COUNT(B${rowNumber}:D${rowNumber})+COUNTIFS(B${rowNumber}:D${rowNumber},"${MISSING_VALUE}")=3,SUM(B${rowNumber}:D${rowNumber}),"${INVALID_VALUE}")`,
      result: record.total ?? INVALID_VALUE,
    };
    row.getCell(7).value = {
      formula: `IF(COUNT(E${rowNumber},F${rowNumber})=2,F${rowNumber}+E${rowNumber},"${INVALID_VALUE}")`,
      result: record.expectedEnd ?? INVALID_VALUE,
    };
    row.getCell(9).value = {
      formula: `IF(COUNT(G${rowNumber}:H${rowNumber})=2,ROUND(G${rowNumber}-H${rowNumber},6),"${INVALID_VALUE}")`,
      result: record.difference ?? INVALID_VALUE,
    };
    row.getCell(10).value = {
      formula: `IF(COUNTIFS(B${rowNumber}:D${rowNumber},"${MISSING_VALUE}")>0,"Немає місяця",IF(OR(COUNT(B${rowNumber}:I${rowNumber})<>8,K${rowNumber}<>""),"Помилка даних",IF(I${rowNumber}=0,"Співпадає","Розбіжність")))`,
      result: record.status,
    };
    row.height = record.notes ? Math.max(42, Math.ceil(record.notes.length / 65) * 15) : 24;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { name: 'Arial', size: 10, bold: column === 5 };
      cell.alignment = { vertical: 'middle', horizontal: column >= 2 && column <= 9 ? 'right' : 'left', wrapText: column >= 10 };
      if (column >= 2 && column <= 9) cell.numFmt = NUMBER_FORMAT;
    });
    row.getCell(1).numFmt = '@';
  });

  const lastRow = 8 + report.rows.length;
  if (report.rows.length) {
    sheet.autoFilter = `A8:K${lastRow}`;
    sheet.addConditionalFormatting({
      ref: `A9:K${lastRow}`,
      rules: [
        { type: 'expression', priority: 1, formulae: ['$J9="Немає місяця"'], style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_FILL } }, font: { color: { argb: 'FF123D73' } },
        } },
        { type: 'expression', priority: 2, formulae: ['OR($J9="Розбіжність",$J9="Помилка даних")'], style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } }, font: { color: { argb: 'FF8B1B1B' } },
        } },
      ],
    });
  }
  sheet.pageSetup.printTitlesRow = '8:8';
  sheet.pageSetup.printArea = `A1:K${Math.max(lastRow, 8)}`;

  if (report.problems.length) {
    const problems = workbook.addWorksheet('Проблемні дані', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
    });
    problems.columns = [
      { header: 'Місяць', width: 16 }, { header: 'Файл', width: 48 },
      { header: 'Аркуш', width: 20 }, { header: 'Рядок джерела', width: 14 },
      { header: 'Номер автомобіля', width: 21 }, { header: 'На початок, км', width: 21 },
      { header: 'За місяць, км', width: 21 }, { header: 'На кінець, км', width: 21 },
      { header: 'Що перевірити', width: 80 },
    ];
    styleHeader(problems, 1);
    report.problems.forEach(({ monthName, fileName, record }) => {
      const row = problems.addRow([
        monthName, fileName, record.sheetName, record.rowNumber,
        record.carNumber || '(порожньо)', ...record.raw.slice(1), record.issues.join(' '),
      ]);
      row.height = Math.max(48, Math.ceil(record.issues.join(' ').length / 74) * 15);
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF8B1B1B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (column >= 6 && column <= 8) cell.numFmt = NUMBER_FORMAT;
      });
      row.getCell(5).numFmt = '@';
    });
    problems.autoFilter = `A1:I${problems.rowCount}`;
  }
  return workbook;
};
