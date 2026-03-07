import { useState } from "react";
import { calcProgress, type ProjectData, type Task } from "../lib/parser";
import { useFileSystem } from "../hooks";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProgressBarProps {
  percent: number;
  label?: string;
  isComplete?: boolean;
}

export function ProgressBar({ percent, label, isComplete }: ProgressBarProps) {
  const displayPct = Math.round(Math.min(percent ?? 0, 100));

  return (
    <div className="flex flex-col space-y-1 w-full mt-3">
      {label && (
        <div
          className="flex justify-between items-center text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{label}</span>
          <span>{displayPct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full overflow-hidden relative"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${displayPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: displayPct === 0
              ? "transparent"
              : isComplete
              ? "var(--success)"
              : "var(--accent)",
            boxShadow: displayPct > 0 && !isComplete
              ? "0 0 8px rgba(var(--accent-rgb), 0.4)"
              : "none",
          }}
        />
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  projectName: string;
}

export function TaskItem({ task, projectName }: TaskItemProps) {
  const { toggleTask } = useFileSystem();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!task.rawLine || isToggling) return;
    setIsToggling(true);
    await toggleTask(projectName, task.rawLine);
    setIsToggling(false);
  };

  return (
    <div
      className="flex items-start gap-3 py-2 px-3 rounded-lg transition-colors group cursor-pointer"
      style={{ marginLeft: `${(task.level - 1) * 20}px`, opacity: isToggling ? 0.5 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      onClick={handleToggle}
    >
      <button
        className="mt-0.5 shrink-0 transition-colors"
        style={{ color: task.checked ? "var(--success)" : "var(--text-muted)" }}
      >
        {task.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className="text-sm transition-all"
          style={{
            color: task.checked ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: task.checked ? "line-through" : "none",
          }}
        >
          {task.description}
        </span>

        {task.hasMetadata && (
          <div className="flex items-center mt-1">
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              T{task.timeScale} · I{task.importance} · C{task.complexity}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectData;
  isDaily?: boolean;
  onOpen?: () => void;
}

export function ProjectCard({ project, isDaily, onOpen }: ProjectCardProps) {
  const { saveProjectContent } = useFileSystem();
  const [expanded, setExpanded] = useState(false);

  const allTasks = project.sections.flatMap((s) => s.tasks);
  const overall = calcProgress(allTasks);
  const totalSections = project.sections.filter((s) => s.name !== "_root").length;
  const allDone = allTasks.length > 0 && overall.percent === 100 && !project.hasProjectComplete;

  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newContent = project.content.trimEnd() + "\n\n## Project complete.\n";
    await saveProjectContent(project.projectName, newContent);
  };

  const handleAddNextSteps = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newContent = project.content.trimEnd() + "\n- [ ] `[ 1 | 1 | 1 ]` Work out next steps\n";
    await saveProjectContent(project.projectName, newContent);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden transition-colors"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        cursor: onOpen ? "pointer" : "default",
      }}
      onClick={onOpen}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(var(--accent-rgb), 0.45)")
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
      }
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {project.projectName}
            </h2>
            {isDaily && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(var(--accent-rgb), 0.1)",
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb), 0.2)",
                }}
              >
                Daily
              </span>
            )}
            {project.hasProjectComplete && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(68, 187, 102, 0.1)",
                  color: "var(--success)",
                  border: "1px solid rgba(68, 187, 102, 0.2)",
                }}
              >
                Complete
              </span>
            )}
          </div>

          {!project.hasProjectComplete && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors shrink-0"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            >
              <span className="font-medium mr-1">
                {totalSections > 0 ? `${totalSections} Sections` : "Tasks"}
              </span>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>

        {allDone ? (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm flex-1" style={{ color: "var(--text-muted)" }}>
              All tasks done — project complete?
            </span>
            <button
              onClick={handleMarkComplete}
              title="Yes, mark complete"
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--success)" }}
            >
              <CheckCircle2 size={24} />
            </button>
            <button
              onClick={handleAddNextSteps}
              title="No, add next steps"
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--danger)" }}
            >
              <XCircle size={24} />
            </button>
          </div>
        ) : (
          <ProgressBar
            label={!expanded ? "Overall Progress" : undefined}
            percent={overall.percent}
            isComplete={project.hasProjectComplete}
          />
        )}
      </div>

      <AnimatePresence>
        {expanded && !project.hasProjectComplete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ borderTop: "1px solid var(--border)", background: "var(--bg-primary)" }}
          >
            <div className="p-4 space-y-6">
              {project.sections.map((section, idx) => {
                const secProgress = calcProgress(section.tasks);
                return (
                  <div key={idx} className="space-y-2">
                    {section.name !== "_root" && (
                      <ProgressBar label={section.name} percent={secProgress.percent} />
                    )}
                    <div className="space-y-0.5">
                      {section.tasks.map((task, tidx) => (
                        <TaskItem
                          key={tidx}
                          task={task}
                          projectName={project.projectName}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
