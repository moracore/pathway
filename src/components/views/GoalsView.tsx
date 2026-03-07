import { useState } from "react";
import { Plus, Flag, Milestone } from "lucide-react";
import { useFileSystem } from "../../hooks";
import { Modal } from "../ui/Modal";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface GoalsViewProps {
  onSelectGoal: (name: string) => void;
}

export function GoalsView({ onSelectGoal }: GoalsViewProps) {
  const { goals, createGoal } = useFileSystem();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setShowModal(false);
    await createGoal(trimmed);
    onSelectGoal(trimmed);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Goals
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div
          className="py-20 text-center text-sm rounded-xl border border-dashed"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          No goals yet. Set one to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const totalMilestones = g.milestones.length;
            const metMilestones = g.milestones.filter((m) => m.reached).length;

            // Find nearest upcoming deadline from unreached milestones
            const upcomingDeadlines = g.milestones
              .filter((m) => !m.reached && m.deadline)
              .map((m) => ({ name: m.name, days: daysUntil(m.deadline!) }))
              .filter((x) => x.days >= 0)
              .sort((a, b) => a.days - b.days);

            const nextDeadline = upcomingDeadlines[0] ?? null;

            return (
              <div
                key={g.name}
                className="rounded-xl p-5 transition-colors cursor-pointer"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => onSelectGoal(g.name)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(var(--accent-rgb), 0.4)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                }}
              >
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  {g.name}
                </h3>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Milestone size={13} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Milestones:{" "}
                      <span className="font-semibold" style={{ color: metMilestones === totalMilestones && totalMilestones > 0 ? "var(--success)" : "var(--text-primary)" }}>
                        {metMilestones}/{totalMilestones}
                      </span>
                    </span>
                  </div>

                  {nextDeadline !== null && (
                    <div className="flex items-center gap-1.5">
                      <Flag size={13} style={{ color: nextDeadline.days <= 7 ? "var(--danger)" : "var(--text-muted)" }} />
                      <span
                        className="text-sm"
                        style={{ color: nextDeadline.days <= 7 ? "var(--danger)" : "var(--text-secondary)" }}
                      >
                        Next deadline:{" "}
                        <span className="font-semibold">
                          {nextDeadline.days === 0
                            ? "Today"
                            : nextDeadline.days === 1
                            ? "Tomorrow"
                            : `${nextDeadline.days} days`}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New goal modal */}
      {showModal && (
        <Modal title="New Goal" onClose={() => { setShowModal(false); setName(""); }}>
          <div className="space-y-4">
            <input
              autoFocus
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Goal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowModal(false); setName(""); }}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
