export interface Task {
  level: number;
  checked: boolean;
  complexity: number;
  importance: number;
  timeScale: number;
  description: string;
  weight: number; // timeScale * importance * complexity
  hasMetadata: boolean;
  rawLine?: string; // Original line for modifying back
  project?: string; // For daily file
}

export interface Section {
  name: string;
  tasks: Task[];
}

export interface ProjectData {
  projectName: string;
  sections: Section[];
  hasProjectComplete: boolean;
  importance: number;
  content: string; // The full raw file content
  lastModified?: number;
}

export interface Milestone {
  name: string;
  dateCreated: string;
  deadline?: string;
  projectLink?: string;
  reached: boolean;
  rawLine: string; // the "- [ ] Milestone Reached" line
}

export interface Goal {
  name: string;
  fileName: string;
  milestones: Milestone[];
  content: string;
}


function extractProject(rawDesc: string): { project?: string; desc: string } {
  const m = rawDesc.match(/^\(([^)]+)\)\s*(.+)$/);
  if (m) return { project: m[1].trim(), desc: m[2].trim() };
  return { desc: rawDesc };
}

export function parseTaskLine(line: string): Task | null {
  // New format: - [ ] `[ T | I | C ]` (OptionalProject) Description
  const m3 = line.match(/^(\t*)- \[([ xX])\] `\[ ([1-5]) \| ([1-5]) \| ([1-5]) \]` (.+)$/);
  if (m3) {
    const level = m3[1].length;
    if (level > 2) return null;
    const timeScale   = parseInt(m3[3], 10);
    const importance  = parseInt(m3[4], 10);
    const complexity  = parseInt(m3[5], 10);
    const { project, desc } = extractProject(m3[6].trim());
    return {
      level, checked: m3[2].toLowerCase() === "x",
      complexity, importance, timeScale,
      description: desc, weight: timeScale * importance * complexity,
      hasMetadata: true, rawLine: line, project,
    };
  }

  // Legacy format: - [ ] `[ C | T ]` (OptionalProject) Description
  // Interpreted as T=second, I=1, C=first so weight is unchanged.
  const m2 = line.match(/^(\t*)- \[([ xX])\] `\[ ([1-5]) \| ([1-5]) \]` (.+)$/);
  if (m2) {
    const level = m2[1].length;
    if (level > 2) return null;
    const complexity  = parseInt(m2[3], 10);
    const timeScale   = parseInt(m2[4], 10);
    const importance  = 1;
    const { project, desc } = extractProject(m2[5].trim());
    return {
      level, checked: m2[2].toLowerCase() === "x",
      complexity, importance, timeScale,
      description: desc, weight: timeScale * importance * complexity,
      hasMetadata: true, rawLine: line, project,
    };
  }

  // Bare format: - [ ] (OptionalProject) Description  (no metadata — treated as [ 1 | 1 | 1 ])
  const b = line.match(/^(\t*)- \[([ xX])\] (.+)$/);
  if (!b) return null;
  const level = b[1].length;
  if (level > 2) return null;
  const { project, desc } = extractProject(b[3].trim());
  return {
    level, checked: b[2].toLowerCase() === "x",
    complexity: 1, importance: 1, timeScale: 1,
    description: desc, weight: 1,
    hasMetadata: false, rawLine: line, project,
  };
}

export function parseProjectFile(projectName: string, content: string): ProjectData {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let current: Section = { name: "_root", tasks: [] };
  let hasProjectComplete = false;
  let importance = 0;

  for (const line of lines) {
    const impMatch = line.match(/^>\s*Importance:\s*(\d+)\s*$/);
    if (impMatch) {
      importance = parseInt(impMatch[1], 10);
      continue;
    }

    if (/^PROJECT COMPLETE\s*$/.test(line.trim()) || /^#{2,3}\s+project\s+complete\.?\s*$/i.test(line.trim())) {
      hasProjectComplete = true;
      continue;
    }

    const sec = line.match(/^#{2,3} (.+)$/);
    if (sec) {
      if (current.tasks.length > 0 || current.name !== "_root") {
        sections.push(current);
      }
      current = { name: sec[1].trim(), tasks: [] };
      continue;
    }

    const task = parseTaskLine(line);
    if (task) {
      current.tasks.push(task);
    }
  }
  sections.push(current);

  return {
    projectName,
    sections: sections.filter((s) => s.tasks.length > 0),
    hasProjectComplete,
    importance,
    content,
  };
}

export function calcProgress(tasks: Task[]) {
  if (!tasks.length) return { percent: 0, done: 0, total: 0 };
  const total = tasks.reduce((s, t) => s + t.weight, 0);
  const done = tasks.filter((t) => t.checked).reduce((s, t) => s + t.weight, 0);
  return { percent: total > 0 ? (done / total) * 100 : 0, done, total };
}

export function parseGoalFile(fileName: string, content: string): Goal {
  const lines = content.split("\n");
  const milestones: Milestone[] = [];
  let goalName = fileName.replace(/^_Goal_/, "").replace(/\.md$/, "");
  let currentMilestone: Partial<Milestone> | null = null;

  const finalize = (m: Partial<Milestone>): Milestone => ({
    name: m.name ?? "",
    dateCreated: m.dateCreated ?? new Date().toISOString().split("T")[0],
    deadline: m.deadline,
    projectLink: m.projectLink,
    reached: m.reached ?? false,
    rawLine: m.rawLine ?? "",
  });

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    if (h1) { goalName = h1[1].trim(); continue; }

    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      if (currentMilestone?.name) milestones.push(finalize(currentMilestone));
      currentMilestone = {
        name: h2[1].trim(),
        dateCreated: new Date().toISOString().split("T")[0],
        reached: false,
        rawLine: "",
      };
      continue;
    }

    if (!currentMilestone) continue;

    const dc = line.match(/^>\s*Date Created:\s*(.+)$/);
    if (dc) { currentMilestone.dateCreated = dc[1].trim(); continue; }

    const dl = line.match(/^>\s*Deadline:\s*(.*)$/);
    if (dl) { const v = dl[1].trim(); if (v) currentMilestone.deadline = v; continue; }

    const pl = line.match(/^>\s*Project Link:\s*(.*)$/);
    if (pl) { const v = pl[1].trim(); if (v) currentMilestone.projectLink = v; continue; }

    const cb = line.match(/^- \[([ xX])\] Milestone Reached$/);
    if (cb) {
      currentMilestone.reached = cb[1].toLowerCase() === "x";
      currentMilestone.rawLine = line;
    }
  }

  if (currentMilestone?.name) milestones.push(finalize(currentMilestone));
  return { name: goalName, fileName, milestones, content };
}

export function goalToMarkdown(goal: { name: string; milestones: { name: string; dateCreated: string; deadline?: string; projectLink?: string; reached: boolean }[] }): string {
  const lines = [`# ${goal.name}`, ""];
  for (const m of goal.milestones) {
    lines.push(`## ${m.name}`);
    lines.push(`> Date Created: ${m.dateCreated}`);
    lines.push(`> Deadline: ${m.deadline ?? ""}`);
    lines.push(`> Project Link: ${m.projectLink ?? ""}`);
    lines.push("");
    lines.push(`- [${m.reached ? "x" : " "}] Milestone Reached`);
    lines.push("");
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// File Modification Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggles a specific task line in the full markdown text.
 * Finds the exact line and swaps [ ] with [x] or vice versa.
 */
export function toggleTaskInContent(content: string, rawLineToToggle: string): string {
    const lines = content.split("\n");
    const newLines = lines.map(line => {
        if (line === rawLineToToggle) {
            // Check if it's already checked
            if (line.includes("- [x]") || line.includes("- [X]")) {
                return line.replace(/- \[[xX]\]/, "- [ ]");
            } else if (line.includes("- [ ]")) {
                return line.replace("- [ ]", "- [x]");
            }
        }
        return line;
    });
    return newLines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily File Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyArchiveEntry {
  date: string;
  tasks: Task[];
}

export interface DailyData {
  todayTasks: Task[];
  archive: DailyArchiveEntry[];
}

/**
 * Parses the _Daily.md file, separating today's tasks from archived ones.
 */
export function parseDailyFile(content: string, today: string): DailyData {
  const lines = content.split("\n");
  const todayTasks: Task[] = [];
  const archive: DailyArchiveEntry[] = [];

  let inArchive = false;
  let currentDate: string | null = null;
  let currentTasks: Task[] = [];
  let inTodaySection = false;

  for (const line of lines) {
    if (line.trim() === "<!-- pw:archive-start -->") {
      inArchive = true;
      continue;
    }
    if (line.trim() === "<!-- pw:archive-end -->") {
      if (currentDate && currentTasks.length > 0) {
        archive.push({ date: currentDate, tasks: currentTasks });
      }
      inArchive = false;
      currentDate = null;
      currentTasks = [];
      continue;
    }

    const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      if (inArchive) {
        if (currentDate && currentTasks.length > 0) {
          archive.push({ date: currentDate, tasks: currentTasks });
        }
        currentDate = dateMatch[1];
        currentTasks = [];
      } else {
        inTodaySection = dateMatch[1] === today;
      }
      continue;
    }

    const task = parseTaskLine(line);
    if (task) {
      if (inArchive && currentDate) {
        currentTasks.push(task);
      } else if (inTodaySection) {
        todayTasks.push(task);
      }
    }
  }

  // Flush last archive entry if file ended without archive-end
  if (inArchive && currentDate && currentTasks.length > 0) {
    archive.push({ date: currentDate, tasks: currentTasks });
  }

  return { todayTasks, archive };
}

/**
 * Appends a new task under today's date section in _Daily.md.
 * Creates the today section if it doesn't exist.
 */
export function addDailyTaskToContent(content: string, text: string, today: string): string {
  const lines = content.split("\n");
  const todayHeader = `## ${today}`;
  const todayIdx = lines.findIndex(l => l.trim() === todayHeader);

  if (todayIdx === -1) {
    // Append today's section at the end
    const trimmed = content.trimEnd();
    return trimmed + `\n\n${todayHeader}\n- [ ] ${text}\n`;
  }

  // Find where today's section ends (next ## header or end of file)
  let insertIdx = todayIdx + 1;
  while (insertIdx < lines.length) {
    const l = lines[insertIdx].trim();
    if (l.startsWith("## ") || l === "<!-- pw:archive-start -->" || l === "<!-- pw:archive-end -->") {
      break;
    }
    insertIdx++;
  }

  lines.splice(insertIdx, 0, `- [ ] ${text}`);
  return lines.join("\n");
}

/**
 * Removes an exact task line from _Daily.md.
 */
export function deleteDailyTaskFromContent(content: string, rawLine: string): string {
  return content
    .split("\n")
    .filter(l => l !== rawLine)
    .join("\n");
}

/**
 * On load, wraps any date sections that are not today into the archive block.
 * Called once per load to ensure past days are archived.
 */
export function archivePastDays(content: string, today: string): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let archiveLines: string[] = [];
  let inArchive = false;
  let pastSectionLines: string[] = [];
  let inPastSection = false;

  const flush = () => {
    if (pastSectionLines.length > 0) {
      archiveLines.push(...pastSectionLines);
      pastSectionLines = [];
      inPastSection = false;
    }
  };

  for (const line of lines) {
    if (line.trim() === "<!-- pw:archive-start -->") {
      inArchive = true;
      continue;
    }
    if (line.trim() === "<!-- pw:archive-end -->") {
      inArchive = false;
      continue;
    }
    if (inArchive) {
      archiveLines.push(line);
      continue;
    }

    const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const date = dateMatch[1];
      if (inPastSection) flush();
      if (date === today) {
        inPastSection = false;
        output.push(line);
      } else {
        inPastSection = true;
        pastSectionLines.push(line);
      }
      continue;
    }

    if (inPastSection) {
      pastSectionLines.push(line);
    } else {
      output.push(line);
    }
  }

  flush();

  const allArchive = archiveLines.concat(pastSectionLines.length > 0 ? pastSectionLines : []);
  // pastSectionLines already flushed in flush()

  const result: string[] = [];
  // Insert archive block before the today section if it exists
  let todayIdx = output.findIndex(l => l.trim() === `## ${today}`);
  if (todayIdx === -1) todayIdx = output.length;

  const before = output.slice(0, todayIdx);
  const after = output.slice(todayIdx);

  result.push(...before);
  if (allArchive.length > 0) {
    // Remove trailing empty lines from archive
    while (allArchive.length > 0 && allArchive[allArchive.length - 1].trim() === "") {
      allArchive.pop();
    }
    result.push("<!-- pw:archive-start -->");
    result.push(...allArchive);
    result.push("<!-- pw:archive-end -->");
  }
  result.push(...after);

  return result.join("\n");
}
