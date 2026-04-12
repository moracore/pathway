import { useState, useEffect, useCallback } from 'react';
import type { FutureTask } from '../types';

const STORAGE_KEY = 'pathway-future-tasks';

function load(): FutureTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useFutureTasks() {
  const [tasks, setTasks] = useState<FutureTask[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((date: string, text: string, size: 1 | 2 | 3 | 4 | 5 = 3) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setTasks(prev => [...prev, { id, date, text, size }]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTasksForDate = useCallback((date: string) => {
    return tasks.filter(t => t.date === date);
  }, [tasks]);

  return { futureTasks: tasks, addFutureTask: addTask, deleteFutureTask: deleteTask, getTasksForDate };
}
