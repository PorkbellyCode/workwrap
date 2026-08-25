export type Category = {
  id: string;
  name: string;
  memoCount: number;
};

export type Memo = {
  id: string;
  categoryId: string;
  logDate: string;
  text: string;
  audioUrl: string | null;
  createdAt: string;
};
