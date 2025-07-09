"use client";

import { ColumnType } from "@prisma/client";
import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

interface ICellPropsWithMatch extends ICellProps {
  isMatch?: boolean;
  isCurrentMatch?: boolean;
}

const Cell = ({
  cellData,
  onUpdate,
  colType,
  readOnly = false,
  isMatch = false,
  isCurrentMatch = false,
}: ICellPropsWithMatch) => {
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
    return (
      <span
        className={`${isMatch ? "bg-yellow-200" : ""} ${
          isCurrentMatch ? "bg-orange-400" : ""
        }`}
      >
        {cellData.value}
      </span>
    );
  }

  // For input fields, show highlighted background when there's a match
  return (
    <div className="relative w-full">
      <input
        type={colType === ColumnType.NUMBER ? "number" : "text"}
        className={`focus:border-blue-1 w-full border-none outline-none ${
          isMatch ? "bg-yellow-200" : ""
        } ${isCurrentMatch ? "bg-orange-400" : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default Cell;
