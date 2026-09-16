export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Todo' | 'In Progress' | 'Review' | 'Done';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Task {
  id: string;
  globalId: number;
  title: string;
  description?: string;
  completed: boolean;
  assigneeId?: string;
  tags: string[];
  priority: Priority;
  status: TaskStatus;
  groupId: string;
  dueDate?: string;
}

export interface Group {
  id: string;
  title: string;
  taskIds: string[];
}

export interface ProjectState {
  id: string;
  title: string;
  groups: Group[];
  tasks: Record<string, Task>;
  users: User[];
  nextGlobalId: number;
}
