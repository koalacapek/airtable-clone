"use client";

import { ColumnType } from "@prisma/client";
import { useState, useEffect } from "react";
import type { ICellProps } from "~/type";

import toast from "react-hot-toast";

const Cell = ({ cellData, onUpdate, colType }: ICellProps) => {
  const [value, setValue] = useState(cellData.value);

  const validate = (val: string) => {
    if (colType === ColumnType.NUMBER) {
      console.log(/^-?\d*\.?\d*$/.test(val));
      return /^-?\d*\.?\d*$/.test(val); // allow integers & floats
    }
    return true; // TEXT: always valid
  };

  const handleBlur = () => {
    if (value !== cellData.value) {
      if (!validate(value)) {
        console.log("here");
        toast.error("Invalid value for this column.");
        return;
      }
      onUpdate(value.trim());
    }
  };

  useEffect(() => {
    setValue(cellData.value);
  }, [cellData.value]);

  return (
    <input
      className="w-full border-none bg-transparent outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

export default Cell;
