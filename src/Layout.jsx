import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import MobileBottomNav from '@/components/MobileBottomNav';
import { 
  BookOpen, 
  Users, 
  Menu, 
  X, 
  LogOut,
  Home,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAllowed, setIsAllowed] = useState(null);
  const [isConsultant, setIsConsultant] = useState(false);

  const [clientName, setClientName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Root pages (tabs) — no back button on these
  const rootPaths = ['/Home', '/home', '/Profile', '/AdminDashboard', '/AdminCourses', '/AdminClients'];
  const isRootPage = rootPaths.some(p => location.pathname === p);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          // Not logged in — redirect to login
          base44.auth.redirectToLogin(window.location.pathname + window.location.search);
          return;
        }
        setUser(currentUser);
        setIsAdmin(currentUser?.role === 'admin');
        
        if (currentUser?.role !== 'admin') {
          const normalizedEmail = currentUser.email?.toLowerCase();
          const originalEmail = currentUser.email;
          
          // Fetch allowed client data - try both normalized and original email
          const [clientDataNorm, clientDataOrig, clientAccess] = await Promise.all([
            base44.entities.AllowedClient.filter({ email: normalizedEmail }),
            originalEmail !== normalizedEmail
              ? base44.entities.AllowedClient.filter({ email: originalEmail })
              : Promise.resolve([]),
            base44.entities.ClientCourseAccess.filter({ email: normalizedEmail })
          ]);

          // Merge results, deduplicate by id
          const seen = new Set();
          const clientData = [...clientDataNorm, ...clientDataOrig].filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });

          // If found with non-normalized email, fix it in the background
          if (clientDataOrig.length > 0 && clientDataNorm.length === 0) {
            clientDataOrig.forEach(c => {
              base44.entities.AllowedClient.update(c.id, { email: normalizedEmail }).catch(() => {});
            });
          }

          const isManagerUser = clientData.length > 0 && clientData[0].is_manager;
          const isConsultantUser = clientData.length > 0 && clientData[0].is_consultant;
          setIsConsultant(isConsultantUser || isManagerUser);

          if (clientData.length > 0) {
            const client = clientData[0];
            
            // Update user_type via updateMe (not asServiceRole) to avoid permission errors
            if (client.is_consultant && currentUser.user_type !== 'consultant') {
              base44.auth.updateMe({ user_type: 'consultant' }).catch(() => {});
            }
            
            if (client.name) {
              setClientName(client.name);
            }
            
            if (!client.first_login_date) {
              base44.entities.AllowedClient.update(client.id, {
                first_login_date: new Date().toISOString()
              }).catch(() => {});
            }
          }
          
          // Being in AllowedClient OR having any course access is sufficient
          if (isConsultantUser || clientData.length > 0) {
            setIsAllowed(true);
          } else if (clientAccess.length > 0) {
            // User has course access but no AllowedClient record - fix it silently
            base44.entities.AllowedClient.create({ email: normalizedEmail }).catch(() => {});
            setIsAllowed(true);
          } else {
            setIsAllowed(false);
          }
        } else {
          setIsAllowed(true);
          setIsConsultant(false);
        }
      } catch (e) {
        // On network error, retry once after 2 seconds before showing "no access"
        console.warn('Auth check failed, retrying...', e);
        setTimeout(async () => {
          try {
            const currentUser = await base44.auth.me();
            if (!currentUser) {
              base44.auth.redirectToLogin(window.location.pathname + window.location.search);
              return;
            }
            setUser(currentUser);
            setIsAdmin(currentUser?.role === 'admin');
            if (currentUser?.role === 'admin') {
              setIsAllowed(true);
              setIsConsultant(false);
              return;
            }
            const normalizedEmail = currentUser.email?.toLowerCase();
            const [clientData, clientAccess] = await Promise.all([
              base44.entities.AllowedClient.filter({ email: normalizedEmail }),
              base44.entities.ClientCourseAccess.filter({ email: normalizedEmail })
            ]);
            const isConsultantUser = clientData.length > 0 && (clientData[0].is_consultant || clientData[0].is_manager);
            setIsConsultant(isConsultantUser);
            if (clientData.length > 0 && clientData[0].name) setClientName(clientData[0].name);
            setIsAllowed(isConsultantUser || clientData.length > 0 || clientAccess.length > 0);
          } catch {
            // After retry failure, still don't show "no access" — show login instead
            setUser(null);
            setIsAllowed(null); // Keep loading state, redirect will handle it
            base44.auth.redirectToLogin(window.location.pathname + window.location.search);
          }
        }, 2000);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isAllowed === null || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
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
    { name: 'צפייה בקורסים', page: 'Home', icon: GraduationCap },
  ];

  const consultantLinks = [
    { name: 'הקורסים שלי', page: 'Home', icon: BookOpen },
    { name: 'ניהול לקוחות', page: 'AdminClients', icon: Users },
  ];

  const userLinks = [
    { name: 'הקורסים שלי', page: 'Home', icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : isConsultant ? consultantLinks : userLinks;

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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-effect"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          {isRootPage ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-[#c7af48] min-w-[44px] min-h-[44px]"
            >
              <Menu className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-[#c7af48] min-w-[44px] min-h-[44px]"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#c7af48]" />
            <span className="font-bold text-white text-sm">האקדמיה של צעירים מתעשרים</span>
          </div>
          <div className="w-[44px]" />
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

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-56 bg-zinc-950 border-l border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">האקדמיה של צעירים מתעשרים</h1>
              <p className="text-xs text-gray-500">{isAdmin ? 'ניהול' : isConsultant ? 'יועץ' : 'לקוח'}</p>
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
      <main className="lg:mr-56 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}