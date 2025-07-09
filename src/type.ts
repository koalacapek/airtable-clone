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
  searchValue?: string;
}

export interface ITableProps {
  activeTab?: string | null;
  viewConditions?: {
    filters: Record<string, unknown>;
    sort: Record<string, unknown>;
    hiddenColumns: string[];
  } | null;
  searchValue?: string;
  matchingCells?: {
    id: string;
    rowId: string;
    columnId: string;
  }[];
  currentMatchIndex?: number;
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
  searchValue?: string;
  onSearchChange?: (searchValue: string) => void;
  matchingCells?: {
    id: string;
    rowId: string;
    columnId: string;
  }[];
  currentMatchIndex?: number;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
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

export interface ISortTableButtonProps {
  activeTab: string;
  sortConditions: Record<string, unknown> | undefined;
  onUpdate: (sortConditions: Record<string, unknown>) => void;
}

export interface IFilterTableButtonProps {
  activeTab: string;
  filters: Record<string, unknown> | undefined;
  onUpdate: (filters: Record<string, unknown>) => void;
}

export interface IHideFieldsButtonProps {
  activeTab: string;
  hiddenFields: string[];
  onUpdate: (hiddenFields: string[]) => void;
}

export interface ISearchTableButtonProps {
  searchValue?: string;
  onUpdate: (searchValue: string) => void;
  totalMatches?: number;
  currentMatchIndex?: number;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
}
