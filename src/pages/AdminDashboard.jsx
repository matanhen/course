import React, { useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  BookOpen, 
  Users, 
  PlayCircle, 
  TrendingUp,
  ArrowLeft,
  Plus,
  X,
  RefreshCw,
  Upload,
  Trash2
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const queryClient = useQueryClient();
  const { pullDistance, isRefreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });

  React.useEffect(() => {
    const checkUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.role !== 'admin') {
        const clientData = await base44.entities.AllowedClient.filter({ email: currentUser.email?.toLowerCase() });
        if (clientData.length > 0 && clientData[0].is_manager) setIsManager(true);
      }
    };
    checkUser();
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.AllowedClient.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => base44.entities.Chapter.list(),
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: () => base44.entities.SiteSetting.list(),
  });

  const logoPreview = siteSettings[0]?.logo_url || '';

  const onLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (siteSettings.length > 0) {
        await base44.entities.SiteSetting.update(siteSettings[0].id, { logo_url: file_url });
      } else {
        await base44.entities.SiteSetting.create({ logo_url: file_url });
      }
      await queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    } catch {}
    setUploadingLogo(false);
    e.target.value = '';
  };

  const onLogoDelete = async () => {
    if (siteSettings.length === 0) return;
    try {
      await base44.entities.SiteSetting.update(siteSettings[0].id, { logo_url: '' });
      await queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    } catch {}
  };

  const stats = [
    { 
      title: 'קורסים', 
      value: courses.length, 
      icon: BookOpen, 
      color: 'from-[#c9b14d] to-[#e5d07a]',
      link: 'AdminCourses'
    },
    { 
      title: 'לקוחות מורשים', 
      value: clients.length, 
      icon: Users, 
      color: 'from-purple-500 to-purple-600',
      link: 'AdminClients'
    },
    { 
      title: 'פרקים', 
      value: chapters.length, 
      icon: TrendingUp, 
      color: 'from-blue-500 to-blue-600',
      link: 'AdminCourses'
    },
    { 
      title: 'שיעורים', 
      value: lessons.length, 
      icon: PlayCircle, 
      color: 'from-green-500 to-green-600',
      link: 'AdminCourses'
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9b14d]"></div>
      </div>
    );
  }

  if (user.role !== 'admin' && !isManager) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">אין לך הרשאה</h1>
          <p className="text-muted-foreground mb-8">אין לך הרשאה לגשת לדף זה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: isRefreshing ? 48 : pullDistance, overflow: 'hidden' }}
        >
          <RefreshCw className={`w-5 h-5 text-[#c9b14d] ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl lg:text-4xl font-bold text-foreground mb-2"
        >
          לוח בקרה
        </motion.h1>
        <p className="text-muted-foreground">נהל את הקורסים והלקוחות שלך</p>
      </div>

      {user?.role === 'admin' && (
        <Card className="bg-card/50 border-border p-6 mb-10">
          <h2 className="text-lg font-bold text-foreground mb-1">לוגו האקדמיה</h2>
          <p className="text-muted-foreground text-sm mb-4">העלה לוגו שיופיע בסרגל העליון ובתפריט הצדדי בכל המכשירים, מיד ולתמיד עד למחיקה או החלפה.</p>
          <div className="flex items-center gap-4 flex-wrap">
            {logoPreview ? (
              <img src={logoPreview} alt="לוגו" className="h-16 w-auto max-w-[200px] object-contain border border-border rounded-lg p-2 bg-background" />
            ) : (
              <div className="h-16 w-32 flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-xs">אין לוגו</div>
            )}
            <div className="flex gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-[#c9b14d] hover:bg-[#a89436] text-black font-semibold rounded-md px-4 py-2 text-sm transition-colors">
                <Upload className="w-4 h-4" />
                {uploadingLogo ? 'מעלה...' : 'העלה לוגו'}
                <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={uploadingLogo} />
              </label>
              {logoPreview && (
                <Button onClick={onLogoDelete} variant="outline" className="border-border text-muted-foreground hover:bg-secondary">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק לוגו
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={createPageUrl(stat.link)} aria-label={`מעבר ל${stat.title}`}>
              <Card className="bg-card/50 border-border hover:border-[#c9b14d]/30 transition-all p-6 group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-foreground mb-1">{stat.value}</h3>
                <p className="text-muted-foreground group-hover:text-[#c9b14d] transition-colors">{stat.title}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-6">פעולות מהירות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isManager && (
            <Link to={createPageUrl('AdminCourses')} aria-label="הוסף קורס חדש">
              <Card className="bg-card/50 border-border hover:border-[#c9b14d]/50 p-6 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#c9b14d]/10 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-[#c9b14d]" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold group-hover:text-[#c9b14d] transition-colors">
                      הוסף קורס חדש
                    </h3>
                    <p className="text-muted-foreground text-sm">צור קורס חדש עם פרקים ושיעורים</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-muted-foreground mr-auto group-hover:text-[#c9b14d] group-hover:-translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          )}

          <Link to={createPageUrl('AdminClients')} aria-label="נהל לקוחות">
            <Card className="bg-card/50 border-border hover:border-[#c9b14d]/50 p-6 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold group-hover:text-[#c9b14d] transition-colors">
                    נהל לקוחות
                  </h3>
                  <p className="text-muted-foreground text-sm">הוסף או הסר לקוחות מורשים</p>
                </div>
                <ArrowLeft className="w-5 h-5 text-muted-foreground mr-auto group-hover:text-[#c9b14d] group-hover:-translate-x-1 transition-all" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Courses */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-6">קורסים אחרונים</h2>
        {courses.length === 0 ? (
          <Card className="bg-card/50 border-border p-10 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">אין קורסים עדיין</p>
            <Link to={createPageUrl('AdminCourses')} aria-label="צור קורס ראשון">
              <Button className="mt-4 bg-[#c9b14d] hover:bg-[#a89436] text-black">
                צור קורס ראשון
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => {
              const courseChapters = chapters.filter(c => c.course_id === course.id);
              const courseLessons = lessons.filter(l => l.course_id === course.id);
              
              return (
                <Link key={course.id} to={isManager ? '#' : createPageUrl(`AdminCourseEdit?id=${course.id}`)} aria-label={`עריכת קורס ${course.title}`}>
                  <Card className="bg-card/50 border-border hover:border-[#c9b14d]/30 transition-all overflow-hidden group">
                    <div className="aspect-video bg-secondary relative overflow-hidden">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-foreground font-semibold group-hover:text-[#c9b14d] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {courseChapters.length} פרקים • {courseLessons.length} שיעורים
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}