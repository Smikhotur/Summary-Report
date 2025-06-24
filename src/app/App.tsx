import React from 'react';

// import { ExcelMergerExcelJS } from '@/Components/ExcelMergerTest';
// import { ExcelReaderWriter } from '@/Components/ExcelProcessorTest';

import { ExcelReaderWriter } from '@/Components/ExcelProcessor';
import { ExcelMergerExcelJS } from '@/Components/ExcelMerger';

const App: React.FC = () => {
  return (
    <div>
      <ExcelReaderWriter />
      <br />
      <ExcelMergerExcelJS />
      {/* <ExcelReaderWriter />
      <br />
      <ExcelMergerExcelJS /> */}
    </div>
  );
};

export default App;
