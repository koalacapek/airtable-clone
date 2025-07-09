"use client";

import { ColumnType } from "@prisma/client";
import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

// Helper function to highlight search matches
const highlightSearchMatch = (
  text: string,
  searchValue: string,
  isCurrentMatch = false,
) => {
  if (!searchValue || searchValue.trim() === "") return text;

  const regex = new RegExp(
    `(${searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <mark
          key={index}
          className={`rounded px-1 ${
            isCurrentMatch
              ? "border-2 border-orange-500 bg-orange-300"
              : "bg-yellow-200"
          }`}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};

interface ICellPropsWithMatch extends ICellProps {
  isMatch?: boolean;
  isCurrentMatch?: boolean;
}

const Cell = ({
  cellData,
  onUpdate,
  colType,
  readOnly = false,
  searchValue = "",
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
    if (isMatch) {
      return (
        <span>
          {highlightSearchMatch(cellData.value, searchValue, isCurrentMatch)}
        </span>
      );
    }
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
