import { useState } from "react";
import { Moon } from "lucide-react";
import { useFileSystem } from "../../hooks";

function formatDormantDate(dateStr: string): string {
  if (dateStr === "9999-12-31") return "Permanent";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DormantView({ onSelectProject }: { onSelectProject: (name: string) => void }) {
  const { dormantProjects, reactivateProject, completedTrackerNames, goals } = useFileSystem();
  const [confirmReactivate, setConfirmReactivate] = useState<string | null>(null);

  const completedGoals = goals.filter(
    g => g.milestones.length > 0 && g.milestones.every(m => m.reached)
  );

  const handleReactivate = async (name: string) => {
    await reactivateProject(name);
    onSelectProject(name);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Dormant
      </h1>

      {/* Dormant projects */}
      {dormantProjects.length === 0 ? (
        <div
          className="py-16 text-center text-sm rounded-xl border border-dashed"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          No dormant projects — everything is active!
        </div>
      ) : (
        <div className="space-y-2">
          {dormantProjects.map((p) => {
            const isConfirming = confirmReactivate === p.projectName;
            return (
              <div
                key={p.projectName}
                className="flex items-center justify-between rounded-xl px-5 py-4 gap-3"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Moon size={16} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {p.projectName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Until {p.dormantUntil ? formatDormantDate(p.dormantUntil) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isConfirming ? (
                    <>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Reactivate?</span>
                      <button
                        onClick={() => handleReactivate(p.projectName)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb), 0.3)" }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmReactivate(null)}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmReactivate(p.projectName)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed trackers & goals */}
      {(completedTrackerNames.length > 0 || completedGoals.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Completed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedTrackerNames.map(name => (
              <div
                key={`tracker-${name}`}
                className="flex items-center justify-between rounded-xl p-4"
                style={{ background: "var(--bg-secondary)", border: "1px solid rgba(var(--accent-rgb), 0.15)" }}
              >
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{name}</span>
                <span
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border"
                  style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent)", borderColor: "rgba(var(--accent-rgb), 0.2)" }}
                >
                  Tracker
                </span>
              </div>
            ))}
            {completedGoals.map(g => (
              <div
                key={`goal-${g.name}`}
                className="flex items-center justify-between rounded-xl p-4"
                style={{ background: "var(--bg-secondary)", border: "1px solid rgba(var(--accent-rgb), 0.15)" }}
              >
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                <span
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border"
                  style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent)", borderColor: "rgba(var(--accent-rgb), 0.2)" }}
                >
                  Goal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
