export interface TodoItem {
  id: string;
  text: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project: string;
  dueDate: string;
  status: '' | 'On-going' | 'Blocked' | 'Paused' | 'To do' | 'Doing' | 'Done';
  creator: string;
  stakeholder: string;
  created: string;
  source: 'manual' | 'slack' | 'zoom' | 'gmail';
  progress: number;
  userId?: string;
  timestamp?: any;
  description?: string;
  parentId?: string | null;
  order?: number;
  isDefault?: boolean;
  tag?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
} 