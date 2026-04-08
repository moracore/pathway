import { useState, useEffect } from 'react';
import type { Project, ProjectTask, Task } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pathway-projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pathway-projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = (name: string, color: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color,
      tasks: [],
      createdAt: Date.now()
    };
    // New projects go to the top
    setProjects(prev => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const addTaskToProject = (projectId: string, text: string) => {
    if (!text.trim()) return;
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newTask: ProjectTask = {
          id: crypto.randomUUID(),
          text: text.trim(),
          completed: false,
          createdAt: Date.now()
        };
        return { ...p, tasks: [...p.tasks, newTask] };
      }
      return p;
    }));
  };

  const updateTaskInProject = (projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        };
      }
      return p;
    }));
  };

  const deleteTaskFromProject = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId)
        };
      }
      return p;
    }));
  };

  const moveProject = (id: string, direction: 'up' | 'down') => {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(nextIdx, 0, moved);
      return next;
    });
  };

  const reorderTasksInProject = (projectId: string, tasks: ProjectTask[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks } : p));
  };

  const returnTasksToProjects = (tasks: Task[]) => {
    setProjects(prev => {
      const next = [...prev];
      tasks.forEach(t => {
        if (!t.projectId) return;
        const pIdx = next.findIndex(p => p.id === t.projectId);
        if (pIdx !== -1) {
          // Recreate project task
          const reclaimed: ProjectTask = {
            id: t.id,
            text: t.text,
            completed: false,
            createdAt: t.createdAt
          };
          // Prevent duplicates just in case
          const alreadyExists = next[pIdx].tasks.some(pt => pt.id === t.id);
          if (!alreadyExists) {
            next[pIdx] = {
              ...next[pIdx],
              tasks: [reclaimed, ...next[pIdx].tasks]
            };
          }
        }
      });
      return next;
    });
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    moveProject,
    addTaskToProject,
    updateTaskInProject,
    deleteTaskFromProject,
    reorderTasksInProject,
    returnTasksToProjects
  };
}
