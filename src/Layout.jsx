import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  BookOpen, 
  Users, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  Home,
  GraduationCap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAllowed, setIsAllowed] = useState(null);

  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser?.role === 'admin');
        
        if (currentUser?.role !== 'admin') {
          const clientAccess = await base44.entities.ClientCourseAccess.filter({ email: currentUser.email });
          setIsAllowed(clientAccess.length > 0);
          
          const clientData = await base44.entities.AllowedClient.filter({ email: currentUser.email });
          if (clientData.length > 0 && clientData[0].name) {
            setClientName(clientData[0].name);
          }
        } else {
          setIsAllowed(true);
        }
      } catch (e) {
        setUser(null);
        setIsAllowed(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <GraduationCap className="w-20 h-20 text-[#c7af48] mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">האקדמיה של צעירים מתעשרים</h1>
          <p className="text-gray-400 mb-8">התחבר כדי לגשת לקורסים</p>
          <Button 
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold px-8 py-3"
          >
            התחברות
          </Button>
        </div>
      </div>
    );
  }

  if (!isAllowed && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">אין לך הרשאה</h1>
          <p className="text-gray-400 mb-8">אין לך הרשאה לגשת למערכת הקורסים. פנה למנהל המערכת.</p>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            התנתק
          </Button>
        </div>
      </div>
    );
  }

  const adminLinks = [
    { name: 'לוח בקרה', page: 'AdminDashboard', icon: Home },
    { name: 'ניהול קורסים', page: 'AdminCourses', icon: BookOpen },
    { name: 'ניהול לקוחות', page: 'AdminClients', icon: Users },
  ];

  const userLinks = [
    { name: 'הקורסים שלי', page: 'Home', icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="min-h-screen bg-black" dir="rtl">
      <style>{`
        :root {
          --gold: #c7af48;
          --gold-dark: #b39d3d;
        }
        
        .gold-gradient {
          background: linear-gradient(135deg, #c7af48 0%, #e5d07a 50%, #c7af48 100%);
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(199, 175, 72, 0.1);
        }
        
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c7af48;
          border-radius: 3px;
        }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-effect">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-[#c7af48]"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#c7af48]" />
            <span className="font-bold text-white">האקדמיה של צעירים מתעשרים</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-zinc-950 z-50 lg:hidden border-l border-zinc-800"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-[#c7af48]" />
                  <span className="font-bold text-white">האקדמיה של צעירים מתעשרים</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <nav className="p-4 space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.page}
                    to={createPageUrl(link.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentPageName === link.page
                        ? 'bg-[#c7af48]/10 text-[#c7af48]'
                        : 'text-gray-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                    <span className="text-black font-bold">
                      {user?.full_name?.[0] || user?.email?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{clientName || user?.full_name || user?.email?.split('@')[0] || 'משתמש'}</p>
                    <p className="text-gray-500 text-sm truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5 ml-2" />
                  התנתק
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-64 bg-zinc-950 border-l border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">האקדמיה של צעירים מתעשרים</h1>
              <p className="text-xs text-gray-500">{isAdmin ? 'ניהול' : 'לקוח'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.page}
              to={createPageUrl(link.page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentPageName === link.page
                  ? 'bg-[#c7af48]/10 text-[#c7af48] border border-[#c7af48]/20'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <link.icon className="w-5 h-5" />
              <span className="font-medium">{link.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <span className="text-black font-bold">
                {user?.full_name?.[0] || user?.email?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{clientName || user?.full_name || user?.email?.split('@')[0] || 'משתמש'}</p>
              <p className="text-gray-500 text-sm truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5 ml-2" />
            התנתק
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:mr-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}