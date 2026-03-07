import { useFileSystem } from "../../hooks";

export function DoneView({ onSelectProject }: { onSelectProject: (name: string) => void }) {
  const { completedProjects } = useFileSystem();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Done
      </h1>

      {completedProjects.length === 0 ? (
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
          {completedProjects.map((p) => (
            <div
              key={p.projectName}
              className="flex items-center justify-between rounded-xl p-5 transition-colors cursor-pointer"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(var(--accent-rgb), 0.2)",
              }}
              onClick={() => onSelectProject(p.projectName)}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(var(--accent-rgb), 0.5)")
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "rgba(var(--accent-rgb), 0.2)")
              }
            >
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {p.projectName}
              </span>
              <span
                className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded border"
                style={{
                  background: "rgba(var(--accent-rgb), 0.1)",
                  color: "var(--accent)",
                  borderColor: "rgba(var(--accent-rgb), 0.2)",
                }}
              >
                Complete
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
