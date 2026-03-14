import { type ReactNode } from "react";
import { Calendar, FolderKanban, Target, Moon, Settings, BarChart2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Tab } from "../App";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showSettings: boolean;
  onOpenSettings: () => void;
}

const TAB_DEFS: Record<string, { id: Tab; label: string; icon: React.ElementType; enableKey: string | null }> = {
  today:    { id: "today",    label: "Today",    icon: Calendar,     enableKey: "enableToday"    },
  projects: { id: "projects", label: "Projects", icon: FolderKanban, enableKey: null             },
  goals:    { id: "goals",    label: "Goals",    icon: Target,       enableKey: "enableGoals"    },
  trackers: { id: "trackers", label: "Trackers", icon: BarChart2,    enableKey: "enableTrackers" },
  done:     { id: "done",     label: "Dormant",  icon: Moon,         enableKey: "enableDone"     },
};

export function Layout({ children, activeTab, setActiveTab, showSettings, onOpenSettings }: LayoutProps) {
  const { enableToday, enableGoals, enableTrackers, enableDone, navOrder } = useTheme();

  const flags: Record<string, boolean> = { enableToday, enableGoals, enableTrackers, enableDone };

  // Build ordered tabs: navOrder items (filtered by their enable flag), then done last if enabled
  const orderedNonDone = navOrder
    .map(id => TAB_DEFS[id])
    .filter(Boolean)
    .filter(t => t.enableKey === null || flags[t.enableKey]);

  const visibleTabs = enableDone
    ? [...orderedNonDone, TAB_DEFS.done]
    : orderedNonDone;

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
          className="md:hidden flex items-center justify-between px-4 sticky top-0 z-10"
          style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
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
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
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
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
