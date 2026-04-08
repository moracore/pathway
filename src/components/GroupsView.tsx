import { useState } from 'react';
import { Plus, X, ChevronRight } from 'lucide-react';
import type { Group } from '../types';

function ConfirmDelete({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--clr-surface)', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--clr-text-primary)' }}>Delete "{label}"?</div>
        <div style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>This can't be undone.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--clr-border)', background: 'var(--clr-surface-raised)', color: 'var(--clr-text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--clr-danger)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

interface GroupsViewProps {
  groups: Group[];
  onAddGroup: (group: Omit<Group, 'id'>) => void;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup: (id: string) => void;
}

interface ModalProps {
  group: Group;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup: (id: string) => void;
  onClose: () => void;
}

function GroupModal({ group, onUpdateGroup, onDeleteGroup, onClose }: ModalProps) {
  const safeKeywords = group.keywords || [];
  const [confirming, setConfirming] = useState(false);

  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, zIndex: 1000, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          background: 'var(--clr-surface)', 
          padding: 24, 
          borderRadius: 20, 
          width: '90%', 
          maxWidth: 420, 
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          animation: 'scaleIn 0.2s ease-out'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: group.color, boxShadow: `0 0 10px ${group.color}66` }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Group Settings</h2>
          </div>
          <button onClick={onClose} style={{ background: 'var(--clr-surface-raised)', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)', padding: 6, borderRadius: 8, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section: Name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Name</label>
            <input
              value={group.name}
              onChange={e => onUpdateGroup(group.id, { name: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '12px 14px', 
                borderRadius: 12, 
                background: 'var(--clr-surface-raised)', 
                border: '1px solid var(--clr-border)', 
                color: 'var(--clr-text-primary)',
                fontSize: 15,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Section: Color */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Color Palette</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {['#009070', '#0ea5e9', '#5f26c2ff', '#cc133bff', '#f87204f1'].map(c => (
                <button
                  key={c}
                  onClick={() => onUpdateGroup(group.id, { color: c })}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    boxShadow: group.color === c ? `0 0 0 3px var(--clr-surface), 0 0 0 5px ${c}` : 'none',
                    transition: 'all 0.15s'
                  }}
                />
              ))}
              <div style={{ position: 'relative', width: 32, height: 32 }}>
                 <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px dashed var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: 14, height: 14, borderRadius: '50%', background: group.color }} />
                 </div>
                 <input
                  type="color"
                  value={group.color}
                  onChange={e => onUpdateGroup(group.id, { color: e.target.value })}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Keywords */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Automation Keywords</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {safeKeywords.map((kw, i) => (
                <span key={i} style={{ 
                  background: 'var(--clr-surface-raised)', 
                  padding: '6px 14px', 
                  borderRadius: 20, 
                  fontSize: 13, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  border: `1px solid ${group.color}33`,
                  color: 'var(--clr-text-primary)',
                  fontWeight: 500
                }}>
                  {kw}
                  <button
                    onClick={() => onUpdateGroup(group.id, { keywords: safeKeywords.filter((_, idx) => idx !== i) })}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--clr-text-muted)', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <input
                placeholder="+ add word"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim().toLowerCase();
                    if (val && !safeKeywords.map(k => k.toLowerCase()).includes(val)) {
                      onUpdateGroup(group.id, { keywords: [...safeKeywords, val] });
                      e.currentTarget.value = '';
                    }
                  }
                }}
                style={{ 
                  background: 'transparent', 
                  border: '1px dashed var(--clr-border)', 
                  borderRadius: 20, 
                  padding: '6px 14px', 
                  fontSize: 13, 
                  color: 'var(--clr-text-primary)', 
                  outline: 'none',
                  width: 100
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 16 }}>
          <button
            onClick={() => setConfirming(true)}
            style={{ background: 'none', border: 'none', color: 'var(--clr-danger)', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: 0.8 }}
          >
            Delete Group Permanently
          </button>
          {confirming && (
            <ConfirmDelete
              label={group.name}
              onConfirm={() => { onDeleteGroup(group.id); onClose(); }}
              onCancel={() => setConfirming(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function GroupsView({ groups, onAddGroup, onUpdateGroup, onDeleteGroup }: GroupsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingGroup = groups.find(g => g.id === editingId);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => setEditingId(group.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--clr-surface)',
              border: `2px solid ${group.color}`,
              borderRadius: 14,
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              color: 'var(--clr-text-primary)',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0, boxShadow: `0 0 5px ${group.color}` }} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--clr-text-primary)' }}>{group.name}</span>
            {group.keywords.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>{group.keywords.length} kw</span>
            )}
            <ChevronRight size={14} style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }} />
          </button>
        ))}

        <button
          onClick={() => onAddGroup({ name: 'New Group', color: '#009070', keywords: [] })}
          style={{ background: 'transparent', border: '2px dashed var(--clr-border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', padding: '14px 16px', color: 'var(--clr-text-muted)', transition: 'background 0.2s', fontSize: 13 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-raised)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      {editingGroup && (
        <GroupModal
          group={editingGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
