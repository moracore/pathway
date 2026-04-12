import { useState, useCallback, useEffect, useRef } from 'react';
import type { Task, Planet } from '../types';

const STORAGE_KEYS = {
  tasks: 'orbital-tasks',
  planets: 'orbital-planets',
  completedStack: 'orbital-completed-stack',
  lastWipe: 'orbital-last-wipe',
  planetsHistory: 'orbital-planets-history',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Planet colors — all variations of #009070
const PLANET_COLORS = [
  '#009070', '#0ea5e9', '#5f26c2', '#cc133b', '#f87204'
];

function pickColor(mass: number): string {
  return PLANET_COLORS[mass % PLANET_COLORS.length];
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

function shouldWipe(resetHour: number): boolean {
  const lastWipe = load<string | null>(STORAGE_KEYS.lastWipe, null);
  const now = new Date();
  const boundaryDate = new Date(now);
  boundaryDate.setHours(resetHour, 0, 0, 0);
  const resetBoundary = now < boundaryDate
    ? new Date(boundaryDate.getTime() - 86400000)
    : boundaryDate;
  if (!lastWipe) return true;
  return new Date(lastWipe) < resetBoundary;
}

function markWiped() {
  save(STORAGE_KEYS.lastWipe, new Date().toISOString());
}

export function useTasks(onWipe?: (tasks: Task[]) => void, resetHour: number = 3) {
  const [tasks, setTasks] = useState<Task[]>(() => load(STORAGE_KEYS.tasks, []));
  const [planets, setPlanets] = useState<Planet[]>(() => load(STORAGE_KEYS.planets, []));
  const [historicalPlanets, setHistoricalPlanets] = useState<Planet[]>(
    () => load(STORAGE_KEYS.planetsHistory, [])
  );
  const [completedStack, setCompletedStack] = useState<{ task: Task; planet: Planet }[]>(
    () => load(STORAGE_KEYS.completedStack, [])
  );

  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);


  // Daily wipe check
  const hasCheckedWipe = useRef(false);
  useEffect(() => {
    if (hasCheckedWipe.current) return;
    hasCheckedWipe.current = true;
    if (shouldWipe(resetHour)) {
      if (onWipe) {
        const tasksToClear = load<Task[]>(STORAGE_KEYS.tasks, []);
        onWipe(tasksToClear);
      }
      // Archive today's planets into history before clearing,
      // so the calendar can still show previous days' completions.
      const planetsToArchive = load<Planet[]>(STORAGE_KEYS.planets, []);
      const existingHistory = load<Planet[]>(STORAGE_KEYS.planetsHistory, []);
      const mergedHistory = [...existingHistory, ...planetsToArchive];
      setHistoricalPlanets(mergedHistory);
      save(STORAGE_KEYS.planetsHistory, mergedHistory);

      setTasks([]);
      setPlanets([]);
      setCompletedStack([]);
      save(STORAGE_KEYS.tasks, []);
      save(STORAGE_KEYS.planets, []);
      save(STORAGE_KEYS.completedStack, []);
      markWiped();
    }
  }, []);

  // Persist
  useEffect(() => { save(STORAGE_KEYS.tasks, tasks); }, [tasks]);
  useEffect(() => { save(STORAGE_KEYS.planets, planets); }, [planets]);
  useEffect(() => { save(STORAGE_KEYS.completedStack, completedStack); }, [completedStack]);

  const addTask = useCallback((text: string, customColor?: string, projectId?: string, size: 1 | 2 | 3 | 4 | 5 = 1) => {
    const newTask: Task = {
      id: generateId(),
      text,
      size,
      createdAt: Date.now(),
      order: Date.now(),
      customColor,
      projectId
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Pick<Task, 'text' | 'size'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const reorderTasks = useCallback((reordered: Task[]) => {
    setTasks(reordered);
  }, []);

  const completeTask = useCallback((id: string, planetColor?: string) => {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task) return;

    const mass = Math.pow(2, task.size || 1); // 2^size
    const raw = planetColor || pickColor(task.size);
    const passColor = raw.length === 9 ? raw.slice(0, 7) : raw;
    const planet: Planet = {
      id: generateId(),
      taskId: task.id,
      taskText: task.text,
      groupId: task.groupId,
      customColor: task.customColor,
      mass,
      color: passColor,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      spawnTime: Date.now(),
      isDeployed: false,
    };

    setTasks(prev => prev.filter(t => t.id !== id));
    setPlanets(p => [...p, planet]);
    setCompletedStack(s => [...s, { task, planet }]);
  }, []);

  const deployPlanet = useCallback((id: string, x: number, y: number, vx: number, vy: number) => {
    setPlanets(prev => prev.map(p => 
      p.id === id ? { ...p, x, y, vx, vy, isDeployed: true } : p
    ));
  }, []);

  const undoLastComplete = useCallback(() => {
    if (completedStack.length === 0) return;
    const last = completedStack[completedStack.length - 1];
    setPlanets(p => p.filter(pl => pl.id !== last.planet.id));
    setTasks(t => [...t, last.task]);
    setCompletedStack(prev => prev.slice(0, -1));
  }, [completedStack]);

  return {
    tasks,
    planets,
    historicalPlanets,
    setPlanets,
    completedStack,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    completeTask,
    deployPlanet,
    undoLastComplete,
  };
}
