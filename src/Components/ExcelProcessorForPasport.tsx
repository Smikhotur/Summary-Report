import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import styles from './UploadExcelFiles.module.scss';

// A5 приклад: "На машину  Fiat Titano в/н HМ 230 G    на  листопад місяць 2025 р."

const getDaysInMonth = (monthIndex: number, year: number) => {
  // monthIndex: 0=січень ... 11=грудень
  return new Date(year, monthIndex + 1, 0).getDate();
};

const monthMap: Record<string, number> = {
  січ: 0,
  лют: 1,
  бер: 2,
  квіт: 3,
  трав: 4,
  чер: 5,
  лип: 6,
  серп: 7,
  вер: 8,
  жовт: 9,
  лист: 10,
  груд: 11,
};

// Витягаємо рік і місяць з тексту A5
const parseMonthYearFromA5 = (text: string) => {
  const t = text.toLowerCase();

  // 1) рік (якщо нема — беремо поточний)
  const yearMatch = t.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();

  // 2) місяць — шукаємо по кореню слова ("лист", "жовт", "лют" тощо)
  const monthKey = Object.keys(monthMap).find((k) => t.includes(k));
  if (monthKey == null) return null;

  return { monthIndex: monthMap[monthKey], year };
};

const pickKmCellByA5 = (a5Text: string) => {
  const parsed = parseMonthYearFromA5(a5Text);
  if (!parsed) return null;

  const { monthIndex, year } = parsed;

  // ✅ за твоєю вимогою: лютий -> E42
  if (monthIndex === 1) return 'E42';

  const days = getDaysInMonth(monthIndex, year);

  if (days === 30) return 'E44';
  if (days === 31) return 'E45';

  // на всякий випадок (якщо логіка зміниться)
  return null;
};

export const ExcelProcessorForPasport: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    // Хедер таблиці
    const header = [
      'Номер',
      'Кілометраж на початок місяця',
      'Кілометраж за місяць',
      'Кілометраж на кінець місяця',
    ];

    // Місце для рядків у ТОЧНОМУ порядку вибору файлів
    const rows: any[][] = new Array(files.length);
    let processedCount = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawCarNumber = worksheet['A5']?.v ?? 'Невідомо';
        const match = rawCarNumber?.match(/([BВ][MМ]|[HН][MМ])\s*\d+\s*[GГ]/i);
        const carNumber = match ? match[0].replace(/\D/g, '') : 'Невідомо';

        const a5 = String(worksheet['A5']?.v ?? '');
        const kmCell = pickKmCellByA5(a5);

        const start = worksheet['F6']?.v ?? '';
        const km = kmCell ? (worksheet[kmCell]?.v ?? '') : ''; // залежно від місяця 31 чи 30 змінюється кількість строк в екселі E44 or E45
        const end = worksheet['F7']?.v ?? '';

        // Кладемо рівно на своє місце
        rows[index] = [carNumber, start, km, end];
        processedCount++;

        if (processedCount === files.length) {
          const results = [header, ...rows];

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
