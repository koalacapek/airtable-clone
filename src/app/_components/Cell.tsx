"use client";

import { ColumnType } from "@prisma/client";
import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

const Cell = ({ cellData, onUpdate, colType }: ICellProps) => {
  const [value, setValue] = useState(cellData.value);
  const handleBlur = () => {
    if (value !== cellData.value) {
      console.log("id is", cellData.cellId);
      onUpdate(value.trim(), cellData.cellId);
    }
  };

  useEffect(() => {
    setValue(cellData.value);
  }, [cellData.value]);

  return (
    <input
      type={colType === ColumnType.NUMBER ? "number" : "text"}
      className="w-full border-none bg-transparent outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

export default Cell;
