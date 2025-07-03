export interface IBaseCardProps extends IBase {
  handleDelete?: (id: string) => void;
}

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
} & Record<string, Cell | undefined>;

export type Cell = {
  cellId: string;
  value: string;
};
