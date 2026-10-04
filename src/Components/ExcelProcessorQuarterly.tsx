import React, { useState } from 'react';
import { saveAs } from 'file-saver';

import {
  buildQuarterlyReport, detectMonth, isConsecutivePeriod, MONTH_NAMES,
  orderDetectedMonths, readMonthlyWorkbook,
} from './quarterly/quarterlyReport';
import type { QuarterlyReport } from './quarterly/quarterlyReport';
import { createQuarterlyWorkbook } from './quarterly/quarterlyWorkbook';
import styles from './ExcelProcessorQuarterly.module.scss';

interface MonthSlot {
  file: File | null;
  monthIndex: number;
}

const sameFile = (first: File, second: File) => (
  first === second || (first.name === second.name && first.size === second.size && first.lastModified === second.lastModified)
);

export const ExcelProcessorQuarterly: React.FC = () => {
  const [slots, setSlots] = useState<MonthSlot[]>([
    { file: null, monthIndex: 3 }, { file: null, monthIndex: 4 }, { file: null, monthIndex: 5 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<QuarterlyReport | null>(null);
  const monthIndexes = slots.map((slot) => slot.monthIndex);
  const validPeriod = isConsecutivePeriod(monthIndexes);
  const allFilesSelected = slots.every((slot) => slot.file !== null);

  const clearResult = () => {
    setResult(null);
    setError('');
    setNotice('');
  };

  const handleBatch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!files.length) return;
    clearResult();
    if (files.length !== 3) {
      setError('Потрібно обрати рівно три файли — по одному за кожен місяць.');
      return;
    }
    const detected = files.map((file) => detectMonth(file.name));
    const order = detected.every((month) => month !== null)
      ? orderDetectedMonths(detected as number[]) : null;
    if (order) {
      setSlots(order.map((monthIndex) => ({ file: files[detected.indexOf(monthIndex)], monthIndex })));
      setNotice('Місяці визначено за назвами файлів і розташовано за порядком. Перевірте їх перед створенням.');
    } else {
      setSlots(files.map((file, index) => ({ file, monthIndex: detected[index] ?? slots[index].monthIndex })));
      setNotice('Перевірте місяць біля кожного файлу. Перший, другий і третій місяці мають іти послідовно.');
    }
  };

  const updateFile = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    clearResult();
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index
      ? { file, monthIndex: detectMonth(file.name) ?? slot.monthIndex } : slot));
  };

  const handleCreate = async () => {
    clearResult();
    if (!allFilesSelected || !validPeriod) {
      setError('Додайте три файли та оберіть три послідовні місяці в хронологічному порядку.');
      return;
    }
    const files = slots.map((slot) => slot.file!);
    if (files.some((file, index) => files.slice(0, index).some((other) => sameFile(file, other)))) {
      setError('Один файл обрано кілька разів. Для кожного місяця потрібен окремий файл.');
      return;
    }
    setIsLoading(true);
    try {
      const months = await Promise.all(slots.map(async ({ file, monthIndex }) => {
        try {
          return readMonthlyWorkbook(await file!.arrayBuffer(), file!.name, monthIndex);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Не вдалося прочитати Excel-файл.';
          throw new Error(message.includes(file!.name) ? message : `Файл «${file!.name}»: ${message}`);
        }
      }));
      const report = buildQuarterlyReport(months);
      const workbook = createQuarterlyWorkbook(report);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const period = slots.map((slot) => MONTH_NAMES[slot.monthIndex].toLocaleLowerCase('uk')).join('_');
      saveAs(blob, `квартальна_відомість_${period}.xlsx`);
      setResult(report);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не вдалося створити відомість. Перевірте файли та спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="quarterly-title">
      <div className={styles.container}>
        <h3 className={styles.title} id="quarterly-title">Створення квартальної відомості</h3>
        <p className={styles.description}>
          Завантаж три щомісячні відомості для паспортів. Автомобілі будуть об’єднані
          за номером, а кілометраж за місяці — підсумований.
        </p>

        <label className={styles.uploadButton} htmlFor="quarterly-batch">
          Обрати 3 файли
          <input id="quarterly-batch" type="file" accept=".xlsx,.xls" multiple disabled={isLoading} onChange={handleBatch} />
        </label>

        <div className={styles.months}>
          {slots.map((slot, index) => (
            <div className={styles.monthCard} key={index}>
              <label className={styles.monthLabel} htmlFor={`quarterly-month-${index}`}>
                {index + 1}-й місяць
              </label>
              <select
                id={`quarterly-month-${index}`}
                value={slot.monthIndex}
                disabled={isLoading}
                onChange={(event) => {
                  const monthIndex = Number(event.target.value);
                  clearResult();
                  setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, monthIndex } : item));
                }}
              >
                {MONTH_NAMES.map((name, monthIndex) => <option key={name} value={monthIndex}>{name}</option>)}
              </select>
              <p className={styles.fileName}>{slot.file?.name || 'Файл ще не обрано'}</p>
              <label className={styles.fileButton} htmlFor={`quarterly-file-${index}`}>
                {slot.file ? 'Замінити файл' : 'Обрати файл'}
                <input
                  id={`quarterly-file-${index}`} type="file" accept=".xlsx,.xls" disabled={isLoading}
                  onChange={(event) => updateFile(index, event)}
                />
              </label>
            </div>
          ))}
        </div>

        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {!validPeriod && <p className={styles.error}>Місяці мають іти послідовно: наприклад, квітень, травень, червень.</p>}
        {validPeriod && monthIndexes[0] % 3 !== 0 && (
          <p className={styles.notice}>Обраний період — три послідовні місяці, які не збігаються з календарним кварталом.</p>
        )}
        <div className={styles.rules}>
          <p><strong>Перевірка:</strong> початковий кілометраж першого місяця + сума за три місяці = кінцевий кілометраж третього місяця.</p>
          <p><span className={styles.redMark} aria-hidden="true" />Червоний рядок — розбіжність або помилка даних.</p>
          <p><span className={styles.blueMark} aria-hidden="true" />Синій рядок — номера немає хоча б в одному місяці. Сума за наявними місяцями неповна.</p>
        </div>

        <button
          className={styles.createButton} type="button" disabled={isLoading || !allFilesSelected || !validPeriod}
          onClick={handleCreate}
        >
          {isLoading ? 'Обробка файлів…' : 'Створити квартальну відомість'}
        </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {result && (
          <div className={styles.result} role="status">
            <p><strong>Файл сформовано.</strong> Автомобілів: {result.rows.length}.</p>
            <p>
              Співпадає: {result.counts.Співпадає}. Розбіжностей: {result.counts.Розбіжність}.
              {' '}Без одного або кількох місяців: {result.counts['Немає місяця']}.
              {' '}Помилок даних: {result.counts['Помилка даних']}.
            </p>
            {result.problems.length > 0 && (
              <p>На аркуші «Проблемні дані» збережено {result.problems.length} вихідних рядків із поясненнями. Виправте їх у місячних файлах і створіть відомість повторно.</p>
            )}
            {result.unidentifiedCount > 0 && (
              <p>Рядків без визначеного номера: {result.unidentifiedCount}. Вони не включені до кількості автомобілів.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
