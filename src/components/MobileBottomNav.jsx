import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Home, User } from 'lucide-react';

const tabs = [
  { label: 'ראשי', icon: Home, path: '/Home' },
  { label: 'קורסים', icon: BookOpen, path: '/Home' },
  { label: 'פרופיל', icon: User, path: '/Profile' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabPress = (tab) => {
    const isActive =
      location.pathname === tab.path ||
      (tab.path === '/Home' && location.pathname === '/home');

    if (isActive) {
      // Re-tapping active tab resets to its root
      navigate(tab.path, { replace: true });
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive =
          location.pathname === tab.path ||
          (tab.path === '/Home' && location.pathname === '/home');
        return (
          <button
            key={tab.label}
            onClick={() => handleTabPress(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[56px] py-2 ${
              isActive ? 'text-[#c7af48]' : 'text-gray-500'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}