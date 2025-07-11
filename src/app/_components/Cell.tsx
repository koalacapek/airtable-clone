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

  const isCurrent = isMatch && isCurrentMatch;

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
    <div className="relative">
      <input
        type={colType === ColumnType.NUMBER ? "number" : "text"}
        className={`focus:border-blue-1 border-none bg-transparent outline-none ${
          isCurrent ? "bg-orange-400" : isMatch ? "bg-yellow-200" : ""
        }`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        style={{ width: `${Math.max(value.length + 2, 8)}ch` }}
      />
    </div>
  );
};

export default Cell;
