import type { ColumnType } from "@prisma/client";
import type { Cell as CellType } from "~/type";

export interface IBase {
  id: string;
  name: string;
  createdAt: Date;
  userId: string;
}

export interface ISlugProp {
  params: Promise<{ slug: string }>;
}

export interface ITableTabProps {
  baseId: string;
  active: string | null;
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
}

export type TableRow = {
  id: string;
  [columnName: string]: Cell | string;
};

export type Cell = {
  cellId: string;
  value: string;
};

export interface ICellProps {
  colType: ColumnType;
  cellData: CellType;
  onUpdate: (value: string, cellId: string) => void;
  readOnly: boolean;
}

export interface ITableProps {
  activeTab?: string | null;
}

export interface IOptionsTabProps {
  activeTab?: string | null;
}
