import { useState, useEffect } from "react";
import { FileSystemProvider } from "./hooks";
import { Layout } from "./components/Layout";
import { TodayView } from "./components/views/TodayView";
import { ProjectsView } from "./components/views/ProjectsView";
import { GoalsView } from "./components/views/GoalsView";
import { GoalView } from "./components/views/GoalView";
import { DoneView } from "./components/views/DoneView";
import { ProjectView } from "./components/views/ProjectView";
import { SettingsView } from "./components/views/SettingsView";
import { useFileSystem } from "./hooks";
import { useTheme } from "./context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export type Tab = "today" | "projects" | "goals" | "done";

function Dashboard() {
  const { isReady, error } = useFileSystem();
  const { enableToday, enableGoals } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reset to "projects" if an enabled feature gets toggled off while active
  useEffect(() => {
    if (!enableToday && activeTab === "today") setActiveTab("projects");
    if (!enableGoals && activeTab === "goals") setActiveTab("projects");
  }, [enableToday, enableGoals, activeTab]);

  const handleSetActiveTab = (tab: Tab) => {
    setActiveProject(null);
    setActiveGoal(null);
    setShowSettings(false);
    setActiveTab(tab);
  };

  const handleOpenSettings = () => {
    setActiveProject(null);
    setActiveGoal(null);
    setShowSettings(true);
  };

  if (!isReady) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <div className="flex flex-col items-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--text-secondary)" }}>Loading your Pathway...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleSetActiveTab}
      showSettings={showSettings}
      onOpenSettings={handleOpenSettings}
    >
      {error && (
        <div
          className="mb-4 p-4 rounded-xl text-sm"
          style={{
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.2)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}
      <AnimatePresence mode="wait">
        {showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <SettingsView />
          </motion.div>
        ) : activeProject ? (
          <motion.div
            key={`project-${activeProject}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <ProjectView
              projectName={activeProject}
              onBack={() => setActiveProject(null)}
            />
          </motion.div>
        ) : activeGoal ? (
          <motion.div
            key={`goal-${activeGoal}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <GoalView
              goalName={activeGoal}
              onBack={() => setActiveGoal(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "today" && <TodayView />}
            {activeTab === "projects" && (
              <ProjectsView onSelectProject={setActiveProject} />
            )}
            {activeTab === "goals" && <GoalsView onSelectGoal={setActiveGoal} />}
            {activeTab === "done" && <DoneView onSelectProject={setActiveProject} />}
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <FileSystemProvider>
      <Dashboard />
    </FileSystemProvider>
  );
}
