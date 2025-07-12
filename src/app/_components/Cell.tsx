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

  // For input fields
  return (
    <div className="relative w-full overflow-hidden">
      <input
        type={colType === ColumnType.NUMBER ? "number" : "text"}
        className="w-full truncate bg-transparent outline-none focus:relative focus:z-[9999]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default Cell;
