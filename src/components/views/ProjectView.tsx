import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, List, FileText, Plus, Trash2, CheckCircle2, Circle, Sparkles, Loader2, Moon, Send, AlertTriangle } from "lucide-react";
import { useFileSystem } from "../../hooks";
import { useTheme } from "../../context/ThemeContext";
import { parseProjectFile } from "../../lib/parser";
import { generateTasksForProject, generateAIResponse, type ChatMessage } from "../../lib/ai";
import { ProgressBar } from "../ProjectCard";
import { Modal } from "../ui/Modal";

// ── Dormancy ──────────────────────────────────────────────────────────────────

const DORMANCY_PRESETS = [
  { label: "Tomorrow",  days: 1   },
  { label: "1 week",    days: 7   },
  { label: "2 weeks",   days: 14  },
  { label: "1 month",   days: 30  },
  { label: "3 months",  days: 90  },
  { label: "6 months",  days: 180 },
];

function addCalendarDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type SectionBlock = { type: "section"; id: string; name: string };
type TaskBlock = {
  type: "task"; id: string;
  checked: boolean; complexity: number; importance: number; timeScale: number;
  description: string; level: number;
};
type Block = SectionBlock | TaskBlock;
type Mode = "list" | "markdown";

// ── Pure helpers ──────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => String(++_uid);
const cycle = (n: number) => (n % 5) + 1;

function calcTasksProgress(tasks: TaskBlock[]) {
  if (!tasks.length) return { percent: 0 };
  const w = (t: TaskBlock) => t.timeScale * t.importance * t.complexity;
  const total = tasks.reduce((s, t) => s + w(t), 0);
  const done  = tasks.filter((t) => t.checked).reduce((s, t) => s + w(t), 0);
  return { percent: total > 0 ? (done / total) * 100 : 0 };
}

function projectToBlocks(project: ReturnType<typeof parseProjectFile>): Block[] {
  const blocks: Block[] = [];
  for (const section of project.sections) {
    if (section.name !== "_root")
      blocks.push({ type: "section", id: uid(), name: section.name });
    for (const task of section.tasks) {
      blocks.push({
        type: "task", id: uid(),
        checked: task.checked, complexity: task.complexity,
        importance: task.importance, timeScale: task.timeScale,
        description: task.description, level: task.level,
      });
    }
  }
  return blocks;
}

function blocksToMarkdown(name: string, blocks: Block[], importance: number, dormantUntil?: string): string {
  const lines = [`# ${name}`, `> Importance: ${importance}`];
  if (dormantUntil) lines.push(`> Dormant Until: ${dormantUntil}`);
  lines.push("");
  for (const b of blocks) {
    if (b.type === "section") {
      lines.push(`## ${b.name}`);
    } else if (b.description.trim()) {
      const indent = "\t".repeat(b.level);
      const check  = b.checked ? "x" : " ";
      lines.push(`${indent}- [${check}] \`[ ${b.timeScale} | ${b.importance} | ${b.complexity} ]\` ${b.description}`);
    }
  }
  return lines.join("\n") + "\n";
}

// Autofill for markdown textarea (fires on Space)
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

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectView({ projectName, onBack }: { projectName: string; onBack: () => void }) {
  const { projects, dormantProjects, saveProjectContent, deleteProject, setProjectDormant } = useFileSystem();
  const { apiKey } = useTheme();
  const project = [...projects, ...dormantProjects].find((p) => p.projectName === projectName);

  const [mode, setMode]           = useState<Mode>("list");
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [content, setContent]     = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDormantPicker, setShowDormantPicker] = useState(false);

  // AI generation modal state
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<string[]>([]);
  const [selectedAiTasks, setSelectedAiTasks]   = useState<Set<number>>(new Set());
  const [showAiModal, setShowAiModal]           = useState(false);

  // AI Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const saveTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent    = useRef("");
  const inputRefs        = useRef<Map<string, HTMLInputElement>>(new Map());
  const pendingFocusId   = useRef<string | null>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const pendingCursor    = useRef<number | null>(null);

  // Init on project load
  useEffect(() => {
    if (project) {
      setContent(project.content);
      setBlocks(projectToBlocks(project));
    }
  }, [project?.projectName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply deferred focus / cursor after renders
  useEffect(() => {
    if (pendingFocusId.current) {
      const el = inputRefs.current.get(pendingFocusId.current);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      pendingFocusId.current = null;
    }
    if (pendingCursor.current !== null && textareaRef.current) {
      const pos = pendingCursor.current;
      textareaRef.current.selectionStart = pos;
      textareaRef.current.selectionEnd   = pos;
      pendingCursor.current = null;
    }
  });

  // ── Autosave (debounced 1.2 s) ────────────────────────────────────────────

  const scheduleSave = useCallback((c: string) => {
    latestContent.current = c;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveProjectContent(projectName, latestContent.current);
    }, 1200);
  }, [projectName, saveProjectContent]);

  // ── Mode switch ───────────────────────────────────────────────────────────

  const switchMode = (next: Mode) => {
    if (next === "list") {
      // Re-parse current markdown into blocks in case it was edited
      const parsed = parseProjectFile(projectName, content);
      setBlocks(projectToBlocks(parsed));
    }
    setMode(next);
  };

  // ── Block operations ──────────────────────────────────────────────────────

  const commitBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    const md = blocksToMarkdown(projectName, newBlocks, project?.importance ?? 10, project?.dormantUntil);
    setContent(md);
    scheduleSave(md);
  }, [projectName, project?.importance, project?.dormantUntil, scheduleSave]);

  const updateTask = (id: string, patch: Partial<TaskBlock>) =>
    commitBlocks(blocks.map((b) => (b.id === id && b.type === "task" ? { ...b, ...patch } : b)));

  const updateSection = (id: string, name: string) =>
    commitBlocks(blocks.map((b) => (b.id === id && b.type === "section" ? { ...b, name } : b)));

  const deleteBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    commitBlocks(next);
    if (idx > 0) pendingFocusId.current = next[Math.min(idx - 1, next.length - 1)]?.id ?? null;
  };

  const addTaskAfter = (afterId: string | null, defaults?: Partial<TaskBlock>) => {
    const nb: TaskBlock = {
      type: "task", id: uid(), checked: false,
      complexity: defaults?.complexity ?? 1, importance: defaults?.importance ?? 1,
      timeScale: defaults?.timeScale ?? 1, description: "", level: defaults?.level ?? 0,
    };
    if (afterId === null) {
      commitBlocks([...blocks, nb]);
    } else {
      const idx = blocks.findIndex((b) => b.id === afterId);
      const next = [...blocks];
      next.splice(idx + 1, 0, nb);
      commitBlocks(next);
    }
    pendingFocusId.current = nb.id;
  };

  const addSection = () => {
    const sec: SectionBlock = { type: "section", id: uid(), name: "New Section" };
    const task: TaskBlock   = { type: "task", id: uid(), checked: false, complexity: 1, importance: 1, timeScale: 1, description: "", level: 0 };
    commitBlocks([...blocks, sec, task]);
    pendingFocusId.current = sec.id;
  };

  // ── Block-editor keyboard ─────────────────────────────────────────────────

  const handleTaskKeyDown = (e: KeyboardEvent<HTMLInputElement>, block: TaskBlock) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTaskAfter(block.id, { level: block.level });
    } else if (e.key === "Backspace" && block.description === "") {
      e.preventDefault();
      deleteBlock(block.id);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const newLevel = e.shiftKey ? Math.max(0, block.level - 1) : Math.min(1, block.level + 1);
      updateTask(block.id, { level: newLevel });
      pendingFocusId.current = block.id;
    }
  };

  // ── Markdown editor handlers ──────────────────────────────────────────────

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    scheduleSave(e.target.value);
  };

  const handleMarkdownKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== " ") return;
    const result = tryAutofill(e.currentTarget.value, e.currentTarget.selectionStart);
    if (result) {
      e.preventDefault();
      pendingCursor.current = result.newCursor;
      setContent(result.newValue);
      scheduleSave(result.newValue);
    }
  };

  // ── AI Handlers ─────────────────────────────────────────────────────────────

  const handleGenerateAITasks = async () => {
    if (!project || !apiKey) return;
    setAiError(null);
    setIsGenerating(true);
    try {
      const tasks = await generateTasksForProject(apiKey, project);
      if (tasks.length === 0) {
        setAiError("AI didn't return any tasks. Try adding some manual context first.");
        return;
      }
      // Show modal — all tasks pre-selected
      setAiGeneratedTasks(tasks);
      setSelectedAiTasks(new Set(tasks.map((_, i) => i)));
      setShowAiModal(true);
    } catch (e: any) {
      setAiError(e.message || "Failed to generate tasks.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAiTasks = () => {
    const selected = aiGeneratedTasks.filter((_, i) => selectedAiTasks.has(i));
    setShowAiModal(false);
    if (selected.length === 0) return;
    const newBody = content.trimEnd() + "\n\n" + selected.join("\n") + "\n";
    setContent(newBody);
    scheduleSave(newBody);
    if (mode === "list") {
      const parsed = parseProjectFile(projectName, newBody);
      setBlocks(projectToBlocks(parsed));
    }
  };

  const handleChatSend = async () => {
      const text = chatInput.trim();
      if (!text || !apiKey || !project) return;
      
      const userMsg: ChatMessage = { role: "user", content: text };
      const newHistory = [...chatMessages, userMsg];
      setChatMessages(newHistory);
      setChatInput("");
      setIsChatting(true);

      const sysPrompt = `You are an AI assistant in the "Pathway" project tracker.
The user is discussing what to do next in their project.
Help them break down their ideas into tasks. 
Format tasks strictly as: \`- [ ] \`[ Complexity | Time ]\` Description\`
Your output will be parsed for these bullets if the user clicks "Import Tasks".

Here is their current project file context:
${content}
`;

      try {
          const reply = await generateAIResponse(apiKey, newHistory, sysPrompt);
          setChatMessages([...newHistory, { role: "assistant", content: reply }]);
      } catch(e: any) {
          setChatMessages([...newHistory, { role: "assistant", content: `**Error:** ${e.message}` }]);
      } finally {
          setIsChatting(false);
      }
  };

  const handleImportChatTasks = () => {
      // Find all tasks from the entire chat history
      const tasksToImport: string[] = [];
      for (const msg of chatMessages) {
          if (msg.role === "assistant") {
             const lines = msg.content.split("\n").filter((l: string) => l.trim().startsWith("- [ ]"));
             tasksToImport.push(...lines);
          }
      }

      if (tasksToImport.length === 0) {
          setAiError("No tasks found in chat. Make sure the AI uses the format: - [ ] `[ C | T ]` Description");
          return;
      }

      const newBody = content.trimEnd() + "\n\n" + tasksToImport.join("\n") + "\n";
      setContent(newBody);
      scheduleSave(newBody);
      if (mode === "list") {
          const parsed = parseProjectFile(projectName, newBody);
          setBlocks(projectToBlocks(parsed));
      }
      setShowChat(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const allTaskBlocks = blocks.filter((b): b is TaskBlock => b.type === "task");
  const overall = calcTasksProgress(allTaskBlocks);

  if (!project) {
    return <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>Project not found.</div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}
          >
            <ArrowLeft size={14} /> Projects
          </button>
          <h1 className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {projectName}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <ModeBtn active={mode === "list"} onClick={() => switchMode("list")} icon={<List size={14} />} label="List" />
            <ModeBtn active={mode === "markdown"} onClick={() => switchMode("markdown")} icon={<FileText size={14} />} label="Markdown" />
          </div>

          <button
            onClick={() => setShowDormantPicker(true)}
            title="Set project dormant"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <Moon size={14} /> Dormant
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--danger)" }}>
              <AlertTriangle size={13} style={{ color: "var(--danger)" }} />
              <span style={{ color: "var(--text-secondary)" }}>Delete?</span>
              <button
                onClick={async () => { await deleteProject(projectName); onBack(); }}
                className="font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--danger)" }}
              >
                Yes
              </button>
              <span style={{ color: "var(--border)" }}>·</span>
              <button
                onClick={() => setConfirmDelete(false)}
                className="transition-opacity hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete project"
              className="flex items-center justify-center rounded-lg w-8 h-8 transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── LIST / BLOCK EDITOR ── */}
      {mode === "list" && (
        <div className="space-y-2">
          {/* Overall progress card */}
          <div
            className="rounded-xl px-5 pt-2 pb-4"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <ProgressBar label="Overall Progress" percent={overall.percent} />
          </div>

          <BlockEditor
            blocks={blocks}
            inputRefs={inputRefs}
            onUpdateTask={updateTask}
            onUpdateSection={updateSection}
            onTaskKeyDown={handleTaskKeyDown}
          />

          <div className="space-y-2">
            {aiError && (
              <div
                className="rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2"
                style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", color: "var(--danger)" }}
              >
                <span>{aiError}</span>
                <button onClick={() => setAiError(null)} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <FooterBtn
                onClick={() => addTaskAfter(blocks[blocks.length - 1]?.id ?? null)}
                label="Task"
                icon={<Plus size={14} />}
              />
              <FooterBtn onClick={addSection} label="Section" icon={<Plus size={14} />} />

              <div className="flex-1" />

              <button
                onClick={handleGenerateAITasks}
                disabled={isGenerating || !apiKey}
                title={!apiKey ? "Set an API Key in Settings to use AI features" : "Generate next tasks"}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ color: "#fff", background: "var(--accent)" }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKDOWN EDITOR ── */}
      {mode === "markdown" && (
        <div className="space-y-2">
          <div
            className="rounded-lg px-4 py-2.5 text-xs"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>Autofill: </span>
            <InlineCode>-</InlineCode> + space → bare task &nbsp;·&nbsp;{" "}
            <InlineCode>-435</InlineCode> + space → T=4 I=3 C=5 task &nbsp;·&nbsp;{" "}
            <InlineCode>##</InlineCode> section header
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleMarkdownChange}
            onKeyDown={handleMarkdownKeyDown}
            spellCheck={false}
            className="w-full rounded-xl px-5 py-4 text-sm font-mono leading-relaxed outline-none resize-none custom-scrollbar"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              minHeight: "64vh",
              caretColor: "var(--accent)",
            }}
          />
        </div>
      )}

      {/* ── AI TASK SELECTION MODAL ── */}
      {showAiModal && (
        <Modal title="AI Generated Tasks" onClose={() => setShowAiModal(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Select the tasks you want to add to your project.
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {aiGeneratedTasks.map((line, i) => {
                const selected = selectedAiTasks.has(i);
                const desc = line.replace(/^- \[ \] `\[.*?\]`\s*/, "").trim();
                const meta = line.match(/`\[\s*(\d+)\s*\|\s*(\d+)\s*\]`/);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{ borderBottom: i < aiGeneratedTasks.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => {
                      const n = new Set(selectedAiTasks);
                      if (n.has(i)) n.delete(i); else n.add(i);
                      setSelectedAiTasks(n);
                    }}
                  >
                    <span className="shrink-0" style={{ color: selected ? "var(--accent)" : "var(--text-muted)" }}>
                      {selected
                        ? <CheckCircle2 size={18} />
                        : <Circle size={18} />}
                    </span>
                    <span className="flex-1 text-sm" style={{ color: selected ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {desc}
                    </span>
                    {meta && (
                      <span
                        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                      >
                        T{meta[1]}·C{meta[2]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedAiTasks(
                  selectedAiTasks.size === aiGeneratedTasks.length
                    ? new Set()
                    : new Set(aiGeneratedTasks.map((_, i) => i))
                )}
                className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
              >
                {selectedAiTasks.size === aiGeneratedTasks.length ? "Deselect All" : "Select All"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAiTasks}
                  disabled={selectedAiTasks.size === 0}
                  className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-40"
                  style={{ background: "var(--accent)" }}
                >
                  Add {selectedAiTasks.size} task{selectedAiTasks.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DORMANCY PICKER MODAL ── */}
      {showDormantPicker && (
        <Modal title="Set Project Dormant" onClose={() => setShowDormantPicker(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              The project will be hidden until the selected date. It will automatically reappear in your projects list the next morning.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DORMANCY_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={async () => {
                    await setProjectDormant(projectName, addCalendarDays(p.days));
                    setShowDormantPicker(false);
                    onBack();
                  }}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={async () => {
                  await setProjectDormant(projectName, "9999-12-31");
                  setShowDormantPicker(false);
                  onBack();
                }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left flex items-center gap-2"
                style={{ background: "rgba(var(--accent-rgb), 0.08)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb), 0.2)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.08)"; }}
              >
                Mark as Done (permanent)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── AI CHAT MODAL ── */}
      {showChat && (
          <Modal title="Discuss with AI" onClose={() => setShowChat(false)}>
              <div className="flex flex-col gap-4" style={{ height: "60vh" }}>
                 <div 
                    className="flex-1 overflow-y-auto px-1 space-y-4 custom-scrollbar"
                    style={{ color: "var(--text-primary)" }}
                 >
                     {chatMessages.length === 0 && (
                         <div className="text-sm text-center py-10 opacity-50">
                             Ask the AI to help break down a large feature, or brainstorm what to do next.
                         </div>
                     )}
                     {chatMessages.map((msg, i) => (
                         <div 
                            key={i} 
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                         >
                             <div 
                                className={`px-4 py-2.5 rounded-xl text-sm max-w-[85%] whitespace-pre-wrap`}
                                style={{
                                    background: msg.role === "user" ? "var(--accent)" : "var(--bg-tertiary)",
                                    color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                                    border: msg.role !== "user" ? "1px solid var(--border)" : "none"
                                }}
                             >
                                 {msg.content}
                             </div>
                         </div>
                     ))}
                     {isChatting && (
                         <div className="flex justify-start">
                             <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                                 <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }}/>
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                     <button
                        onClick={handleImportChatTasks}
                        disabled={chatMessages.length === 0}
                        className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}
                     >
                        Import Tasks
                     </button>
                     <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                         <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent outline-none"
                            style={{ color: "var(--text-primary)" }}
                         />
                         <button 
                            onClick={handleChatSend}
                            disabled={!chatInput.trim() || isChatting}
                            className="shrink-0 p-1.5 rounded-md disabled:opacity-30 transition-opacity"
                            style={{ background: "var(--accent)", color: "#fff" }}
                         >
                             <Send size={14} />
                         </button>
                     </div>
                 </div>
              </div>
          </Modal>
      )}
    </div>
  );
}

// ── Block Editor ──────────────────────────────────────────────────────────────

function BlockEditor({
  blocks, inputRefs, onUpdateTask, onUpdateSection, onTaskKeyDown,
}: {
  blocks: Block[];
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  onUpdateTask: (id: string, patch: Partial<TaskBlock>) => void;
  onUpdateSection: (id: string, name: string) => void;
  onTaskKeyDown: (e: KeyboardEvent<HTMLInputElement>, block: TaskBlock) => void;
}) {
  if (blocks.length === 0) {
    return (
      <div
        className="py-12 text-center text-sm rounded-xl"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        No tasks yet — click "Add Task" below to get started.
      </div>
    );
  }

  // Group into sections
  type Group = { section: SectionBlock | null; tasks: TaskBlock[] };
  const groups: Group[] = [];
  let cur: Group = { section: null, tasks: [] };
  for (const b of blocks) {
    if (b.type === "section") {
      if (cur.tasks.length > 0 || cur.section) groups.push(cur);
      cur = { section: b, tasks: [] };
    } else {
      cur.tasks.push(b);
    }
  }
  groups.push(cur);

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => {
        const pct = calcTasksProgress(group.tasks).percent;
        return (
          <div
            key={gi}
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            {/* Section header row */}
            {group.section && (
              <>
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider shrink-0" style={{ color: "var(--text-muted)" }}>§</span>
                  <input
                    ref={el => { if (el) inputRefs.current.set(group.section!.id, el); else inputRefs.current.delete(group.section!.id); }}
                    value={group.section.name}
                    onChange={e => onUpdateSection(group.section!.id, e.target.value)}
                    className="flex-1 bg-transparent outline-none font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                    placeholder="Section name"
                  />
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                {/* Thin progress bar under section header */}
                <div className="h-0.5 w-full" style={{ background: "var(--bg-tertiary)" }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: "var(--accent)",
                      boxShadow: pct > 0 ? "0 0 4px rgba(var(--accent-rgb),0.5)" : "none",
                    }}
                  />
                </div>
              </>
            )}

            {/* Task rows */}
            <div className="py-1">
              {group.tasks.length === 0 && (
                <div className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  No tasks in this section yet.
                </div>
              )}
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  block={task}
                  inputRefs={inputRefs}
                  onUpdate={onUpdateTask}
                  onKeyDown={onTaskKeyDown}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({
  block, inputRefs, onUpdate, onKeyDown,
}: {
  block: TaskBlock;
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  onUpdate: (id: string, patch: Partial<TaskBlock>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, block: TaskBlock) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 pr-3 group transition-colors"
      style={{ paddingLeft: `${10 + block.level * 20}px` }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <button
        onClick={() => onUpdate(block.id, { checked: !block.checked })}
        className="shrink-0 transition-colors"
        style={{ color: block.checked ? "var(--success)" : "var(--text-muted)" }}
      >
        {block.checked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      <input
        ref={el => { if (el) inputRefs.current.set(block.id, el); else inputRefs.current.delete(block.id); }}
        value={block.description}
        onChange={e => onUpdate(block.id, { description: e.target.value })}
        onKeyDown={e => onKeyDown(e, block)}
        placeholder="Task description…"
        className="flex-1 bg-transparent outline-none text-sm min-w-0"
        style={{
          color: block.checked ? "var(--text-muted)" : "var(--text-primary)",
          textDecoration: block.checked ? "line-through" : "none",
        }}
      />

      <CycleBtn value={block.timeScale}   prefix="T" onClick={() => onUpdate(block.id, { timeScale: cycle(block.timeScale) })}     title="Time scale" />
      <CycleBtn value={block.importance}  prefix="I" onClick={() => onUpdate(block.id, { importance: cycle(block.importance) })}   title="Importance" />
      <CycleBtn value={block.complexity}  prefix="C" onClick={() => onUpdate(block.id, { complexity: cycle(block.complexity) })}   title="Complexity" />
    </div>
  );
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function CycleBtn({ value, prefix, onClick, title }: { value: number; prefix: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={`${title}: ${value} — click to cycle 1–5`}
      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold transition-colors"
      style={{ background: "var(--bg-tertiary)", color: "var(--accent)", border: "1px solid var(--border)", minWidth: 28, textAlign: "center" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {prefix}{value}
    </button>
  );
}

function FooterBtn({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
      style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {icon} {label}
    </button>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
      {children}
    </code>
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
