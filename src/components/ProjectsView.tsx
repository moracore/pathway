import { useState } from 'react';
import { ChevronLeft, Check, X, Plus, Settings, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import type { Project, ProjectTask } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  onAddProject: (name: string, color: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onMoveProject: (id: string, direction: 'up' | 'down') => void;
  onAddTask: (projectId: string, text: string) => void;
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onReorderTasks: (projectId: string, tasks: ProjectTask[]) => void;
  onSendToMain: (text: string, color: string, projectId?: string) => void;
  defaultAccent: string;
}

const COLOR_PRESETS = [
  '#009070', '#0ea5e9', '#5f26c2', '#cc133b', '#f87204'
];

export default function ProjectsView({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onMoveProject,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onSendToMain,
  defaultAccent
}: ProjectsViewProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Drag and drop state
  const [dragInfo, setDragInfo] = useState<{ projectId: string, idx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    onAddProject(newProjectName.trim(), defaultAccent);
    setNewProjectName('');
  };

  const handleDragStart = (projectId: string, idx: number) => {
    setDragInfo({ projectId, idx });
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (projectId: string, idx: number) => {
    if (!dragInfo || dragInfo.projectId !== projectId || dragInfo.idx === idx) {
      setDragInfo(null);
      setDragOverIdx(null);
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newTasks = [...project.tasks];
    const [moved] = newTasks.splice(dragInfo.idx, 1);
    newTasks.splice(idx, 0, moved);

    onReorderTasks(projectId, newTasks);
    setDragInfo(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragInfo(null);
    setDragOverIdx(null);
  };

  return (
    <div className="projects-view">
      <div className="projects-scroll-area">
        <div className="task-input-bar" style={{ background: 'transparent' }}>
          <input
            type="text"
            placeholder="Create new project..."
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProject()}
          />
          <button
            className="btn-add"
            onClick={handleAddProject}
            disabled={!newProjectName.trim()}
            style={newProjectName.trim() ? {} : {
              background: 'transparent',
              border: '2px dashed var(--clr-border)',
              color: 'var(--clr-text-muted)',
              cursor: 'default',
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="projects-list">
          {projects.map((project, pIdx) => (
            <div key={project.id} className="project-group">
              <div className="project-header">
                <div className="project-header-top">
                  <span className="project-name-display" style={{ color: project.color }}>{project.name}</span>
                  <div className="project-header-actions">
                    <button
                      onClick={() => onMoveProject(project.id, 'up')}
                      className="btn-project-action"
                      disabled={pIdx === 0}
                      title="Move Up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => onMoveProject(project.id, 'down')}
                      className="btn-project-action"
                      disabled={pIdx === projects.length - 1}
                      title="Move Down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => setEditingProject(project)}
                      className="btn-project-action"
                      title="Settings"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
                <div className="project-underline" style={{ background: project.color }} />
              </div>

              <div className="project-tasks">
                {project.tasks.map((task, tIdx) => (
                  <div
                    key={task.id}
                    className={`task-item project-task-item ${task.completed ? 'completed' : ''} ${dragInfo?.projectId === project.id && dragInfo?.idx === tIdx ? 'dragging' : ''} ${dragInfo?.projectId === project.id && dragOverIdx === tIdx ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(project.id, tIdx)}
                    onDragOver={(e) => handleDragOver(e, tIdx)}
                    onDrop={() => handleDrop(project.id, tIdx)}
                    onDragEnd={handleDragEnd}
                  >
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <Circle size={6} fill={project.color} color={project.color} />
                    </div>

                    <div
                      className="task-text"
                      style={{
                        textDecoration: task.completed ? 'line-through' : undefined,
                        opacity: task.completed ? 0.4 : 1
                      }}
                    >
                      {task.text}
                    </div>

                    <div className="project-task-actions always-visible">
                      <button
                        onClick={() => {
                          onSendToMain(`${project.name} - ${task.text}`, project.color, project.id);
                          onDeleteTask(project.id, task.id);
                        }}
                        className="btn-task-action"
                        title="Send to Main"
                        style={{ color: project.color }}
                      >
                        <ChevronLeft size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => onUpdateTask(project.id, task.id, { completed: !task.completed })}
                        className="btn-task-action"
                        title="Complete"
                        style={{ color: project.color }}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => onDeleteTask(project.id, task.id)}
                        className="btn-task-action action-delete"
                        title="Delete"
                        style={{ color: project.color }}
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  className={`task-drop-zone-end ${dragInfo?.projectId === project.id && dragOverIdx === project.tasks.length ? 'active' : ''}`}
                  onDragOver={(e) => handleDragOver(e, project.tasks.length)}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={() => handleDrop(project.id, project.tasks.length - 1)}
                />

                <div className="project-add-task-container">
                  <input
                    type="text"
                    placeholder="Add task..."
                    className="project-inline-input"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          onAddTask(project.id, val.trim());
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingProject && (
        <div className="modal-backdrop" onClick={() => setEditingProject(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project Settings</h3>
              <button className="btn-close" onClick={() => setEditingProject(null)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div className="settings-section">
                <label>Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={e => {
                    const next = { ...editingProject, name: e.target.value };
                    setEditingProject(next);
                    onUpdateProject(editingProject.id, { name: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 10,
                    background: 'var(--clr-surface-raised)',
                    border: '1px solid var(--clr-border)',
                    color: 'var(--clr-text-primary)',
                    fontSize: 15,
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginTop: 8
                  }}
                />
              </div>

              <div className="settings-section">
                <label>Project Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        const next = { ...editingProject, color: c };
                        setEditingProject(next);
                        onUpdateProject(editingProject.id, { color: c });
                      }}
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: c, border: 'none', cursor: 'pointer',
                        boxShadow: editingProject.color === c ? `0 0 0 2px var(--clr-surface), 0 0 0 4px ${c}` : 'none',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingProject.color}
                    onChange={e => {
                      const next = { ...editingProject, color: e.target.value };
                      setEditingProject(next);
                      onUpdateProject(editingProject.id, { color: e.target.value });
                    }}
                    style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="settings-section" style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 20 }}>
                <button
                  className="btn-danger-link"
                  onClick={() => {
                    onDeleteProject(editingProject.id);
                    setEditingProject(null);
                  }}
                >
                  Delete Project Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
