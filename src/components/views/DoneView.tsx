import { useFileSystem } from "../../hooks";

type DoneItem =
  | { kind: "project";  name: string }
  | { kind: "tracker";  name: string }
  | { kind: "goal";     name: string };

const BADGE: Record<DoneItem["kind"], string> = {
  project: "Project",
  tracker: "Tracker",
  goal:    "Goal",
};

export function DoneView({ onSelectProject }: { onSelectProject: (name: string) => void }) {
  const { completedProjects, completedTrackerNames, goals } = useFileSystem();

  const completedGoals = goals.filter(
    g => g.milestones.length > 0 && g.milestones.every(m => m.reached)
  );

  const items: DoneItem[] = [
    ...completedProjects.map(p  => ({ kind: "project"  as const, name: p.projectName })),
    ...completedTrackerNames.map(n => ({ kind: "tracker" as const, name: n           })),
    ...completedGoals.map(g    => ({ kind: "goal"     as const, name: g.name        })),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Done
      </h1>

      {items.length === 0 ? (
        <div
          className="py-20 text-center text-sm rounded-xl border border-dashed"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Nothing completed yet — keep going!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const clickable = item.kind === "project";
            return (
              <div
                key={`${item.kind}-${item.name}`}
                className="flex items-center justify-between rounded-xl p-5 transition-colors"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid rgba(var(--accent-rgb), 0.2)",
                  cursor: clickable ? "pointer" : "default",
                }}
                onClick={clickable ? () => onSelectProject(item.name) : undefined}
                onMouseEnter={e => {
                  if (clickable)
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(var(--accent-rgb), 0.5)";
                }}
                onMouseLeave={e => {
                  if (clickable)
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(var(--accent-rgb), 0.2)";
                }}
              >
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {item.name}
                </span>
                <span
                  className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded border"
                  style={{
                    background: "rgba(var(--accent-rgb), 0.1)",
                    color: "var(--accent)",
                    borderColor: "rgba(var(--accent-rgb), 0.2)",
                  }}
                >
                  {BADGE[item.kind]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
