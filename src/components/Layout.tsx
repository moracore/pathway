import { type ReactNode } from "react";
import { Calendar, FolderKanban, Target, CheckCircle, Settings } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Tab } from "../App";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showSettings: boolean;
  onOpenSettings: () => void;
}

const ALL_TABS = [
  { id: "today"    as Tab, label: "Today",    icon: Calendar,      optional: true,  key: "enableToday" as const },
  { id: "projects" as Tab, label: "Projects", icon: FolderKanban,  optional: false, key: null },
  { id: "goals"    as Tab, label: "Goals",    icon: Target,        optional: true,  key: "enableGoals" as const },
  { id: "done"     as Tab, label: "Done",     icon: CheckCircle,   optional: false, key: null },
];

export function Layout({ children, activeTab, setActiveTab, showSettings, onOpenSettings }: LayoutProps) {
  const { enableToday, enableGoals } = useTheme();

  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.key === "enableToday") return enableToday;
    if (t.key === "enableGoals") return enableGoals;
    return true;
  });

  return (
    <div
      className="flex h-screen w-full font-sans overflow-hidden"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0"
        style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Pathway
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 mt-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !showSettings && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left"
                style={{
                  background: isActive ? "var(--bg-tertiary)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={18} style={{ color: isActive ? "var(--accent)" : "inherit" }} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left"
            style={{
              background: showSettings ? "var(--bg-tertiary)" : "transparent",
              color: showSettings ? "var(--text-primary)" : "var(--text-secondary)",
            }}
            onMouseEnter={e => { if (!showSettings) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={e => { if (!showSettings) e.currentTarget.style.background = "transparent"; }}
          >
            <Settings size={18} style={{ color: showSettings ? "var(--accent)" : "inherit" }} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-10"
          style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
        >
          <h1 className="font-bold" style={{ color: "var(--text-primary)" }}>Pathway</h1>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors"
            style={{ color: showSettings ? "var(--accent)" : "var(--text-muted)" }}
          >
            <Settings size={20} />
          </button>
        </header>

        {/* Mobile bottom tab bar */}
        <div
          className="md:hidden order-last flex border-t sticky bottom-0 z-10"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !showSettings && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-2 transition-colors"
                style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon size={20} className="mb-0.5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
