import React from 'react';

// import { ExcelMergerExcelJS } from '@/Components/ExcelMergerTest';
// import { ExcelReaderWriter } from '@/Components/ExcelProcessorTest';

import { ExcelReaderWriter } from '@/Components/ExcelProcessor';
import { ExcelMergerExcelJS } from '@/Components/ExcelMerger';
import { ExcelProcessorForPasport } from '@/Components/ExcelProcessorForPasport';
import { ExcelProcessorQuarterly } from '@/Components/ExcelProcessorQuarterly';

const App: React.FC = () => {
  return (
    <div>
      <ExcelReaderWriter />
      <br />
      <ExcelMergerExcelJS />
      {/* <ExcelReaderWriter />
      <br />
      <ExcelMergerExcelJS /> */}
      <br />
      <br />
      <br />
      <ExcelProcessorForPasport />
      <ExcelProcessorQuarterly />
    </div>
  );
};

export default App;
