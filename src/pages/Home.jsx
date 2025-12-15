import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    getUser();
  }, []);

  const { data: clientAccess = [] } = useQuery({
    queryKey: ['clientAccess', user?.email],
    queryFn: () => base44.entities.ClientCourseAccess.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: allCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_published: true }),
  });

  const courses = allCourses.filter(course => 
    clientAccess.some(access => access.course_id === course.id)
  );

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['progress', user?.email],
    queryFn: () => base44.entities.LessonProgress.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const getCourseProgress = (courseId) => {
    const courseLessons = lessons.filter(l => l.course_id === courseId);
    const completedLessons = progress.filter(
      p => p.course_id === courseId && p.completed
    );
    if (courseLessons.length === 0) return 0;
    return Math.round((completedLessons.length / courseLessons.length) * 100);
  };

  const getCourseLessonsCount = (courseId) => {
    return lessons.filter(l => l.course_id === courseId).length;
  };

  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
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
          שלום, {user?.full_name || user?.email?.split('@')[0] || 'משתמש'}
        </motion.h1>
        <p className="text-gray-400">בחר קורס והתחל ללמוד</p>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl text-gray-400">אין קורסים זמינים כרגע</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course, index) => {
            const progressPercent = getCourseProgress(course.id);
            const lessonsCount = getCourseLessonsCount(course.id);
            
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={createPageUrl(`CourseView?id=${course.id}`)}>
                  <Card className="group bg-zinc-900/50 border-zinc-800 hover:border-[#c7af48]/50 transition-all duration-300 overflow-hidden">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-[#c7af48] flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                          <PlayCircle className="w-8 h-8 text-black" />
                        </div>
                      </div>

                      {/* Progress Badge */}
                      {progressPercent > 0 && (
                        <div className="absolute top-3 left-3">
                          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
                            {progressPercent === 100 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-[#c7af48]" />
                            )}
                            <span className="text-white text-sm font-medium">{progressPercent}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#c7af48] transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                          {course.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {lessonsCount} שיעורים
                        </span>
                        {progressPercent > 0 && (
                          <span className="text-[#c7af48]">
                            {progressPercent === 100 ? 'הושלם' : 'בתהליך'}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {progressPercent > 0 && (
                        <div className="mt-4">
                          <Progress 
                            value={progressPercent} 
                            className="h-1.5 bg-zinc-800"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}