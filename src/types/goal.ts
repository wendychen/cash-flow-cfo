export interface SubTask {
  id: string;
  action: string;
  cost: number;
  timeCost: string;
  deadline: string;
  isMagicWand: boolean;
  completed: boolean;
}

export interface Ideation {
  id: string;
  content: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
  isMagicWand: boolean;
  createdAt: string;
  linkedExpenseId?: string;
  subTasks: SubTask[];
  ideations: Ideation[];
  constraint: string;
  urlPack: string[];
}
