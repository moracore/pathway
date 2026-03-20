import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight, Circle, CheckCircle2, ArrowRight, List, FileText } from "lucide-react";
import { useFileSystem, useDaily } from "../../hooks";
import { ProgressBar } from "../ProjectCard";
import { type Task } from "../../lib/parser";

function todayDisplay() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function TaskItem({
    task,
    checked,
    onToggle,
    selectionMode,
}: {
    task: Task;
    checked?: boolean;
    onToggle: () => void;
    selectionMode?: boolean;
}) {
  const isChecked = checked ?? task.checked;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 group transition-colors"
      style={{ cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      onClick={onToggle}
    >
      <button
        className="shrink-0 transition-colors"
        style={{ color: isChecked ? (selectionMode ? "var(--accent)" : "var(--success)") : "var(--text-muted)" }}
      >
        {isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <span
        className="flex-1 text-sm flex flex-col"
        style={{
          color: isChecked ? (selectionMode ? "var(--text-primary)" : "var(--text-muted)") : "var(--text-primary)",
          textDecoration: isChecked && !selectionMode ? "line-through" : "none",
        }}
      >
        <span>{task.description}</span>
        {task.project && (
            <span className="text-xs mt-0.5 opacity-60" style={{ fontWeight: 600 }}>
                {task.project}
            </span>
        )}
      </span>
      {task.hasMetadata && (
        <span
          className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          T{task.timeScale}·I{task.importance}·C{task.complexity}
        </span>
      )}
    </div>
  );
}

export function TodayView() {
  const { 
    projects,
    dailyMemoryProject,
    dailyArchive,
    toggleTask,
    saveDailyMemory 
  } = useFileSystem();

  const {
      flowState,
      unfinishedTasks,
      selectedUnfinished,
      selectedProjects,
      selectedProjectTasks,
      setSelectedUnfinished,
      setSelectedProjects,
      setSelectedProjectTasks,
      setFlowState,
      finishFlow
  } = useDaily();

  const [inputValue, setInputValue] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "markdown">("list");
  const [mdContent, setMdContent] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMd = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);

  const scheduleSave = useCallback((c: string) => {
    latestMd.current = c;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveDailyMemory(latestMd.current);
    }, 1200);
  }, [saveDailyMemory]);

  // Apply deferred cursor position after autofill re-render
  useEffect(() => {
    if (pendingCursor.current !== null && textareaRef.current) {
      const pos = pendingCursor.current;
      textareaRef.current.selectionStart = pos;
      textareaRef.current.selectionEnd = pos;
      pendingCursor.current = null;
    }
  });

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    // Mobile keyboards don't reliably fire keydown for space; detect via InputEvent.data
    if ((e.nativeEvent as InputEvent | null)?.data === " " && cursor !== null && cursor > 0) {
      const valueWithoutSpace = value.slice(0, cursor - 1) + value.slice(cursor);
      const result = tryAutofill(valueWithoutSpace, cursor - 1);
      if (result) {
        pendingCursor.current = result.newCursor;
        setMdContent(result.newValue);
        scheduleSave(result.newValue);
        return;
      }
    }
    setMdContent(value);
    scheduleSave(value);
  };

  const handleMarkdownKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== " ") return;
    const result = tryAutofill(e.currentTarget.value, e.currentTarget.selectionStart);
    if (result) {
      e.preventDefault();
      pendingCursor.current = result.newCursor;
      setMdContent(result.newValue);
      scheduleSave(result.newValue);
    }
  };

  const switchMode = (next: "list" | "markdown") => {
    if (next === "markdown" && dailyMemoryProject) {
      setMdContent(dailyMemoryProject.content);
    }
    setMode(next);
  };

  const handleAddToToday = async () => {
    const text = inputValue.trim();
    if (!text || !dailyMemoryProject) return;
    setInputValue("");
    await saveDailyMemory(addToTodaySection(dailyMemoryProject.content, text));
  };

  const handleAddToSection = async (sectionName: string, projectName: string, text: string) => {
    if (!dailyMemoryProject) return;
    await saveDailyMemory(addToProjectSection(dailyMemoryProject.content, sectionName, projectName, text));
  };

  const calculateProgress = useMemo(() => {
    if (!dailyMemoryProject) return { percent: 0, label: "0 tasks" };
    let totalWeight = 0;
    let doneWeight = 0;
    let totalCount = 0;
    let doneCount = 0;
    for (const sec of dailyMemoryProject.sections) {
      for (const t of sec.tasks) {
        const w = t.timeScale * t.importance * t.complexity;
        totalWeight += w;
        totalCount++;
        if (t.checked) { doneWeight += w; doneCount++; }
      }
    }
    if (totalCount === 0) return { percent: 0, label: "0 tasks" };
    return {
      percent: totalWeight > 0 ? (doneWeight / totalWeight) * 100 : 0,
      label: `${doneCount} / ${totalCount} tasks`,
    };
  }, [dailyMemoryProject]);


  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Review Unfinished
  // ─────────────────────────────────────────────────────────────────────────────
  if (flowState === "review_unfinished") {
      return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Pick up where you left off?
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Tick any tasks from yesterday you want to carry over to today.
                </p>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                {unfinishedTasks.map(t => {
                    const selected = selectedUnfinished.has(t.rawLine!);
                    return (
                        <div
                            key={t.rawLine!}
                            className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            onClick={() => {
                                const n = new Set(selectedUnfinished);
                                if (n.has(t.rawLine!)) n.delete(t.rawLine!); else n.add(t.rawLine!);
                                setSelectedUnfinished(n);
                            }}
                        >
                            <span className="shrink-0 transition-colors" style={{ color: selected ? "var(--accent)" : "var(--text-muted)" }}>
                                {selected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </span>
                            <span className="flex-1 text-sm flex flex-col" style={{ color: selected ? "var(--text-primary)" : "var(--text-muted)" }}>
                                <span>{t.description}</span>
                                {t.project && (
                                    <span className="text-xs mt-0.5 opacity-60 font-semibold">{t.project}</span>
                                )}
                            </span>
                            {t.hasMetadata && (
                                <span
                                    className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                                    style={{
                                        background: "var(--bg-elevated)",
                                        color: selected ? "var(--text-muted)" : "var(--text-muted)",
                                        border: "1px solid var(--border)",
                                        opacity: selected ? 1 : 0.4,
                                    }}
                                >
                                    T{t.timeScale}·I{t.importance}·C{t.complexity}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-4">
                <button
                    onClick={() => setFlowState("select_projects")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)" }}
                >
                    Continue <ArrowRight size={16} />
                </button>
            </div>
        </div>
      );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Select Projects
  // ─────────────────────────────────────────────────────────────────────────────
  if (flowState === "select_projects") {
      return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    What would you like to work on today?
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Select the active projects you want to pull tasks from.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map(p => {
                    const sel = selectedProjects.has(p.projectName);
                    return (
                        <div
                            key={p.projectName}
                            className="rounded-xl p-4 cursor-pointer transition-all"
                            style={{
                                background: "var(--bg-secondary)",
                                border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                                opacity: sel ? 1 : 0.45,
                            }}
                            onClick={() => {
                                const n = new Set(selectedProjects);
                                if (n.has(p.projectName)) n.delete(p.projectName); else n.add(p.projectName);
                                setSelectedProjects(n);
                            }}
                        >
                            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>
                                {p.projectName}
                            </h3>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setFlowState("review_unfinished")}
                    className={`px-5 py-2.5 rounded-xl text-sm transition-colors ${unfinishedTasks.length === 0 ? 'invisible' : ''}`}
                    style={{ color: "var(--text-secondary)" }}
                >
                    Back
                </button>
                <button
                    onClick={() => {
                        // Rule 3: skip task-picking screen if no projects were selected
                        if (selectedProjects.size === 0) {
                            finishFlow();
                        } else {
                            setFlowState("select_tasks");
                        }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)" }}
                >
                    {selectedProjects.size === 0 ? "Start My Day" : "Choose Tasks"} <ArrowRight size={16} />
                </button>
            </div>
        </div>
      );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Select Tasks
  // ─────────────────────────────────────────────────────────────────────────────
  if (flowState === "select_tasks") {
      const activeProjects = projects.filter(p => selectedProjects.has(p.projectName));
      
      return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    Which tasks specifically?
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {activeProjects.length > 0 ? "Select the tasks from your chosen projects." : "You didn't select any projects, you can generate a blank daily page or go back."}
                </p>
            </div>
            
            <div className="space-y-6">
                {activeProjects.map(p => {
                    // Only show unfinished tasks from that project to pull from originally
                    const availableTasks = p.sections.flatMap(s => s.tasks).filter(t => !t.checked);
                    if (availableTasks.length === 0) return null;
                    return (
                        <div key={p.projectName}>
                            <h3 className="text-sm font-bold uppercase mb-2 pl-2" style={{ color: "var(--text-muted)", letterSpacing: "1px" }}>
                                {p.projectName}
                            </h3>
                            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                                {p.sections.flatMap((s, sIdx) =>
                                    s.tasks
                                        .map((t, tIdx) => ({ task: t, key: `${p.projectName}::${sIdx}::${tIdx}` }))
                                        .filter(({ task }) => !task.checked)
                                ).map(({ task: t, key }) => (
                                    <TaskItem
                                        key={key}
                                        task={t}
                                        checked={selectedProjectTasks.has(key)}
                                        selectionMode={true}
                                        onToggle={() => {
                                            const n = new Set(selectedProjectTasks);
                                            if (n.has(key)) n.delete(key); else n.add(key);
                                            setSelectedProjectTasks(n);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between pt-4 pb-12">
                <button
                    onClick={() => setFlowState("select_projects")}
                    className="px-5 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Back
                </button>
                <button
                    onClick={async () => {
                        await finishFlow();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent)" }}
                >
                    Start My Day
                </button>
            </div>
        </div>
      );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Ready State (Standard Daily View)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!dailyMemoryProject) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {todayDisplay()}
          </h1>
          <div
            className="flex rounded-lg p-0.5 shrink-0"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <ModeBtn active={mode === "list"} onClick={() => switchMode("list")} icon={<List size={14} />} label="List" />
            <ModeBtn active={mode === "markdown"} onClick={() => switchMode("markdown")} icon={<FileText size={14} />} label="Markdown" />
          </div>
        </div>
        {mode === "list" && (
          <ProgressBar percent={calculateProgress.percent} label={calculateProgress.label} />
        )}
      </div>

      {/* Markdown editor */}
      {mode === "markdown" && (
        <div className="space-y-2">
          <div
            className="rounded-lg px-4 py-2.5 text-xs"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>Autofill: </span>
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)" }}>-</code>
            {" "}+ space → bare task &nbsp;·&nbsp;{" "}
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)" }}>-435</code>
            {" "}+ space → T=4 I=3 C=5 task &nbsp;·&nbsp;{" "}
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)" }}>##</code>
            {" "}section header
          </div>
          <textarea
            ref={textareaRef}
            value={mdContent}
            onChange={handleMarkdownChange}
            onKeyDown={handleMarkdownKeyDown}
            spellCheck={false}
            className="w-full rounded-xl px-5 py-4 text-sm font-mono leading-relaxed outline-none resize-none custom-scrollbar"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              minHeight: "60vh",
              caretColor: "var(--accent)",
            }}
          />
        </div>
      )}

      {mode === "list" && <>
      {/* Quick-add */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 shadow-sm"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)" }}
          placeholder="Add an extra task for today..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === "Enter") handleAddToToday();
          }}
        />
        <button
          onClick={handleAddToToday}
          disabled={!inputValue.trim()}
          className="rounded-lg p-1.5 transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Task sections */}
      <div className="space-y-6">
        {dailyMemoryProject.sections.map((section, sIdx) => {
          const isProjectSection = projects.some(p => p.projectName === section.name);
          return (
          <div key={sIdx}>
            {section.name !== "_root" && (
              <h2
                className="text-lg font-bold mb-3 mt-6"
                style={{ color: "var(--text-primary)" }}
              >
                {section.name}
              </h2>
            )}
            <div
              className="rounded-xl overflow-hidden shadow-sm"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                {section.tasks.map((task, tIdx) => (
                    <TaskItem
                        key={tIdx}
                        task={task}
                        onToggle={() => task.rawLine && toggleTask("DailyMemory", task.rawLine)}
                    />
                ))}
              </div>
              {isProjectSection && (
                <SectionAddRow
                  onAdd={(text) => handleAddToSection(section.name, section.name, text)}
                />
              )}
            </div>
          </div>
          );
        })}
        {dailyMemoryProject.sections.length === 0 && (
             <div
             className="py-12 text-center text-sm"
             style={{ color: "var(--text-muted)" }}
           >
             No tasks today! Add one above or just rest.
           </div>
        )}
      </div>

      {/* Archive */}
      {dailyArchive.length > 0 && (
        <div
          className="rounded-xl overflow-hidden mt-8"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={e =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onClick={() => setArchiveOpen(!archiveOpen)}
          >
            {archiveOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Archive ({dailyArchive.length} {dailyArchive.length === 1 ? "day" : "days"})
          </button>

          {archiveOpen && (
            <div
              className="border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {dailyArchive.map((entry, i) => (
                <div key={i} className="px-4 py-3">
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatDate(entry.date)}
                  </p>
                  <div className="space-y-1">
                    {entry.tasks.map((task, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span style={{ color: task.checked ? "var(--success)" : "var(--text-muted)" }}>
                          {task.checked ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Circle size={14} />
                          )}
                        </span>
                        <span
                          className="text-sm"
                          style={{
                            color: task.checked ? "var(--text-muted)" : "var(--text-secondary)",
                            textDecoration: task.checked ? "line-through" : "none",
                          }}
                        >
                          {task.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
      style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-secondary)" }}
    >
      {icon}{label}
    </button>
  );
}

// ── Autofill ──────────────────────────────────────────────────────────────────

function tryAutofill(value: string, cursor: number) {
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const line = value.substring(lineStart, cursor);
  if (line === "-") {
    const r = "- [ ] `[ 1 | 1 | 1 ]` ";
    return { newValue: value.slice(0, lineStart) + r + value.slice(cursor), newCursor: lineStart + r.length };
  }
  const m = line.match(/^-([1-5])([1-5])([1-5])$/);
  if (m) {
    const r = `- [ ] \`[ ${m[1]} | ${m[2]} | ${m[3]} ]\` `;
    return { newValue: value.slice(0, lineStart) + r + value.slice(cursor), newCursor: lineStart + r.length };
  }
  return null;
}

// ── Section helpers ───────────────────────────────────────────────────────────

/** Insert a task into the ## Today section (creating it at the top if absent). */
function addToTodaySection(content: string, text: string): string {
  const taskLine = `- [ ] \`[ 1 | 1 | 1 ]\` ${text}`;
  const lines = content.split("\n");
  const todayIdx = lines.findIndex(l => l.trim() === "## Today");
  if (todayIdx === -1) {
    const h1Idx = lines.findIndex(l => l.startsWith("# "));
    const at = h1Idx !== -1 ? h1Idx + 1 : 0;
    const next = [...lines];
    next.splice(at, 0, "## Today", taskLine);
    return next.join("\n");
  }
  let at = todayIdx + 1;
  while (at < lines.length && !lines[at].startsWith("## ")) at++;
  const next = [...lines];
  next.splice(at, 0, taskLine);
  return next.join("\n");
}

/** Insert a task with (ProjectName) into a named ## section. */
function addToProjectSection(content: string, sectionName: string, projectName: string, text: string): string {
  const taskLine = `- [ ] \`[ 1 | 1 | 1 ]\` (${projectName}) ${text}`;
  const lines = content.split("\n");
  const secIdx = lines.findIndex(l => l.trim() === `## ${sectionName}`);
  if (secIdx === -1) return content;
  let at = secIdx + 1;
  while (at < lines.length && !lines[at].startsWith("## ")) at++;
  const next = [...lines];
  next.splice(at, 0, taskLine);
  return next.join("\n");
}

// ── Inline section add row ────────────────────────────────────────────────────

function SectionAddRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim()) onAdd(text.trim());
    setText("");
    setActive(false);
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full flex items-center gap-1.5 px-4 py-2 text-xs border-t transition-colors"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <Plus size={12} /> Add task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setText(""); setActive(false); }
        }}
        onBlur={() => { if (!text.trim()) setActive(false); }}
        placeholder="Task description…"
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: "var(--text-primary)" }}
      />
    </div>
  );
}
