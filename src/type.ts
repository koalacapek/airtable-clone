export interface IBaseCardProps extends IBase {
  handleDelete: (id: string) => void;
}

export interface IBase {
  id: string;
  name: string;
  createdAt: Date;
  userId: string;
}
