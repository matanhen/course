import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
  X
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isManager, setIsManager] = useState(false);

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

  const stats = [
    { 
      title: 'קורסים', 
      value: courses.length, 
      icon: BookOpen, 
      color: 'from-[#c7af48] to-[#e5d07a]',
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  if (user.role !== 'admin' && !isManager) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">אין לך הרשאה</h1>
          <p className="text-gray-400 mb-8">אין לך הרשאה לגשת לדף זה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 lg:p-10">
      {/* Header */}
      <div className="mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl lg:text-4xl font-bold text-white mb-2"
        >
          לוח בקרה
        </motion.h1>
        <p className="text-gray-400">נהל את הקורסים והלקוחות שלך</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={createPageUrl(stat.link)}>
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#c7af48]/30 transition-all p-6 group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-gray-400 group-hover:text-[#c7af48] transition-colors">{stat.title}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-6">פעולות מהירות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isManager && (
            <Link to={createPageUrl('AdminCourses')}>
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#c7af48]/50 p-6 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#c7af48]/10 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-[#c7af48]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold group-hover:text-[#c7af48] transition-colors">
                      הוסף קורס חדש
                    </h3>
                    <p className="text-gray-500 text-sm">צור קורס חדש עם פרקים ושיעורים</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-600 mr-auto group-hover:text-[#c7af48] group-hover:-translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          )}

          <Link to={createPageUrl('AdminClients')}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#c7af48]/50 p-6 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold group-hover:text-[#c7af48] transition-colors">
                    נהל לקוחות
                  </h3>
                  <p className="text-gray-500 text-sm">הוסף או הסר לקוחות מורשים</p>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-600 mr-auto group-hover:text-[#c7af48] group-hover:-translate-x-1 transition-all" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Courses */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">קורסים אחרונים</h2>
        {courses.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-10 text-center">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">אין קורסים עדיין</p>
            <Link to={createPageUrl('AdminCourses')}>
              <Button className="mt-4 bg-[#c7af48] hover:bg-[#b39d3d] text-black">
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
                <Link key={course.id} to={isManager ? '#' : createPageUrl(`AdminCourseEdit?id=${course.id}`)}>
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#c7af48]/30 transition-all overflow-hidden group">
                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-semibold group-hover:text-[#c7af48] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
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