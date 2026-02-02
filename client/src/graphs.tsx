import * as React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { legendClasses } from '@mui/x-charts/ChartsLegend';

//TODO
//implement x,y axis scaling with the min and max stock price, could improve the flow of the graph

export function Graphs({data} : any) {

    if (!Array.isArray(data) || data.length === 0) {
    return <div></div>;
}
const prices = data.map(item => item.price);
//xaxis expects numbers, convert to millisecond time then reconvert to regular dates
const timestamps = data.map(item => new Date(item.timestamp).getTime());

  return (
    <LineChart
    xAxis = {[{
      
      data: timestamps,
      valueFormatter: (timestamp: number) => new Date(timestamp).toLocaleString(),
      tickSize: 0,
      position: 'none',
    },
  ]}
    yAxis = {[{
      
      //tickMinStep: 100,
      tickSize: 1,
    
    
    }]}

    series={[
        {
          data: prices,
          //if we pass data which only contains one ticker, then this is fine
          label: data[0].ticker,

        },
      ]}
      width={600}
      height={600}
      grid={{vertical: true, horizontal: true}}

      slotProps={{
    legend: {
      sx: {
        fontSize: 20,
        gap: '16px',
        // CSS-in-JS
        [`.${legendClasses.mark}`]: {
          height: 30,
          width: 30,
        },        
      },
    },
  }}
      
    />
  );
}
