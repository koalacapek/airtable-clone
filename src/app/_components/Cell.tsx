"use client";

import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

const Cell = ({ cellData, onUpdate }: ICellProps) => {
  const [value, setValue] = useState(cellData.value);

  useEffect(() => {
    setValue(cellData.value);
  }, [cellData.value]);

  return (
    <input
      className="w-full border-none bg-transparent outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        console.log(value, cellData.value);
        if (value !== cellData.value) {
          onUpdate(value);
        }
      }}
    />
  );
};

export default Cell;
