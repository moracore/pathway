import { Settings, Scale } from 'lucide-react';
import { useRef, useLayoutEffect, useState } from 'react';

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
  tabLabel?: string;
}

export default function AppHeader({ onSettingsOpen, onPhysicsOpen, showPhysics, tabLabel }: AppHeaderProps) {
  const dayIndex = 2; // Forced Shakespeare for testing
  const [quote, author] = DAILY_QUOTES[dayIndex];
  const quoteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      if (quoteRef.current && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = quoteRef.current.scrollWidth;
        if (textWidth > containerWidth && containerWidth > 0) {
          setScale(containerWidth / textWidth);
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [quote, author]);

  return (
    <header className="app-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="app-header-title" style={{ flex: 1, lineHeight: 1 }}>Pathway <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>&middot; {tabLabel}</span></span>
        <div style={{ display: 'flex', marginTop: -4, marginBottom: -4 }}>
          {showPhysics && (
            <button className="app-header-btn" onClick={onPhysicsOpen} aria-label="Physics">
              <Scale size={20} />
            </button>
          )}
          <button className="app-header-btn" onClick={onSettingsOpen} aria-label="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ overflow: 'hidden', width: '100%' }}>
        <div 
          ref={quoteRef}
          style={{ 
            fontSize: 10, 
            color: 'var(--clr-text-muted)', 
            whiteSpace: 'nowrap', 
            fontStyle: 'italic', 
            marginTop: -2,
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
            width: 'max-content',
            display: 'block'
          }}
        >
          {quote} <span style={{ opacity: 0.6 }}>— {author}</span>
        </div>
      </div>
    </header>
  );
}
