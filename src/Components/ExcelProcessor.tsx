import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { subMonths, endOfMonth } from 'date-fns';

import styles from './UploadExcelFiles.module.scss';

export const ExcelReaderWriter: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    const results: any[][] = [
      [
        'Номер',
        'КМ/М',
        'Пр/з/ва',
        'Тон',
        'За планом',
        'НА/за/НО',
        'Масло',
        'у роботі',
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
        const match = rawCarNumber?.match(/([BВ][MМ]|[HН][MМ])\s*\d+\s*[GГ]/i);
        const carNumber = match ? match[0].replace(/\D/g, '') : 'Невідомо';

        // 📅 Отримання попереднього місяця
        const previousMonth = subMonths(new Date(), 1);
        const daysInPreviousMonth = endOfMonth(previousMonth).getDate(); // 30 або 31

        // 🟩 Динамічне визначення останнього рядка для значень
        const endRow = daysInPreviousMonth === 31 ? 45 : 44;

        const km = worksheet[`E${endRow}`]?.v ?? '';
        const prZva = worksheet[`F${endRow}`]?.v ?? '';
        const ton = worksheet[`G${endRow}`]?.v ?? '';
        const zaPlanom = worksheet[`H${endRow}`]?.v ?? '';
        const naZaNo = worksheet[`J${endRow}`]?.v ?? '';
        const maslo = worksheet[`M${endRow}`]?.v ?? '';

        // 📊 Обробка days — рахуємо кількість заповнених клітинок у E15–E44 або E15–E43
        let days = 0;
        const startRow = 15;
        const lastRow = daysInPreviousMonth === 31 ? 44 : 43;

        for (let row = startRow; row <= lastRow; row++) {
          const cell = worksheet[`E${row}`];
          if (
            cell?.v !== undefined &&
            cell.v !== null &&
            `${cell.v}`.trim() !== ''
          ) {
            days += 1;
          }
        }

        results.push([
          carNumber,
          km,
          prZva,
          ton,
          zaPlanom,
          naZaNo,
          maslo,
          days,
        ]);
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

          saveAs(blob, 'зведений_файл_для_зведеної_відомості.xlsx');
          setIsLoading(false);
        }
      };

      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="wrapper">
      <div className={styles.uploadContainer}>
        <h3 className={styles.title}>Завантаж картки обліку машин</h3>

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
