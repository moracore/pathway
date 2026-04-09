import { Settings, Scale } from 'lucide-react';

interface AppHeaderProps {
  onSettingsOpen: () => void;
  onPhysicsOpen?: () => void;
  showPhysics?: boolean;
}

export default function AppHeader({ onSettingsOpen, onPhysicsOpen, showPhysics }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header-title">Pathway</span>
      {showPhysics && (
        <button className="app-header-btn" onClick={onPhysicsOpen} aria-label="Physics">
          <Scale size={20} />
        </button>
      )}
      <button className="app-header-btn" onClick={onSettingsOpen} aria-label="Settings">
        <Settings size={20} />
      </button>
    </header>
  );
}
