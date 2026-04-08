import { Settings } from 'lucide-react';

interface AppHeaderProps {
  onSettingsOpen: () => void;
}

export default function AppHeader({ onSettingsOpen }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header-title">Pathway</span>
      <button className="app-header-btn" onClick={onSettingsOpen} aria-label="Settings">
        <Settings size={20} />
      </button>
    </header>
  );
}
