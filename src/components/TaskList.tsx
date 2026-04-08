import { useState } from 'react';
import { ChevronRight, Rotate3d, Circle } from 'lucide-react';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onComplete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Pick<Task, 'text' | 'size'>>) => void;
  onSettingsClick?: (id: string) => void;
  onReorder?: (tasks: Task[]) => void;
  readOnly?: boolean;
}

const SIZES: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

// Size dot visual sizes (px)
function dotSize(sizeLevel: number): number {
  return 6 + sizeLevel * 3; // 9, 12, 15, 18, 21
}

export default function TaskList({ tasks, onComplete, onUpdate, onSettingsClick, onReorder, readOnly }: TaskListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const handleCompleteTask = (id: string) => {
    if (readOnly) return;
    setExitingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      onComplete?.(id);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 280); // matches slideOutRight duration approximately
  };

  function handleDragStart(idx: number) {
    if (readOnly) return;
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    if (readOnly) return;
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    if (readOnly || dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...tasks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder?.(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list">
        <div className="task-list-empty">
          <Rotate3d size={40} style={{ opacity: 0.3 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task, idx) => (
        <div
          key={task.id}
          className={`task-item${dragIdx === idx ? ' dragging' : ''}${dragOverIdx === idx ? ' drag-over' : ''}${readOnly ? ' read-only' : ''}${exitingIds.has(task.id) ? ' exiting' : ''}`}
          draggable={!readOnly}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          {/* Bullet point */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <Circle size={6} fill={readOnly ? 'var(--clr-base)' : 'var(--clr-text-muted)'} color={readOnly ? 'var(--clr-base)' : 'var(--clr-text-muted)'} />
          </div>

          {/* Task text — click to open settings */}
          <div
            className="task-text"
            onClick={() => !readOnly && onSettingsClick?.(task.id)}
            style={{
              textDecoration: readOnly ? 'line-through' : undefined,
              color: readOnly ? 'var(--clr-text-muted)' : undefined,
              fontSize: task.text.length > 80 ? '0.65em' : task.text.length > 40 ? '0.8em' : undefined,
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            {task.text}
          </div>

          {/* Size dots */}
          <div className="size-dots" style={{ pointerEvents: readOnly ? 'none' : 'auto' }}>
            {SIZES.map(s => (
              <button
                key={s}
                className={`size-dot${task.size >= s ? ' active' : ''}`}
                style={{
                  width: dotSize(s),
                  height: dotSize(s),
                }}
                onClick={() => !readOnly && onUpdate?.(task.id, { size: s })}
                title={`Size ${s}`}
                aria-label={`Set size to ${s}`}
              />
            ))}
          </div>

          {/* Complete / Send button — always visible */}
          <button
            className="btn-delete-task"
            onClick={() => !readOnly && handleCompleteTask(task.id)}
            title={readOnly ? undefined : 'Complete & deploy'}
            aria-label={`Complete task: ${task.text}`}
            style={{ color: 'var(--clr-base)', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.4 : 1 }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      ))}
      {!readOnly && (
        <div 
          className={`task-drop-zone-end ${dragOverIdx === tasks.length ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(tasks.length); }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={() => handleDrop(tasks.length - 1)}
        />
      )}
    </div>
  );
}
