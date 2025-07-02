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

export interface TableRow {
  id: string;
  [key: string]: string; // dynamic columns like Name, Age, etc.
}
