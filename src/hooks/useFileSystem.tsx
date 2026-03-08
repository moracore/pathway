import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import localforage from "localforage";
import {
  parseProjectFile,
  parseGoalFile,
  parseDailyFile,
  addDailyTaskToContent,
  deleteDailyTaskFromContent,
  archivePastDays,
  toggleTaskInContent,
  parseTaskLine,
  type ProjectData,
  type Goal,
  type Task,
  type DailyArchiveEntry,
} from "../lib/parser";

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface FileSystemContextType {
  isReady: boolean;
  projects: ProjectData[];
  completedProjects: ProjectData[];
  goals: Goal[];
  dailyProject: ProjectData | null;
  dailyTasks: Task[];
  dailyArchive: DailyArchiveEntry[];
  toggleTask: (projectName: string, rawLine: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  createGoal: (name: string) => Promise<void>;
  deleteGoal: (name: string) => Promise<void>;
  saveGoalContent: (name: string, content: string) => Promise<void>;
  addDailyTask: (text: string) => Promise<void>;
  deleteDailyTask: (rawLine: string) => Promise<void>;
  saveProjectContent: (projectName: string, content: string) => Promise<void>;
  deleteProject: (projectName: string) => Promise<void>;
  dailyMemoryProject: ProjectData | null;
  saveDailyMemory: (content: string) => Promise<void>;
  createDailyMemory: (content: string, dateStr: string) => Promise<void>;
  trackersContent: string | null;
  saveTrackersContent: (content: string) => Promise<void>;
  refresh: () => Promise<void>;
  error: string | null;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(
  undefined
);

// Constants
const DAILY_FILE = "_Daily.md";
const DAILY_MEMORY_FILE = "_DailyMemory.md";
const TRACKERS_FILE = "_Trackers.md";

// OPFS singleton
let opfsRootPromise: Promise<FileSystemDirectoryHandle> | null = null;

function getOPFS(): Promise<FileSystemDirectoryHandle> {
  if (!opfsRootPromise) {
    opfsRootPromise = navigator.storage.getDirectory();
  }
  return opfsRootPromise;
}

async function readFile(
  root: FileSystemDirectoryHandle,
  name: string
): Promise<string | null> {
  try {
    const handle = await root.getFileHandle(name);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function writeFile(
  root: FileSystemDirectoryHandle,
  name: string,
  content: string
): Promise<void> {
  const handle = await root.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Legacy localforage store — used only for one-time migration
const legacyStore = localforage.createInstance({
  name: "PathwayPWA",
  storeName: "files",
  description: "Virtual file system for Pathway Markdown files",
});

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [completedProjects, setCompletedProjects] = useState<ProjectData[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyProject, setDailyProject] = useState<ProjectData | null>(null);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [dailyArchive, setDailyArchive] = useState<DailyArchiveEntry[]>([]);
  const [dailyMemoryProject, setDailyMemoryProject] = useState<ProjectData | null>(null);
  const [trackersContent, setTrackersContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      const root = await getOPFS();
      const today = todayString();
      const loadedProjects: ProjectData[] = [];
      let loadedGoals: Goal[] = [];
      let loadedDaily: ProjectData | null = null;
      let loadedDailyTasks: Task[] = [];
      let loadedDailyArchive: DailyArchiveEntry[] = [];
      let loadedDailyMemory: ProjectData | null = null;
      let loadedTrackers: string | null = null;
      const completed: ProjectData[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const [name, handle] of (root as any).entries()) {
        if (handle.kind !== "file" || !name.endsWith(".md")) continue;
        const file = await (handle as FileSystemFileHandle).getFile();
        let content = await file.text();

        if (name.startsWith("_Goal_")) {
          loadedGoals.push(parseGoalFile(name, content));
        } else if (name === DAILY_FILE) {
          // Archive past days on load
          const archived = archivePastDays(content, today);
          if (archived !== content) {
            await writeFile(root, DAILY_FILE, archived);
            content = archived;
          }
          loadedDaily = parseProjectFile("Daily", content);
          loadedDaily.lastModified = Date.now();
          const dailyData = parseDailyFile(content, today);
          loadedDailyTasks = dailyData.todayTasks;
          loadedDailyArchive = dailyData.archive;
        } else if (name === DAILY_MEMORY_FILE) {
          loadedDailyMemory = parseProjectFile("DailyMemory", content);
          loadedDailyMemory.lastModified = Date.now();
        } else if (name === TRACKERS_FILE) {
          loadedTrackers = content;
        } else if (!name.startsWith("_")) {
          // Ignore all internal underscore-prefixed files (e.g. old _Goals.md)
          const project = parseProjectFile(name.replace(".md", ""), content);
          project.lastModified = Date.now();
          if (project.hasProjectComplete) {
            completed.push(project);
          } else {
            loadedProjects.push(project);
          }
        }
      }

      loadedProjects.sort(
        (a, b) =>
          b.importance - a.importance ||
          a.projectName.localeCompare(b.projectName)
      );

      setProjects(loadedProjects);
      setCompletedProjects(completed);
      setGoals(loadedGoals);
      setDailyProject(loadedDaily);
      setDailyTasks(loadedDailyTasks);
      setDailyArchive(loadedDailyArchive);
      setDailyMemoryProject(loadedDailyMemory);
      setTrackersContent(loadedTrackers);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read storage";
      console.error("Error loading files from OPFS:", err);
      setError(msg);
    }
  }, []);

  const initStore = useCallback(async () => {
    try {
      const root = await getOPFS();

      // One-time migration: copy existing localforage data into OPFS
      const legacyKeys = await legacyStore.keys();
      if (legacyKeys.length > 0) {
        for (const key of legacyKeys) {
          if (!key.endsWith(".md")) continue;
          const content = await legacyStore.getItem<string>(key);
          if (content) await writeFile(root, key, content);
        }
        await legacyStore.clear();
      } else {
        // Fresh install: seed defaults if no .md files exist in OPFS
        let hasMdFiles = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const [name] of (root as any).entries()) {
          if (name.endsWith(".md")) {
            hasMdFiles = true;
            break;
          }
        }

        if (!hasMdFiles) {
          await writeFile(
            root,
            "Welcome to Pathway.md",
            "> Importance: 100\n\n### Getting Started\n- [ ] `[ 1 | 1 ]` Take a look around this PWA\n- [ ] `[ 1 | 2 ]` Create your first project\n"
          );
          const today = todayString();
          await writeFile(
            root,
            "_Goal_Become an Output Machine.md",
            `# Become an Output Machine\n\n## Complete 100 tasks\n> Date Created: ${today}\n> Deadline: \n> Project Link: \n\n- [ ] Milestone Reached\n`
          );
        }
      }

      await loadFiles();
      setIsReady(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initialize storage";
      console.error("Failed to initialize OPFS:", err);
      setError(msg);
    }
  }, [loadFiles]);

  useEffect(() => {
    initStore();
  }, [initStore]);

  const refresh = async () => {
    await loadFiles();
  };

  const createProject = async (name: string) => {
    const root = await getOPFS();
    const fileName = `${name}.md`;
    const existing = await readFile(root, fileName);
    if (!existing) {
      await writeFile(
        root,
        fileName,
        `# ${name}\n> Importance: 10\n\n`
      );
      await refresh();
    }
  };

  const deleteProject = async (projectName: string) => {
    const root = await getOPFS();
    try {
      await root.removeEntry(`${projectName}.md`);
    } catch {
      // File may not exist; ignore
    }
    await refresh();
  };

  const saveProjectContent = async (projectName: string, content: string) => {
    const root = await getOPFS();
    await writeFile(root, `${projectName}.md`, content);
    await loadFiles();
  };

  const saveDailyMemory = async (content: string) => {
    const root = await getOPFS();
    await writeFile(root, DAILY_MEMORY_FILE, content);
    await loadFiles();
  };

  const saveTrackersContent = async (content: string) => {
    const root = await getOPFS();
    await writeFile(root, TRACKERS_FILE, content);
    await loadFiles();
  };

  const createDailyMemory = async (content: string, dateStr: string) => {
    const root = await getOPFS();
    const finalContent = `# Daily ${dateStr}\n> Importance: 100\n\n${content}`;
    await writeFile(root, DAILY_MEMORY_FILE, finalContent);
    await loadFiles();
  };

  const createGoal = async (name: string) => {
    const root = await getOPFS();
    const today = todayString();
    const fileName = `_Goal_${name}.md`;
    const existing = await readFile(root, fileName);
    if (!existing) {
      await writeFile(
        root,
        fileName,
        `# ${name}\n\n## First Milestone\n> Date Created: ${today}\n> Deadline: \n> Project Link: \n\n- [ ] Milestone Reached\n`
      );
      await refresh();
    }
  };

  const deleteGoal = async (name: string) => {
    const root = await getOPFS();
    try {
      await root.removeEntry(`_Goal_${name}.md`);
    } catch {
      // File may not exist; ignore
    }
    await refresh();
  };

  const saveGoalContent = async (name: string, content: string) => {
    const root = await getOPFS();
    await writeFile(root, `_Goal_${name}.md`, content);
    await loadFiles();
  };

  const addDailyTask = async (text: string) => {
    const root = await getOPFS();
    const today = todayString();
    let content = (await readFile(root, DAILY_FILE)) ?? `# Daily Tasks\n\n## ${today}\n`;
    content = addDailyTaskToContent(content, text, today);
    await writeFile(root, DAILY_FILE, content);
    await refresh();
  };

  const deleteDailyTask = async (rawLine: string) => {
    const root = await getOPFS();
    const content = await readFile(root, DAILY_FILE);
    if (!content) return;
    const updated = deleteDailyTaskFromContent(content, rawLine);
    await writeFile(root, DAILY_FILE, updated);
    await refresh();
  };

  const toggleTask = async (projectName: string, rawLine: string) => {
    try {
      const root = await getOPFS();
      const fileName = projectName === "Daily" ? DAILY_FILE :
                       projectName === "DailyMemory" ? DAILY_MEMORY_FILE :
                       `${projectName}.md`;
                       
      const content = await readFile(root, fileName);
      if (!content) return;
      const updatedContent = toggleTaskInContent(content, rawLine);
      await writeFile(root, fileName, updatedContent);

      // Backwards syncing for DailyMemory
      if (projectName === "DailyMemory") {
        const parsedTask = parseTaskLine(rawLine);
        if (parsedTask && parsedTask.project) {
           const linkedFileName = `${parsedTask.project}.md`;
           const linkedContent = await readFile(root, linkedFileName);
           if (linkedContent) {
               // The rawLine in DailyMemory has the (ProjName) injected. 
               // We need to find the equivalent line in the original project without the injection, or at least the description.
               // Since exact rawLine matching might fail if the original didn't have (ProjName),
               // let's use a simpler approach: toggleTaskInContent does exact string matching.
               // Here we reconstruct the likely original line.
               
               // Original line: `- [ ] \`[ 1 | 2 ]\` Description`
               // Injected line: `- [ ] \`[ 1 | 2 ]\` (ProjName) Description`
               const originalRawLine = rawLine.replace(`(${parsedTask.project}) `, "");
               const updatedLinkedContent = toggleTaskInContent(linkedContent, originalRawLine);
               await writeFile(root, linkedFileName, updatedLinkedContent);
           }
        }
      }

      await refresh();
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  return (
    <FileSystemContext.Provider
      value={{
        isReady,
        projects,
        completedProjects,
        goals,
        dailyProject,
        dailyTasks,
        dailyArchive,
        toggleTask,
        createProject,
        createGoal,
        deleteGoal,
        saveGoalContent,
        addDailyTask,
        deleteDailyTask,
        saveProjectContent,
        deleteProject,
        saveDailyMemory,
        dailyMemoryProject,
        createDailyMemory,
        trackersContent,
        saveTrackersContent,
        refresh,
        error,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error("useFileSystem must be used within a FileSystemProvider");
  }
  return context;
}
