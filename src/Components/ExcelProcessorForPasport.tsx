import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import styles from './UploadExcelFiles.module.scss';

export const ExcelProcessorForPasport: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    const results: any[][] = [
      [
        'Номер',
        'Кілометраж на початок місяця',
        'Кілометраж за місяць',
        'Кілометраж на кінець місяця',
      ],
    ];

    let processedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawCarNumber = worksheet['A5']?.v ?? 'Невідомо';
        const match = rawCarNumber?.match(/[BВ][MМ]\s*\d+\s*[GГ]/i);
        const carNumber = match ? match[0].replace(/\D/g, '') : 'Невідомо';

        const start = worksheet['F6']?.v ?? '';
        const km = worksheet['E45']?.v ?? '';
        const end = worksheet['F7']?.v ?? '';

        results.push([carNumber, start, km, end]);
        processedCount++;

        if (processedCount === files.length) {
          const newWorksheet = XLSX.utils.aoa_to_sheet(results);
          const newWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Усі машини');

          const excelBuffer = XLSX.write(newWorkbook, {
            bookType: 'xlsx',
            type: 'array',
          });

          const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

          saveAs(blob, 'зведений_файл_для_паспортів.xlsx');
          setIsLoading(false);
        }
      };

      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="wrapper">
      <div className={styles.uploadContainer}>
        <h3 className={styles.title}>
          Завантаж картки обліку машин для створення відомості для паспортів
        </h3>

        <label className={styles.customFileInput}>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileChange}
          />
          Обрати файли
        </label>

        {isLoading && (
          <div className={styles.loaderWrapper}>
            <div className={styles.loader}></div>
            <span className={styles.loaderText}>Обробка файлів…</span>
          </div>
        )}
      </div>
    </div>
  );
};
