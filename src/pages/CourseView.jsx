import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  ArrowLeft,
  Lock,
  BookOpen,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function CourseView() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const playerRef = useRef(null);
  const queryClient = useQueryClient();

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

  const hasAccess = clientAccess.some(access => access.course_id === courseId);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId && hasAccess,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', courseId],
    queryFn: () => base44.entities.Chapter.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['progress', user?.email, courseId],
    queryFn: () => base44.entities.LessonProgress.filter({ 
      user_email: user?.email,
      course_id: courseId 
    }),
    enabled: !!user?.email && !!courseId,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId) => {
      const existingProgress = progress.find(p => p.lesson_id === lessonId);
      if (existingProgress) {
        if (!existingProgress.completed) {
          await base44.entities.LessonProgress.update(existingProgress.id, { completed: true });
        }
      } else {
        await base44.entities.LessonProgress.create({
          user_email: user?.email,
          lesson_id: lessonId,
          course_id: courseId,
          completed: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['progress', user?.email, courseId]);
    },
  });

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  
  const getLessonsForChapter = (chapterId) => {
    return lessons
      .filter(l => l.chapter_id === chapterId)
      .sort((a, b) => a.order - b.order);
  };

  const allSortedLessons = sortedChapters.flatMap(ch => getLessonsForChapter(ch.id));

  const isLessonCompleted = (lessonId) => {
    return progress.some(p => p.lesson_id === lessonId && p.completed);
  };

  // Set first lesson as default
  useEffect(() => {
    if (allSortedLessons.length > 0 && !currentLesson) {
      // Find first incomplete lesson or first lesson
      const firstIncomplete = allSortedLessons.find(l => !isLessonCompleted(l.id));
      setCurrentLesson(firstIncomplete || allSortedLessons[0]);
      
      // Expand the chapter containing the current lesson
      const lessonToSelect = firstIncomplete || allSortedLessons[0];
      setExpandedChapters(prev => ({
        ...prev,
        [lessonToSelect.chapter_id]: true,
      }));
    }
  }, [allSortedLessons, currentLesson, progress]);

  const getNextLesson = useCallback(() => {
    if (!currentLesson) return null;
    const currentIndex = allSortedLessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex < allSortedLessons.length - 1) {
      return allSortedLessons[currentIndex + 1];
    }
    return null;
  }, [currentLesson, allSortedLessons]);

  const handleLessonComplete = useCallback(() => {
    if (currentLesson) {
      markCompleteMutation.mutate(currentLesson.id);
      
      // Auto-advance to next lesson
      const nextLesson = getNextLesson();
      if (nextLesson) {
        setTimeout(() => {
          setCurrentLesson(nextLesson);
          setExpandedChapters(prev => ({
            ...prev,
            [nextLesson.chapter_id]: true,
          }));
        }, 1500);
      }
    }
  }, [currentLesson, getNextLesson, markCompleteMutation]);

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // Google Docs
    if (url.includes('docs.google.com/document')) {
      const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return docId ? `https://docs.google.com/document/d/${docId}/preview` : url;
    }
    
    // Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
      const sheetId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview` : url;
    }
    
    // Google Slides
    if (url.includes('docs.google.com/presentation')) {
      const slideId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return slideId ? `https://docs.google.com/presentation/d/${slideId}/preview` : url;
    }
    
    // Google Drive general
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || url.match(/id=([a-zA-Z0-9-_]+)/)?.[1];
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
    }
    
    return url;
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const selectLesson = (lesson) => {
    setCurrentLesson(lesson);
    setExpandedChapters(prev => ({
      ...prev,
      [lesson.chapter_id]: true,
    }));
  };

  const completedCount = progress.filter(p => p.completed).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!user || clientAccess.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">אין לך גישה לקורס זה</h1>
          <p className="text-gray-400 mb-8">קורס זה אינו זמין עבורך. פנה למנהל המערכת לקבלת גישה.</p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold">
              חזור לקורסים שלי
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-effect border-b border-zinc-800 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-white font-bold truncate max-w-[200px] lg:max-w-none">
                {course.title}
              </h1>
              <p className="text-gray-500 text-sm">
                {completedCount}/{totalCount} שיעורים הושלמו
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#c7af48] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[#c7af48] font-medium text-sm">{progressPercent}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Video Player / Document Viewer */}
        <div className="flex-1 lg:ml-80">
          <div className={`relative bg-zinc-900 ${currentLesson?.lesson_type === 'external_link' ? 'min-h-screen' : 'aspect-video'}`}>
            {currentLesson ? (
              currentLesson.lesson_type === 'external_link' ? (
                <div className="w-full h-full overflow-auto">
                  <iframe
                    ref={playerRef}
                    src={getEmbedUrl(currentLesson.external_url)}
                    className="w-full min-h-screen border-0"
                    style={{ minHeight: '100vh' }}
                    allowFullScreen
                  />
                </div>
              ) : (
                <iframe
                  ref={playerRef}
                  src={`https://www.youtube.com/embed/${extractYouTubeId(currentLesson.youtube_url)}?rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-zinc-700" />
              </div>
            )}
          </div>

          {/* Lesson Info */}
          {currentLesson && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
                    {currentLesson.title}
                  </h2>
                  {currentLesson.duration && (
                    <p className="text-gray-500">משך: {currentLesson.duration}</p>
                  )}
                </div>
                <Button
                  onClick={handleLessonComplete}
                  disabled={isLessonCompleted(currentLesson.id)}
                  className={`shrink-0 ${
                    isLessonCompleted(currentLesson.id)
                      ? 'bg-green-600 hover:bg-green-600'
                      : 'bg-[#c7af48] hover:bg-[#b39d3d]'
                  } text-black font-semibold`}
                >
                  {isLessonCompleted(currentLesson.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      הושלם
                    </>
                  ) : (
                    'סמן כנצפה'
                  )}
                </Button>
              </div>

              {/* Next Lesson Preview */}
              {getNextLesson() && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
                >
                  <p className="text-gray-500 text-sm mb-2">השיעור הבא</p>
                  <button
                    onClick={() => selectLesson(getNextLesson())}
                    className="flex items-center gap-3 text-white hover:text-[#c7af48] transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span className="font-medium">{getNextLesson().title}</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Course Content */}
        <aside className="lg:fixed lg:left-0 lg:top-[57px] lg:bottom-0 lg:w-80 bg-zinc-950 border-r border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
            <h3 className="font-bold text-white">תוכן הקורס</h3>
            <p className="text-gray-500 text-sm mt-1">
              {sortedChapters.length} פרקים • {lessons.length} שיעורים
            </p>
          </div>

          <div className="divide-y divide-zinc-800">
            {sortedChapters.map((chapter, chapterIndex) => {
              const chapterLessons = getLessonsForChapter(chapter.id);
              const chapterCompletedCount = chapterLessons.filter(l => 
                isLessonCompleted(l.id)
              ).length;
              const isExpanded = expandedChapters[chapter.id];

              return (
                <div key={chapter.id}>
                  {/* Chapter Header */}
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c7af48]/10 flex items-center justify-center">
                        <span className="text-[#c7af48] font-bold text-sm">
                          {chapterIndex + 1}
                        </span>
                      </div>
                      <div className="text-right">
                        <h4 className="text-white font-medium">{chapter.title}</h4>
                        <p className="text-gray-500 text-xs">
                          {chapterCompletedCount}/{chapterLessons.length} הושלמו
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {/* Chapter Lessons */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-zinc-900/30"
                      >
                        {chapterLessons.map((lesson, lessonIndex) => {
                          const isCompleted = isLessonCompleted(lesson.id);
                          const isCurrent = currentLesson?.id === lesson.id;

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson)}
                              className={`w-full p-4 pr-12 flex items-center gap-3 transition-all ${
                                isCurrent 
                                  ? 'bg-[#c7af48]/10 border-r-2 border-[#c7af48]'
                                  : 'hover:bg-zinc-800/50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isCompleted 
                                  ? 'bg-green-500'
                                  : isCurrent
                                    ? 'bg-[#c7af48]'
                                    : 'bg-zinc-800'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : lesson.lesson_type === 'external_link' ? (
                                  <FileText className="w-3 h-3 text-white" />
                                ) : (
                                  <span className="text-xs text-white">{lessonIndex + 1}</span>
                                )}
                              </div>
                              <div className="text-right flex-1 min-w-0">
                                <p className={`truncate ${
                                  isCurrent ? 'text-[#c7af48]' : 'text-gray-300'
                                }`}>
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  {lesson.duration && (
                                    <p className="text-gray-600 text-xs">{lesson.duration}</p>
                                  )}
                                  {lesson.lesson_type === 'external_link' && (
                                    <span className="text-[#c7af48] text-xs">קישור חיצוני</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}