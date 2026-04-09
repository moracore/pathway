export interface Task {
  id: string;
  text: string;
  size: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  order: number;
  groupId?: string;
  customColor?: string;
  projectId?: string; // Originating project ID for returning on reset
}

export interface Group {
  id: string;
  name: string;
  color: string;
  keywords: string[];
}

export interface Planet {
  id: string;
  taskId: string;
  taskText?: string;
  groupId?: string;
  customColor?: string;
  monthId?: string;
  isAnchor?: boolean;
  mass: number; // 2^size
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phaseX: number;
  phaseY: number;
  spawnTime: number;
  isDeployed?: boolean;
}

export interface Tracker {
  id: string;
  name: string;
  color: string;
  keywords: string[];
  completedDates: string[]; // YYYY-MM-DD — for anti-trackers, these are FAILED dates
  streakStretch?: number;
  isAnti?: boolean;
  createdAt?: string; // YYYY-MM-DD — for anti-trackers, days before this are neutral
}

export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  tasks: ProjectTask[];
  createdAt: number;
}

export interface FutureTask {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

export type TabId = 'tasks' | 'projects' | 'calendar' | 'groups' | 'trackers';
