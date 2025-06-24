/* eslint-disable no-empty */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import styles from './ExcelMerger.module.scss';

const monthNamesUa = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
];

const now = new Date();
const previousMonthIndex = (now.getMonth() + 11) % 12;
const previousMonthName = monthNamesUa[previousMonthIndex];

export const ExcelMergerExcelJS: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [targetFileName, setTargetFileName] = useState<string>('');

  const handleMerge = async () => {
    if (!sourceFile || !targetFile) {
      alert('Будь ласка, завантажте обидва файли');
      return;
    }

    const sourceBuffer = await sourceFile.arrayBuffer();
    const targetBuffer = await targetFile.arrayBuffer();

    const sourceWorkbook = new ExcelJS.Workbook();
    const targetWorkbook = new ExcelJS.Workbook();

    await sourceWorkbook.xlsx.load(sourceBuffer);
    await targetWorkbook.xlsx.load(targetBuffer);

    const sourceSheet = sourceWorkbook.worksheets[0];
    const targetSheet = targetWorkbook.worksheets[0];

    for (let row = 2; row <= sourceSheet.rowCount; row++) {
      const searchValue = sourceSheet.getCell(`A${row}`).value;
      const valueForK = sourceSheet.getCell(`B${row}`).value;
      const valueForG = sourceSheet.getCell(`H${row}`).value;
      const valueForN = sourceSheet.getCell(`C${row}`).value;
      const valueForP = sourceSheet.getCell(`D${row}`).value;
      const valueForR = sourceSheet.getCell(`E${row}`).value;
      const valueForV = sourceSheet.getCell(`F${row}`).value;
      const valueForZ = sourceSheet.getCell(`G${row}`).value;

      if (!searchValue) continue;
      targetSheet.eachRow((targetRow, rowIndex) => {
        const targetCellE = targetRow.getCell('E').value;

        const normalizedSearch = String(searchValue).trim().toLowerCase();
        const normalizedTarget = String(targetCellE ?? '')
          .trim()
          .toLowerCase();

        console.log(normalizedTarget.includes(normalizedSearch));

        if (normalizedTarget.includes(normalizedSearch)) {
          console.log(`✅ MATCH: "${searchValue}" → Рядок ${rowIndex}`);

          // K
          if (valueForK == null) {
          } else if (valueForK === 0) {
            targetRow.getCell('K').value = null;
            console.log(`  ⛔ Очистка K (було 0)`);
          } else {
            targetRow.getCell('K').value = valueForK;
            console.log(`  → K: ${valueForK}`);
          }

          // G
          if (valueForG == null) {
          } else if (valueForG === 0) {
            targetRow.getCell('G').value = null;
            console.log(`  ⛔ Очистка G (було 0)`);
          } else {
            targetRow.getCell('G').value = valueForG;
            console.log(`  → G: ${valueForG}`);
          }

          // N
          if (valueForN == null) {
          } else if (valueForN === 0) {
            targetRow.getCell('N').value = null;
            console.log(`  ⛔ Очистка N (було 0)`);
          } else {
            targetRow.getCell('N').value = valueForN;
            console.log(`  → N: ${valueForN}`);
          }

          // P
          if (valueForP == null) {
          } else if (valueForP === 0) {
            targetRow.getCell('P').value = null;
            console.log(`  ⛔ Очистка P (було 0)`);
          } else {
            targetRow.getCell('P').value = valueForP;
            console.log(`  → P: ${valueForP}`);
          }

          // R
          if (valueForR == null) {
          } else if (valueForR === 0) {
            targetRow.getCell('R').value = null;
            console.log(`  ⛔ Очистка R (було 0)`);
          } else {
            targetRow.getCell('R').value = valueForR;
            console.log(`  → R: ${valueForR}`);
          }

          // V
          if (valueForV == null) {
          } else if (valueForV === 0) {
            targetRow.getCell('V').value = null;
            console.log(`  ⛔ Очистка V (було 0)`);
          } else {
            targetRow.getCell('V').value = valueForV;
            console.log(`  → V: ${valueForV}`);
          }

          // Z
          if (valueForZ == null) {
          } else if (valueForZ === 0) {
            targetRow.getCell('Z').value = null;
            console.log(`  ⛔ Очистка Z (було 0)`);
          } else {
            targetRow.getCell('Z').value = valueForZ;
            console.log(`  → Z: ${valueForZ}`);
          }

          targetRow.commit();
        }
      });
    }

    const updatedBuffer = await targetWorkbook.xlsx.writeBuffer();
    const blob = new Blob([updatedBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `ЗВЕДЕНА_ВІДОМІСТЬ_${previousMonthName}.xlsx`);
  };

  return (
    <div className="wrapper">
      <div className={styles.mergeContainer}>
        <h3 className={styles.title}>Злиття Excel файлів</h3>

        <div className={styles.field}>
          <label htmlFor="source">1️⃣ Джерело (xlsx з даними):</label>
          <input
            id="source"
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setSourceFile(file);
              setSourceFileName(file?.name || '');
            }}
          />
          {sourceFileName && (
            <p className={styles.fileName}>📄 Обраний файл: {sourceFileName}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="target">2️⃣ Ціль (xlsx з таблицею):</label>
          <input
            id="target"
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setTargetFile(file);
              setTargetFileName(file?.name || '');
            }}
          />
          {targetFileName && (
            <p className={styles.fileName}>📄 Обраний файл: {targetFileName}</p>
          )}
        </div>

        <button
          className={styles.mergeButton}
          onClick={handleMerge}
          disabled={!sourceFile || !targetFile}
        >
          🔄 Обʼєднати
        </button>
      </div>
    </div>
  );
};
