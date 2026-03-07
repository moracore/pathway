import { useState } from "react";
import { Plus } from "lucide-react";
import { useFileSystem } from "../../hooks";
import { ProjectCard } from "../ProjectCard";
import { Modal } from "../ui/Modal";

interface ProjectsViewProps {
  onSelectProject: (name: string) => void;
}

export function ProjectsView({ onSelectProject }: ProjectsViewProps) {
  const { projects, createProject } = useFileSystem();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    setShowModal(false);
    await createProject(trimmed);
    onSelectProject(trimmed);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Projects
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div
          className="py-20 text-center text-sm rounded-xl border border-dashed"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          No active projects. Create one to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.projectName}
              project={p}
              onOpen={() => onSelectProject(p.projectName)}
            />
          ))}
        </div>
      )}

      {/* New project modal */}
      {showModal && (
        <Modal title="New Project" onClose={() => { setShowModal(false); setName(""); }}>
          <div className="space-y-4">
            <input
              autoFocus
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Project name"
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
