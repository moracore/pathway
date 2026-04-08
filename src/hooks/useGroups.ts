import { useState, useEffect } from 'react';
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
import type { Group } from '../types';

const STORAGE_KEY = 'pathway_groups';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>(() => load(STORAGE_KEY, []));

  useEffect(() => {
    save(STORAGE_KEY, groups);
  }, [groups]);

  const addGroup = (group: Omit<Group, 'id'>) => {
    const newGroup: Group = { ...group, id: crypto.randomUUID() };
    setGroups(prev => [...prev, newGroup]);
  };

  const updateGroup = (id: string, updates: Partial<Omit<Group, 'id'>>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return {
    groups,
    addGroup,
    updateGroup,
    deleteGroup
  };
}
