import { useState } from 'react';
import { Rotate3D, Album, CalendarDays, Palette, ShieldEllipsis } from 'lucide-react';
import type { TabId } from '../types';

interface BottomNavProps {
  activeTab: TabId;
  visibleTabs: TabId[];
  onTabChange: (tab: TabId) => void;
}

const ALL_TABS = [
  { id: 'tasks',    icon: Rotate3D,       label: 'Tasks' },
  { id: 'projects', icon: Album,          label: 'Projects' },
  { id: 'calendar', icon: CalendarDays,   label: 'Calendar' },
  { id: 'groups',   icon: Palette,        label: 'Groups' },
  { id: 'trackers', icon: ShieldEllipsis, label: 'Trackers' },
] as const;

export default function BottomNav({ activeTab, visibleTabs, onTabChange }: BottomNavProps) {
  const [trackerTaps, setTrackerTaps] = useState({ count: 0, last: 0 });

  // Hide nav entirely if only tasks is visible
  if (visibleTabs.length <= 1) return null;

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'trackers') {
      const now = Date.now();
      if (now - trackerTaps.last < 500) {
        const next = trackerTaps.count + 1;
        if (next >= 15) {
          const pwd = prompt('Configure 6-digit PIN for Trackers (leave blank to remove):', localStorage.getItem('pathway-tracker-password') || '');
          if (pwd !== null) {
            const pin = pwd.replace(/\D/g, '').slice(0, 6);
            if (pin.length === 6) { localStorage.setItem('pathway-tracker-password', pin); alert('PIN saved.'); }
            else if (pwd.trim() === '') localStorage.removeItem('pathway-tracker-password');
            else alert('Invalid PIN. Must be 6 digits.');
          }
          setTrackerTaps({ count: 0, last: 0 });
        } else {
          setTrackerTaps({ count: next, last: now });
        }
      } else {
        setTrackerTaps({ count: 1, last: now });
      }
    }
    onTabChange(tabId);
  };

  const tabs = ALL_TABS.filter(t => visibleTabs.includes(t.id as TabId));

  return (
    <nav className="bottom-nav" id="bottom-nav">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => handleTabClick(tab.id as TabId)}
            id={`nav-${tab.id}`}
          >
            <Icon size={20} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
