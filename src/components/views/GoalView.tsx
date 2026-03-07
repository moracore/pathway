import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  ArrowLeft, List, FileText, Trash2, AlertTriangle,
  Sparkles, Loader2, Plus, CheckCircle2, Circle, X,
} from "lucide-react";
import { useFileSystem } from "../../hooks";
import { useTheme } from "../../context/ThemeContext";
import { parseGoalFile, goalToMarkdown } from "../../lib/parser";
import { generateMilestonesForGoal } from "../../lib/ai";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "list" | "markdown";

let _uid = 0;
const uid = () => String(++_uid);

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface MilestoneBlock {
  id: string;
  name: string;
  dateCreated: string;
  deadline: string;
  projectLink: string;
  reached: boolean;
}

function parsedToBlocks(milestones: ReturnType<typeof parseGoalFile>["milestones"]): MilestoneBlock[] {
  return milestones.map((m) => ({
    id: uid(),
    name: m.name,
    dateCreated: m.dateCreated,
    deadline: m.deadline ?? "",
    projectLink: m.projectLink ?? "",
    reached: m.reached,
  }));
}

function blocksToMarkdown(goalName: string, blocks: MilestoneBlock[]): string {
  return goalToMarkdown({
    name: goalName,
    milestones: blocks.map((b) => ({
      name: b.name,
      dateCreated: b.dateCreated,
      deadline: b.deadline || undefined,
      projectLink: b.projectLink || undefined,
      reached: b.reached,
    })),
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GoalView({ goalName, onBack }: { goalName: string; onBack: () => void }) {
  const { goals, saveGoalContent, deleteGoal, projects } = useFileSystem();
  const { apiKey } = useTheme();
  const goal = goals.find((g) => g.name === goalName);

  const [mode, setMode] = useState<Mode>("list");
  const [blocks, setBlocks] = useState<MilestoneBlock[]>([]);
  const [content, setContent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef("");
  const nameInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (goal) {
      setContent(goal.content);
      setBlocks(parsedToBlocks(goal.milestones));
    }
  }, [goal?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingFocusId.current) {
      const el = nameInputRefs.current.get(pendingFocusId.current);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      pendingFocusId.current = null;
    }
  });

  const scheduleSave = useCallback((c: string) => {
    latestContent.current = c;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveGoalContent(goalName, latestContent.current);
    }, 1200);
  }, [goalName, saveGoalContent]);

  const commitBlocks = useCallback((newBlocks: MilestoneBlock[]) => {
    setBlocks(newBlocks);
    const md = blocksToMarkdown(goalName, newBlocks);
    setContent(md);
    scheduleSave(md);
  }, [goalName, scheduleSave]);

  const updateBlock = (id: string, patch: Partial<MilestoneBlock>) =>
    commitBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const deleteBlock = (id: string) =>
    commitBlocks(blocks.filter((b) => b.id !== id));

  const addMilestone = () => {
    const m: MilestoneBlock = {
      id: uid(),
      name: "",
      dateCreated: todayString(),
      deadline: "",
      projectLink: "",
      reached: false,
    };
    commitBlocks([...blocks, m]);
    pendingFocusId.current = m.id;
  };

  const switchMode = (next: Mode) => {
    if (next === "list") {
      const parsed = parseGoalFile(`_Goal_${goalName}.md`, content);
      setBlocks(parsedToBlocks(parsed.milestones));
    }
    setMode(next);
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    scheduleSave(e.target.value);
  };

  const handleGenerateMilestones = async () => {
    if (!apiKey) return;
    setAiError(null);
    setAiSuggestions([]);
    setIsGenerating(true);
    try {
      const existing = blocks.map((b) => b.name).filter(Boolean);
      const suggestions = await generateMilestonesForGoal(apiKey, goalName, existing);
      if (suggestions.length === 0) {
        setAiError("AI didn't return any suggestions. Try adding context manually first.");
      } else {
        setAiSuggestions(suggestions);
      }
    } catch (e: unknown) {
      setAiError((e as Error).message || "Failed to generate milestones.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addSuggestion = (name: string) => {
    const m: MilestoneBlock = {
      id: uid(),
      name,
      dateCreated: todayString(),
      deadline: "",
      projectLink: "",
      reached: false,
    };
    commitBlocks([...blocks, m]);
    setAiSuggestions((s) => s.filter((x) => x !== name));
  };

  if (!goal) {
    return <div className="py-20 text-center" style={{ color: "var(--text-muted)" }}>Goal not found.</div>;
  }

  const projectNames = projects.map((p) => p.projectName);

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
            <ArrowLeft size={14} /> Goals
          </button>
          <h1 className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {goalName}
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

          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--danger)" }}>
              <AlertTriangle size={13} style={{ color: "var(--danger)" }} />
              <span style={{ color: "var(--text-secondary)" }}>Delete?</span>
              <button
                onClick={async () => { await deleteGoal(goalName); onBack(); }}
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
              title="Delete goal"
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

      {/* ── LIST MODE ── */}
      {mode === "list" && (
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div
              className="py-12 text-center text-sm rounded-xl"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              No milestones yet — click "Add Milestone" below.
            </div>
          ) : (
            blocks.map((block) => (
              <MilestoneCard
                key={block.id}
                block={block}
                nameInputRefs={nameInputRefs}
                projectNames={projectNames}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
              />
            ))
          )}

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  AI Suggestions
                </span>
                <button onClick={() => setAiSuggestions([])} style={{ color: "var(--text-muted)" }}>
                  <X size={14} />
                </button>
              </div>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{s}</span>
                  <button
                    onClick={() => addSuggestion(s)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--bg-tertiary)", color: "var(--accent)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
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
              <button
                onClick={addMilestone}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <Plus size={14} /> Add Milestone
              </button>

              <div className="flex-1" />

              <button
                onClick={handleGenerateMilestones}
                disabled={isGenerating || !apiKey}
                title={!apiKey ? "Set an API Key in Settings to use AI features" : "Suggest milestones with AI"}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ color: "#fff", background: "var(--accent)" }}
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGenerating ? "Thinking..." : "Suggest Milestones"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKDOWN MODE ── */}
      {mode === "markdown" && (
        <div className="space-y-2">
          <div
            className="rounded-lg px-4 py-2.5 text-xs"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>Format: </span>
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)" }}># Goal Name</code>
            {" "}&nbsp;·&nbsp;{" "}
            <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)" }}>## Milestone</code>
            {" "}&nbsp;·&nbsp; Deadline/Project Link optional in blockquotes
          </div>
          <textarea
            value={content}
            onChange={handleMarkdownChange}
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
    </div>
  );
}

// ── Milestone Card ─────────────────────────────────────────────────────────────

function MilestoneCard({
  block, nameInputRefs, projectNames, onUpdate, onDelete,
}: {
  block: MilestoneBlock;
  nameInputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>;
  projectNames: string[];
  onUpdate: (id: string, patch: Partial<MilestoneBlock>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-colors"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      {/* Row 1: Checkbox + Name + Delete */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdate(block.id, { reached: !block.reached })}
          className="shrink-0 transition-colors"
          style={{ color: block.reached ? "var(--success)" : "var(--text-muted)" }}
        >
          {block.reached ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
        <input
          ref={el => { if (el) nameInputRefs.current.set(block.id, el); else nameInputRefs.current.delete(block.id); }}
          value={block.name}
          onChange={e => onUpdate(block.id, { name: e.target.value })}
          placeholder="Milestone name…"
          className="flex-1 bg-transparent outline-none font-semibold text-sm min-w-0"
          style={{
            color: block.reached ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: block.reached ? "line-through" : "none",
          }}
        />
        <button
          onClick={() => onDelete(block.id)}
          className="shrink-0 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: Metadata */}
      <div className="flex flex-wrap gap-3 pl-8">
        <MetaField label="Created">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{block.dateCreated}</span>
        </MetaField>

        <MetaField label="Deadline">
          <input
            type="date"
            value={block.deadline}
            onChange={e => onUpdate(block.id, { deadline: e.target.value })}
            className="bg-transparent outline-none text-xs"
            style={{ color: block.deadline ? "var(--text-secondary)" : "var(--text-muted)", colorScheme: "dark" }}
          />
        </MetaField>

        <MetaField label="Project">
          <input
            list={`proj-list-${block.id}`}
            value={block.projectLink}
            onChange={e => onUpdate(block.id, { projectLink: e.target.value })}
            placeholder="Link a project…"
            className="bg-transparent outline-none text-xs min-w-0 w-32"
            style={{ color: block.projectLink ? "var(--accent)" : "var(--text-muted)" }}
          />
          <datalist id={`proj-list-${block.id}`}>
            {projectNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </MetaField>
      </div>
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>{label}:</span>
      {children}
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
