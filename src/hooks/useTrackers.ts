import { useState, useEffect } from 'react';
import type { Tracker } from '../types';

export function useTrackers() {
  const [trackers, setTrackers] = useState<Tracker[]>(() => {
    const saved = localStorage.getItem('pathway-trackers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pathway-trackers', JSON.stringify(trackers));
  }, [trackers]);

  const addTracker = (name: string, color: string, keywords: string[], streakStretch: number = 7, isAnti: boolean = false) => {
    const today = new Date();
    const createdAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newTracker: Tracker = {
      id: crypto.randomUUID(),
      name,
      color,
      keywords,
      completedDates: [],
      streakStretch,
      isAnti,
      createdAt,
    };
    setTrackers(prev => [...prev, newTracker]);
  };

  const updateTracker = (id: string, name: string, color: string, keywords: string[], streakStretch?: number) => {
    setTrackers(prev => prev.map(t => t.id === id ? { ...t, name, color, keywords, streakStretch: streakStretch ?? 7 } : t));
  };

  const deleteTracker = (id: string) => {
    setTrackers(prev => prev.filter(t => t.id !== id));
  };

  const toggleDate = (trackerId: string, dateStr: string, forceState?: boolean) => {
    setTrackers(prev => prev.map(t => {
      if (t.id !== trackerId) return t;
      const dates = new Set(t.completedDates);
      
      if (forceState === true) {
        dates.add(dateStr);
      } else if (forceState === false) {
        dates.delete(dateStr);
      } else {
        if (dates.has(dateStr)) dates.delete(dateStr);
        else dates.add(dateStr);
      }
      
      return { ...t, completedDates: Array.from(dates) };
    }));
  };

  return {
    trackers,
    addTracker,
    updateTracker,
    deleteTracker,
    toggleDate
  };
}
