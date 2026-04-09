import { Settings, Scale } from 'lucide-react';

const DAILY_QUOTES: [string, string][] = [
  ['So much universe, and so little time.', 'Terry Pratchett'],
  ['We are made of star-stuff.', 'Carl Sagan'],
  ['It is not in the stars to hold our destiny but in ourselves.', 'William Shakespeare'],
  ['Not all those who wander are lost.', 'J.R.R. Tolkien'],
  ['The fundamental interconnectedness of all things.', 'Douglas Adams'],
  ['The soul of man was made to walk the skies.', 'Edward Young'],
  ['I, a universe of atoms, an atom in the universe.', 'Richard Feynman'],
];

interface AppHeaderProps {
  onSettingsOpen: () => void;
  onPhysicsOpen?: () => void;
  showPhysics?: boolean;
}

export default function AppHeader({ onSettingsOpen, onPhysicsOpen, showPhysics }: AppHeaderProps) {
  const dayIndex = (new Date().getDay() + 6) % 7;
  const [quote, author] = DAILY_QUOTES[dayIndex];

  return (
    <header className="app-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="app-header-title" style={{ lineHeight: 1 }}>Pathway</span>
        <div style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
          {quote} <span style={{ opacity: 0.6 }}>— {author}</span>
        </div>
      </div>
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
