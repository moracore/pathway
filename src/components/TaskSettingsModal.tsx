import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Task, Group } from '../types';

interface TaskSettingsModalProps {
  task: Task;
  groups: Group[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export default function TaskSettingsModal({ task, groups, onClose, onUpdate, onDelete }: TaskSettingsModalProps) {
  const [customColor, setCustomColor] = useState(task.customColor || '');

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--clr-surface)', padding: 24, borderRadius: 16, width: '90%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Task Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Task Name</label>
          <input
            type="text"
            value={task.text}
            onChange={e => onUpdate(task.id, { text: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: 10, 
              background: 'var(--clr-surface-raised)', 
              border: '1px solid var(--clr-border)', 
              color: 'var(--clr-text-primary)',
              fontSize: 15,
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Override Group</label>
          <select 
            value={task.groupId || ''} 
            onChange={e => onUpdate(task.id, { groupId: e.target.value || undefined })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--clr-surface-raised)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
          >
            <option value="">No Group (Auto-assign or default)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 8, lineHeight: 1.4 }}>
            By default, a task is placed into a group using keywords if matched. Modifying this forces a specific group.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Custom Planet Color override</label>
          <div style={{ display: 'flex', gap: 12 }}>
             <input 
               type="color" 
               value={customColor || '#009070'} 
               onChange={e => setCustomColor(e.target.value)}
               title="Pick custom color"
               style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
             />
             <button 
               onClick={() => { onUpdate(task.id, { customColor }); onClose(); }}
               style={{ flex: 1, padding: '0 16px', borderRadius: 8, background: 'var(--clr-base)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
             >
               Apply Custom Color
             </button>
             {task.customColor && (
               <button 
                 onClick={() => { onUpdate(task.id, { customColor: undefined }); onClose(); }}
                 style={{ padding: '0 16px', borderRadius: 8, background: 'var(--clr-surface-raised)', color: 'var(--clr-text)', border: 'none', cursor: 'pointer' }}
               >
                 Clear
               </button>
             )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 16 }}>
          <button 
            onClick={() => { onDelete(task.id); onClose(); }} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#ff4444', fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}
          >
            <Trash2 size={18} />
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
}
