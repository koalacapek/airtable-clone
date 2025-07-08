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
  viewConditions?: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    hiddenColumns: string[];
  } | null;
}

export interface IOptionsTabProps {
  activeTab?: string | null;
  viewConditions?: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    hiddenColumns: string[];
  } | null;
  activeView: string | null;
  baseId?: string;
}

export interface IView {
  id: string;
  name: string;
  tableId?: string;
  baseId?: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  hiddenColumns: string[];
  createdAt: Date;
}

export interface IViewsSidebarProps {
  baseId: string | null;
  activeView: string | null;
  setActiveView: React.Dispatch<React.SetStateAction<string | null>>;
  onViewChange: (
    viewConditions: {
      filters: Record<string, unknown>;
      sort: Record<string, unknown>;
      hiddenColumns: string[];
    } | null,
  ) => void;
}
