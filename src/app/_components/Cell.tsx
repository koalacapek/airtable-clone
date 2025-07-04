"use client";

import { ColumnType } from "@prisma/client";
import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

const Cell = ({
  cellData,
  onUpdate,
  colType,
  readOnly = false,
}: ICellProps) => {
  const [value, setValue] = useState(cellData.value);
  useEffect(() => {
    setValue(cellData.value);
  }, [cellData.value]);
  const handleBlur = () => {
    if (!readOnly && value !== cellData.value) {
      onUpdate(value, cellData.cellId);
    }
  };

  if (readOnly) {
    return <span>{cellData.value}</span>;
  }

  return (
    <input
      type={colType === ColumnType.NUMBER ? "number" : "text"}
      className="focus:border-blue-1 w-full border-none outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

export default Cell;
