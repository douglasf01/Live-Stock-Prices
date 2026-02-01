// DataContainer.tsx
import React from 'react';

interface DataContainerProps {
  data: any[];
}

const DataContainer: React.FC<DataContainerProps> = ({ data }) => {
  return (
    <div id="data-container">
      {data.map((item, index) => (
        <p key={index}>{JSON.stringify(item)}</p>
      ))}
    </div>
  );
};

export default DataContainer;
