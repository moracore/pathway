import { useState, useEffect } from 'react';
import { Undo2, ChevronDown, ChevronUp } from 'lucide-react';
import './App.css';
import type { TabId } from './types';
import { useTasks } from './hooks/useTasks';
import { useGroups } from './hooks/useGroups';
import { useSettings } from './hooks/useSettings';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import RewardCanvas from './components/RewardCanvas';
import BottomNav from './components/BottomNav';
import AppHeader from './components/AppHeader';
import SettingsPanel from './components/SettingsPanel';
import Calendar from './components/Calendar';
import GroupsView from './components/GroupsView';
import TaskSettingsModal from './components/TaskSettingsModal';
import TrackersView from './components/TrackersView';
import { useTrackers } from './hooks/useTrackers';
import ProjectsView from './components/ProjectsView';
import { useProjects } from './hooks/useProjects';
import { usePhysics } from './hooks/usePhysics';
import PhysicsModal from './components/PhysicsModal';

export default function App() {
  const { settings, visibleTabs, updateAccent, updateTheme, setNavEnabled, moveTab, updateResetHour } = useSettings();

  const {
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
  } = useProjects();

  const {
    tasks,
    planets,
    setPlanets,
    completedStack,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    completeTask,
    deployPlanet,
    undoLastComplete,
  } = useTasks(returnTasksToProjects, settings.resetHour);

  const { groups, addGroup, updateGroup, deleteGroup } = useGroups();
  const { trackers, addTracker, updateTracker, deleteTracker, toggleDate } = useTrackers();
  const { config: physicsConfig, updateParam: updatePhysicsParam, resetDefaults: resetPhysics } = usePhysics();

  useEffect(() => {
    setPlanets(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (p.customColor) {
          if (p.color !== p.customColor) { changed = true; return { ...p, color: p.customColor }; }
          return p;
        }
        if (p.groupId) {
          const manualGroup = groups.find(g => g.id === p.groupId);
          if (manualGroup && p.color !== manualGroup.color) { changed = true; return { ...p, color: manualGroup.color }; }
        } else if (p.taskText) {
          const textLower = p.taskText.toLowerCase();
          const match = groups.find(g => g.keywords.some(k => new RegExp(`\\b${k.toLowerCase()}\\b`).test(textLower)));
          if (match && p.color !== match.color) { changed = true; return { ...p, color: match.color }; }
        }
        return p;
      });
      return changed ? next : prev;
    });
  }, [groups, setPlanets]);

  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [physicsModalOpen, setPhysicsModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [settingsTaskId, setSettingsTaskId] = useState<string | null>(null);
  const [isRewardMinimized, setIsRewardMinimized] = useState(false);
  const [taskInputFocused, setTaskInputFocused] = useState(false);

  // Match the app's logical day based on configured reset hour.
  const logicalDay = (ts: number) => {
    const d = new Date(ts - settings.resetHour * 3600 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dNum}`;
  };

  const dayPlanets = planets.filter(p => logicalDay(p.spawnTime) === viewingDate);
  const readonlyTasks = dayPlanets.map((p, i) => ({
    id: p.taskId,
    text: p.taskText || `Completed task`,
    size: (Math.log2(p.mass) || 1) as 1 | 2 | 3 | 4 | 5,
    createdAt: p.spawnTime,
    order: i
  }));

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab !== 'calendar') setViewingDate(null);
  };

  // If active tab gets disabled via settings, fall back to tasks
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab('tasks');
  }, [visibleTabs, activeTab]);

  const handleCompleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    let computedColor: string | undefined;
    if (task.customColor) {
      computedColor = task.customColor;
    } else if (task.groupId) {
      const manualGroup = groups.find(g => g.id === task.groupId);
      if (manualGroup) computedColor = manualGroup.color;
    } else {
      const textLower = task.text.toLowerCase();
      const match = groups.find(g =>
        g.keywords.some(k => new RegExp(`\\b${k.toLowerCase()}\\b`).test(textLower))
      );
      if (match) computedColor = match.color;
    }

    if (!computedColor) computedColor = settings.accentColor;

    // Auto-mark trackers based on keywords
    const todayISO = logicalDay(Date.now());
    trackers.forEach(tracker => {
      if (!tracker.keywords || tracker.keywords.length === 0) return;
      const textLower = task.text.toLowerCase();
      const matchesTracker = tracker.keywords.some(k => new RegExp(`\\b${k.toLowerCase()}\\b`).test(textLower));
      if (matchesTracker) {
         toggleDate(tracker.id, todayISO, true);
      }
    });

    completeTask(id, computedColor);
  };

  return (
    <div className="app">
      <AppHeader
        onSettingsOpen={() => setSettingsPanelOpen(true)}
        onPhysicsOpen={() => setPhysicsModalOpen(true)}
        showPhysics={activeTab === 'tasks'}
      />

      {settingsPanelOpen && (
        <SettingsPanel
          settings={settings}
          onClose={() => setSettingsPanelOpen(false)}
          onAccentChange={updateAccent}
          onThemeChange={updateTheme}
          onNavEnabledChange={setNavEnabled}
          onMoveTab={moveTab}
          onUpdateResetHour={updateResetHour}
        />
      )}

      {physicsModalOpen && (
        <PhysicsModal
          config={physicsConfig}
          onUpdate={updatePhysicsParam}
          onReset={resetPhysics}
          onClose={() => setPhysicsModalOpen(false)}
        />
      )}

      {activeTab === 'tasks' && (
        <>
          <div className="list-zone">
            <TaskInput onAdd={addTask} onFocusChange={setTaskInputFocused} />
            <TaskList
              tasks={tasks}
              onComplete={handleCompleteTask}
              onUpdate={updateTask}
              onSettingsClick={setSettingsTaskId}
              onReorder={reorderTasks}
            />
          </div>

          <div className="zone-divider" />

          <div className={`reward-zone-container ${isRewardMinimized || taskInputFocused ? 'hidden' : ''}`}>
            <div className="reward-zone">
              <RewardCanvas
                planets={planets}
                onDeploy={deployPlanet}
                physicsConfig={physicsConfig}
              />
            </div>

            <button
               onClick={() => setIsRewardMinimized(p => !p)}
               className="btn-minimize-reward"
               title={isRewardMinimized ? "Expand Canvas" : "Minimize Canvas"}
            >
               {isRewardMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <button
              className={`btn-undo${completedStack.length === 0 ? ' disabled' : ''}`}
              onClick={undoLastComplete}
              title="Undo last completion"
              id="btn-undo"
            >
              <Undo2 size={18} />
            </button>
          </div>
        </>
      )}

      {activeTab === 'calendar' && !viewingDate && (
        <div className="calendar-panel">
          <Calendar planets={planets} onSelectDate={setViewingDate} />
        </div>
      )}

      {activeTab === 'calendar' && viewingDate && (
        <>
          <div className="list-zone" style={{ position: 'relative', flex: 1 }}>
             <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--clr-surface)', borderBottom: '1px solid var(--clr-surface-raised)' }}>
                <button 
                  onClick={() => setViewingDate(null)} 
                  style={{ background: 'var(--clr-surface-raised)', border: 'none', borderRadius: '50%', padding: '8px', display: 'flex', color: 'var(--clr-text)', cursor: 'pointer' }}
                >
                  <Undo2 size={20} />
                </button>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{viewingDate}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--clr-text-muted)' }}>Historical Snapshot</div>
                </div>
             </div>
             <TaskList tasks={readonlyTasks} readOnly />
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ProjectsView
            projects={projects}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
            onMoveProject={moveProject}
            onAddTask={addTaskToProject}
            onUpdateTask={updateTaskInProject}
            onDeleteTask={deleteTaskFromProject}
            onReorderTasks={reorderTasksInProject}
            onSendToMain={(text, color, pid) => {
              addTask(text, color, pid);
              handleTabChange('tasks');
            }}
            defaultAccent={settings.accentColor}
          />
        </div>
      )}

      {activeTab === 'groups' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <GroupsView groups={groups} onAddGroup={addGroup} onUpdateGroup={updateGroup} onDeleteGroup={deleteGroup} />
        </div>
      )}

      {activeTab === 'trackers' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <TrackersView 
            trackers={trackers}
            onAddTracker={addTracker}
            onUpdateTracker={updateTracker}
            onDeleteTracker={deleteTracker}
            onToggleDate={toggleDate}
          />
        </div>
      )}

      {settingsTaskId && tasks.find(t => t.id === settingsTaskId) && (
        <TaskSettingsModal
          task={tasks.find(t => t.id === settingsTaskId)!}
          groups={groups}
          onClose={() => setSettingsTaskId(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}

      <BottomNav activeTab={activeTab} visibleTabs={visibleTabs} onTabChange={handleTabChange} />
    </div>
  );
}
