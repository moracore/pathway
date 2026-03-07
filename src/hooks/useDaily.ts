import { useState, useEffect, useCallback, useRef } from "react";
import { useFileSystem } from "./useFileSystem";
import { type Task } from "../lib/parser";

const EMPTY_DAILY = "## Today\n\n";

export type DailyFlowState = "idle" | "review_unfinished" | "select_projects" | "select_tasks" | "ready";

// Helper to determine what "Today" is, considering our 3AM rollover.
// e.g. If it's 2 AM on Tuesday, "Today" is actually Monday.
function getLogicalToday(rolloverHour: number) {
  const d = new Date();
  if (d.getHours() < rolloverHour) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDaily() {
  const {
    dailyMemoryProject,
    createDailyMemory,
    projects,
    isReady: fsReady,
  } = useFileSystem();

  // Prevent checkRolloverRequired from firing twice in StrictMode / rapid re-renders
  const checkInProgress = useRef(false);
  
  const [flowState, setFlowState] = useState<DailyFlowState>("idle");
  const [unfinishedTasks, setUnfinishedTasks] = useState<Task[]>([]);
  const [selectedUnfinished, setSelectedUnfinished] = useState<Set<string>>(new Set());
  
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<Set<string>>(new Set());
  
  const [rolloverHour, setRolloverHour] = useState(3);
  const [logicalToday, setLogicalToday] = useState("");

  const checkRolloverRequired = useCallback(async () => {
    if (!fsReady || checkInProgress.current) return;
    checkInProgress.current = true;

    const todayStr = getLogicalToday(rolloverHour);
    setLogicalToday(todayStr);

    if (!dailyMemoryProject) {
      // First time ever — skip setup entirely if there are no projects
      if (projects.length === 0) {
        await createDailyMemory(EMPTY_DAILY, todayStr);
        setFlowState("ready");
      } else {
        setFlowState("select_projects");
      }
      checkInProgress.current = false;
      return;
    }

    // Is the currently loaded memory for "Today"?
    const memoryDateMatch = dailyMemoryProject.content.match(/^# Daily (\d{4}-\d{2}-\d{2})/);
    const memoryDate = memoryDateMatch ? memoryDateMatch[1] : "";

    if (memoryDate === todayStr) {
      setFlowState("ready");
      checkInProgress.current = false;
      return;
    }

    // Memory is from a previous day — gather unfinished tasks
    const unfinished: Task[] = [];
    for (const section of dailyMemoryProject.sections) {
      for (const task of section.tasks) {
        if (!task.checked) unfinished.push({ ...task });
      }
    }

    if (unfinished.length > 0) {
      // Rule 1: only show review_unfinished when there ARE unfinished tasks
      setUnfinishedTasks(unfinished);
      setSelectedUnfinished(new Set()); // nothing ticked by default — user opts in
      setFlowState("review_unfinished");
    } else if (projects.length === 0) {
      // Rule 2: nothing unfinished + no projects → skip all setup, make blank daily
      await createDailyMemory(EMPTY_DAILY, todayStr);
      setFlowState("ready");
    } else {
      setFlowState("select_projects");
    }

    checkInProgress.current = false;
  }, [fsReady, dailyMemoryProject, rolloverHour, projects, createDailyMemory]);

  useEffect(() => {
    checkRolloverRequired();
  }, [checkRolloverRequired]);

  const finishFlow = async () => {
    // Always start with an empty ## Today section at the top
    let newContent = "## Today\n\n";

    // Add selected unfinished tasks back
    const keptUnfinished = unfinishedTasks.filter(t => selectedUnfinished.has(t.rawLine as string));
    if (keptUnfinished.length > 0) {
      newContent += `## Continuing from before\n`;
      for (const task of keptUnfinished) {
        newContent += `${task.rawLine}\n`;
      }
      newContent += `\n`;
    }

    // Add tasks from selected projects
    for (const projName of selectedProjects) {
      const proj = projects.find(p => p.projectName === projName);
      if (!proj) continue;

      let addedHeader = false;
      for (const section of proj.sections) {
        for (const task of section.tasks) {
          if (selectedProjectTasks.has(task.rawLine as string)) {
            if (!addedHeader) {
              newContent += `## ${projName}\n`;
              addedHeader = true;
            }
            let raw = task.rawLine as string;
            if (!task.hasMetadata) {
              raw = raw.replace(/^(- \[[ xX]\] )(.+)$/, `$1\`[ 1 | 1 | 1 ]\` (${projName}) $2`);
            } else if (!task.project) {
              // Match both legacy [ C | T ] and new [ T | I | C ] metadata blocks
              raw = raw.replace(/^(- \[[ xX]\] `\[ \d+ \| (?:\d+ \| )?\d+ \]` )(.+)$/, `$1(${projName}) $2`);
            }
            newContent += `${raw}\n`;
          }
        }
      }
      if (addedHeader) newContent += `\n`;
    }

    await createDailyMemory(newContent.trim() + "\n", logicalToday);
    setFlowState("ready");
  };

  return {
    flowState,
    setFlowState,
    unfinishedTasks,
    selectedUnfinished,
    selectedProjects,
    selectedProjectTasks,
    setSelectedUnfinished,
    setSelectedProjects,
    setSelectedProjectTasks,
    rolloverHour,
    setRolloverHour,
    logicalToday,
    finishFlow,
  };
}
