import * as React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';

export function Graphs({data} : any) {

    if (!Array.isArray(data) || data.length === 0) {
    return <div>No data available</div>;
}
const prices = data.map(item => item.price);

  return (
    <LineChart
    //xAxis = {[{data : [1, 2, 3,4]}]}
      series={[
        {
          data: prices,
            
          label: 'Series 1',
        },
      ]}
      width={600}
      height={600}
      grid={{vertical: true, horizontal: true}}
    />
  );
}
