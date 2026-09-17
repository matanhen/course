import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, User, LayoutDashboard, BookOpen, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const getTabsForRole = (role, isManager, isConsultant) => {
  if (role === 'admin') {
    return [
      { label: 'לוח בקרה', icon: LayoutDashboard, path: '/AdminDashboard' },
      { label: 'קורסים', icon: BookOpen, path: '/AdminCourses' },
      { label: 'לקוחות', icon: Users, path: '/AdminClients' },
      { label: 'פרופיל', icon: User, path: '/Profile' },
    ];
  }
  if (isManager) {
    return [
      { label: 'קורסים', icon: BookOpen, path: '/AdminCourses' },
      { label: 'לקוחות', icon: Users, path: '/AdminClients' },
      { label: 'פרופיל', icon: User, path: '/Profile' },
    ];
  }
  if (isConsultant) {
    return [
      { label: 'הקורסים שלי', icon: Home, path: '/Home' },
      { label: 'לקוחות', icon: Users, path: '/AdminClients' },
      { label: 'פרופיל', icon: User, path: '/Profile' },
    ];
  }
  return [
    { label: 'ראשי', icon: Home, path: '/Home' },
    { label: 'פרופיל', icon: User, path: '/Profile' },
  ];
};

const DEFAULT_TABS = getTabsForRole(null, false, false);

// Per-tab navigation history (stack of visited full paths) and scroll positions
const tabHistory = {};
const scrollPositions = {};

const getTabForPath = (pathname, tabs) =>
  tabs.find(t => t.path === pathname || (t.path === '/Home' && pathname === '/home')) || tabs[0];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(DEFAULT_TABS);

  // Resolve role-based tabs once on mount
  useEffect(() => {
    let cancelled = false;
    const loadTabs = async () => {
      try {
        const u = await base44.auth.me();
        if (cancelled) return;
        if (u?.role === 'admin') {
          setTabs(getTabsForRole('admin', false, false));
          return;
        }
        const email = u?.email?.toLowerCase();
        if (!email) return;
        const clientData = await base44.entities.AllowedClient.filter({ email });
        if (cancelled) return;
        const isManager = clientData.length > 0 && clientData[0].is_manager;
        const isConsultant = clientData.length > 0 && clientData[0].is_consultant;
        setTabs(getTabsForRole(u?.role, isManager, isConsultant));
      } catch {
        // keep default tabs on error
      }
    };
    loadTabs();
    return () => { cancelled = true; };
  }, []);

  const currentTab = getTabForPath(location.pathname, tabs);

  // Save scroll position for the current full path
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    const saveCurrent = () => { scrollPositions[fullPath] = window.scrollY; };
    window.addEventListener('scrollend', saveCurrent, { passive: true });
    return () => {
      scrollPositions[fullPath] = window.scrollY;
      window.removeEventListener('scrollend', saveCurrent);
    };
  }, [location.pathname, location.search]);

  const handleTabPress = (tab) => {
    const fullPath = location.pathname + location.search;
    const isActive = currentTab.path === tab.path;

    if (isActive) {
      // Re-tapping active tab: reset its stack to root and scroll to top
      tabHistory[tab.path] = [tab.path];
      scrollPositions[tab.path] = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(tab.path, { replace: true });
    } else {
      // Save current location into the current tab's history stack
      const stack = tabHistory[currentTab.path] || [currentTab.path];
      if (stack[stack.length - 1] !== fullPath) stack.push(fullPath);
      tabHistory[currentTab.path] = stack;

      // Restore destination tab's last visited location (or its root)
      const destStack = tabHistory[tab.path] || [tab.path];
      const dest = destStack[destStack.length - 1] || tab.path;

      navigate(dest);
      requestAnimationFrame(() => {
        const saved = scrollPositions[dest] ?? 0;
        window.scrollTo({ top: saved, behavior: 'instant' });
      });
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive = currentTab.path === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => handleTabPress(tab)}
            aria-label={tab.label}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[56px] py-2 ${
              isActive ? 'text-[#c7af48]' : 'text-muted-foreground'
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