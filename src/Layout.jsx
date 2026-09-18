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
  const [isManager, setIsManager] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  const [clientName, setClientName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Root pages (tabs) — no back button on these
  // Root tab pages — keep in sync with the tab paths defined in MobileBottomNav.jsx
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
          setIsManager(isManagerUser);
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
            
            const nowIso = new Date().toISOString();
            if (!client.first_login_date) {
              base44.entities.AllowedClient.update(client.id, {
                first_login_date: nowIso,
                last_login_date: nowIso
              }).catch(() => {});
            } else {
              base44.entities.AllowedClient.update(client.id, {
                last_login_date: nowIso
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

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await base44.entities.SiteSetting.list();
        if (settings.length > 0 && settings[0].logo_url) setLogoUrl(settings[0].logo_url);
      } catch {}
    };
    loadLogo();
    const unsubscribe = base44.entities.SiteSetting.subscribe((event) => {
      if (event.type === 'delete') {
        setLogoUrl('');
      } else {
        setLogoUrl(event.data?.logo_url || '');
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isAllowed === null || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9b14d]"></div>
      </div>
    );
  }

  if (!isAllowed && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">אין לך הרשאה</h1>
          <p className="text-muted-foreground mb-8">אין לך הרשאה לגשת למערכת הקורסים. פנה למנהל המערכת.</p>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-border text-muted-foreground hover:bg-secondary"
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

  const managerLinks = [
    { name: 'צפייה בקורסים', page: 'Home', icon: GraduationCap },
    { name: 'ניהול לקוחות', page: 'AdminClients', icon: Users },
  ];

  const userLinks = [
    { name: 'הקורסים שלי', page: 'Home', icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : isManager ? managerLinks : isConsultant ? consultantLinks : userLinks;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        :root {
          --gold: #c9b14d;
          --gold-dark: #a89436;
        }
        
        .gold-gradient {
          background: linear-gradient(135deg, #c9b14d 0%, #e5d07a 50%, #c9b14d 100%);
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(201, 177, 77, 0.25);
        }
        

      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#105330]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          {isRootPage ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
            >
              <Menu className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
            >
              <ArrowRight className="w-6 h-6" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="לוגו האקדמיה" className="h-11 w-auto max-w-[210px] object-contain" />
            ) : (
              <>
                <GraduationCap className="w-7 h-7 text-[#c9b14d]" />
                <span className="font-bold text-white text-sm">האקדמיה של צעירים מתעשרים</span>
              </>
            )}
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
              className="fixed inset-0 bg-background/80 z-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[#105330] z-50 lg:hidden border-l border-white/10"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="לוגו האקדמיה" className="h-12 w-auto max-w-[220px] object-contain" />
                  ) : (
                    <>
                      <GraduationCap className="w-7 h-7 text-[#c9b14d]" />
                      <span className="font-bold text-white">האקדמיה של צעירים מתעשרים</span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
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
                        ? 'bg-[#c9b14d]/15 text-[#c9b14d] font-bold'
                        : 'text-white font-bold hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-bold">{link.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                    <span className="text-black font-bold">
                      {user?.full_name?.[0] || user?.email?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{clientName || user?.full_name || user?.email?.split('@')[0] || 'משתמש'}</p>
                    <p className="text-white/70 text-sm truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-white/80 hover:text-red-300 hover:bg-red-500/15"
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
      <aside className={`hidden ${currentPageName !== 'CourseView' ? 'lg:flex' : ''} flex-col fixed top-0 right-0 bottom-0 w-56 bg-[#105330] border-l border-white/10`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="p-6 border-b border-white/10">
          {currentPageName !== 'CourseView' ? (
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="לוגו האקדמיה" className="h-12 w-auto max-w-[160px] object-contain" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h1 className="font-bold text-white text-sm">האקדמיה של צעירים מתעשרים</h1>
                    <p className="text-xs text-white/70">{isAdmin ? 'ניהול' : isManager ? 'מנהל' : isConsultant ? 'יועץ' : 'לקוח'}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.page}
              to={createPageUrl(link.page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentPageName === link.page
                  ? 'bg-[#c9b14d]/15 text-[#c9b14d] border border-[#c9b14d]/30 font-bold'
                  : 'text-white font-bold hover:text-white hover:bg-white/10'
              }`}
            >
              <link.icon className="w-5 h-5" />
              <span className="font-bold">{link.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <span className="text-black font-bold">
                {user?.full_name?.[0] || user?.email?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">{clientName || user?.full_name || user?.email?.split('@')[0] || 'משתמש'}</p>
              <p className="text-white/70 text-sm truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-white/80 hover:text-red-300 hover:bg-red-500/15"
          >
            <LogOut className="w-5 h-5 ml-2" />
            התנתק
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`${currentPageName !== 'CourseView' ? 'lg:mr-56' : ''} pt-16 lg:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 min-h-screen`}>
        {children}
      </main>
    </div>
  );
}