import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const courseId = useMemo(() => new URLSearchParams(window.location.search).get('id'), []);

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [courseContentOpen, setCourseContentOpen] = useState(false);

  const playerRef = useRef(null);
  const queryClient = useQueryClient();
  const progressUpdateInterval = useRef(null);
  const initialLessonSet = useRef(false);
  const updateProgressMutationRef = useRef(null);
  const progressRef = useRef([]);

  // Load user once
  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setUserLoading(false); })
      .catch(() => {
        setTimeout(() => {
          base44.auth.me()
            .then(u => { setUser(u); setUserLoading(false); })
            .catch(() => setUserLoading(false));
        }, 1500);
      });
  }, []);

  const isAdmin = user?.role === 'admin';
  const normalizedEmail = user?.email?.toLowerCase() ?? null;

  // Queries — all gated on user being loaded
  const { data: clientAccess = [], isLoading: clientAccessLoading } = useQuery({
    queryKey: ['clientAccess', normalizedEmail],
    queryFn: () => base44.entities.ClientCourseAccess.filter({ email: normalizedEmail }),
    enabled: !!normalizedEmail && !isAdmin,
    staleTime: 60_000,
  });

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.list().then(list => list.find(c => c.id === courseId) ?? null),
    enabled: !!courseId && !userLoading,
    staleTime: 60_000,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', courseId],
    queryFn: () => base44.entities.Chapter.filter({ course_id: courseId }),
    enabled: !!courseId && !userLoading,
    staleTime: 60_000,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: courseId }),
    enabled: !!courseId && !userLoading,
    staleTime: 60_000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['progress', normalizedEmail, courseId],
    queryFn: () => base44.entities.LessonProgress.filter({ user_email: normalizedEmail, course_id: courseId }),
    enabled: !!normalizedEmail && !!courseId && !isAdmin,
    staleTime: 30_000,
  });

  // Keep progress ref fresh
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Mutations
  const updateProgressMutation = useMutation({
    mutationFn: async ({ lessonId, progressPercent, completed }) => {
      if (!normalizedEmail) return;
      const existing = progressRef.current.find(p => p.lesson_id === lessonId);
      if (existing) {
        await base44.entities.LessonProgress.update(existing.id, {
          progress_percent: progressPercent,
          completed: completed !== undefined ? completed : existing.completed,
        });
      } else {
        await base44.entities.LessonProgress.create({
          user_email: normalizedEmail,
          lesson_id: lessonId,
          course_id: courseId,
          progress_percent: progressPercent,
          completed: completed ?? false,
        });
      }
    },
    onMutate: async ({ lessonId, progressPercent, completed }) => {
      await queryClient.cancelQueries(['progress', normalizedEmail, courseId]);
      const previous = queryClient.getQueryData(['progress', normalizedEmail, courseId]);
      queryClient.setQueryData(['progress', normalizedEmail, courseId], (old = []) => {
        const existing = old.find(p => p.lesson_id === lessonId);
        if (existing) {
          return old.map(p => p.lesson_id === lessonId
            ? { ...p, progress_percent: progressPercent, completed: completed !== undefined ? completed : p.completed }
            : p);
        }
        return [...old, { lesson_id: lessonId, course_id: courseId, user_email: normalizedEmail, progress_percent: progressPercent, completed: completed ?? false, id: `temp-${lessonId}` }];
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['progress', normalizedEmail, courseId], context.previous);
    },
    onSuccess: () => queryClient.invalidateQueries(['progress', normalizedEmail, courseId]),
  });
  updateProgressMutationRef.current = updateProgressMutation;

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId) => {
      if (!normalizedEmail) return;
      const existing = progressRef.current.find(p => p.lesson_id === lessonId);
      if (existing) {
        if (!existing.completed) {
          await base44.entities.LessonProgress.update(existing.id, { completed: true, progress_percent: 100 });
        }
      } else {
        await base44.entities.LessonProgress.create({
          user_email: normalizedEmail,
          lesson_id: lessonId,
          course_id: courseId,
          completed: true,
          progress_percent: 100,
        });
      }
    },
    onMutate: async (lessonId) => {
      await queryClient.cancelQueries(['progress', normalizedEmail, courseId]);
      const previous = queryClient.getQueryData(['progress', normalizedEmail, courseId]);
      queryClient.setQueryData(['progress', normalizedEmail, courseId], (old = []) => {
        const existing = old.find(p => p.lesson_id === lessonId);
        if (existing) {
          return old.map(p => p.lesson_id === lessonId ? { ...p, completed: true, progress_percent: 100 } : p);
        }
        return [...old, { lesson_id: lessonId, course_id: courseId, user_email: normalizedEmail, completed: true, progress_percent: 100, id: `temp-${lessonId}` }];
      });
      return { previous };
    },
    onError: (_err, _lessonId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['progress', normalizedEmail, courseId], context.previous);
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['progress', normalizedEmail, courseId]),
  });

  // Derived sorted data
  const sortedChapters = useMemo(() => [...chapters].sort((a, b) => a.order - b.order), [chapters]);

  const getLessonsForChapter = useCallback((chapterId) =>
    lessons.filter(l => l.chapter_id === chapterId).sort((a, b) => a.order - b.order),
    [lessons]);

  const allSortedLessons = useMemo(() =>
    sortedChapters.flatMap(ch => getLessonsForChapter(ch.id)),
    [sortedChapters, getLessonsForChapter]);

  const isLessonCompleted = useCallback((lessonId) =>
    progress.some(p => p.lesson_id === lessonId && p.completed),
    [progress]);

  // Set first lesson once when lessons are available
  useEffect(() => {
    if (allSortedLessons.length === 0) return;
    if (initialLessonSet.current) return;
    initialLessonSet.current = true;

    const firstIncomplete = allSortedLessons.find(
      l => !progressRef.current.some(p => p.lesson_id === l.id && p.completed)
    );
    const lessonToSelect = firstIncomplete || allSortedLessons[0];
    setCurrentLesson(lessonToSelect);
    setExpandedChapters({ [lessonToSelect.chapter_id]: true });
  }, [allSortedLessons]);

  // Reset when courseId changes (navigation between courses)
  const lastCourseIdRef = useRef(courseId);
  useEffect(() => {
    if (lastCourseIdRef.current !== courseId) {
      lastCourseIdRef.current = courseId;
      initialLessonSet.current = false;
      setCurrentLesson(null);
      setExpandedChapters({});
      setVideoProgress(0);
    }
  }, [courseId]);

  const getNextLesson = useCallback(() => {
    if (!currentLesson) return null;
    const idx = allSortedLessons.findIndex(l => l.id === currentLesson.id);
    return idx >= 0 && idx < allSortedLessons.length - 1 ? allSortedLessons[idx + 1] : null;
  }, [currentLesson, allSortedLessons]);

  const selectLesson = useCallback((lesson) => {
    setCurrentLesson(lesson);
    setVideoProgress(0);
    setExpandedChapters(prev => ({ ...prev, [lesson.chapter_id]: true }));

    if (lesson.lesson_type === 'external_link' && !isAdmin && normalizedEmail) {
      const lessonId = lesson.id;
      setTimeout(() => {
        updateProgressMutationRef.current?.mutate({ lessonId, progressPercent: 100, completed: true });
      }, 1000);
    }
  }, [isAdmin, normalizedEmail]);

  const handleLessonComplete = useCallback(() => {
    if (!currentLesson || isAdmin) return;
    markCompleteMutation.mutate(currentLesson.id);
    const nextLesson = getNextLesson();
    if (nextLesson) {
      setTimeout(() => {
        setCurrentLesson(nextLesson);
        setExpandedChapters(prev => ({ ...prev, [nextLesson.chapter_id]: true }));
      }, 1000);
    }
  }, [currentLesson, isAdmin, getNextLesson, markCompleteMutation]);

  // YouTube progress tracking
  useEffect(() => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }

    if (!currentLesson || currentLesson.lesson_type === 'external_link') return;
    if (!extractYouTubeId(currentLesson.youtube_url)) return;
    if (isAdmin || !normalizedEmail) return;

    const lessonId = currentLesson.id;
    let currentTime = 0;
    let duration = 0;
    let lastSavedPercent = -1;
    let isActive = true;

    const checkProgress = () => {
      const iframe = playerRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
          iframe.contentWindow.postMessage('{"event":"command","func":"getDuration","args":""}', '*');
        } catch {}
      }
    };

    const handleMessage = (event) => {
      if (!isActive || event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery') {
          if (data.info?.currentTime !== undefined) currentTime = data.info.currentTime;
          if (data.info?.duration !== undefined) duration = data.info.duration;
          if (duration > 0 && currentTime > 0) {
            const percent = Math.round((currentTime / duration) * 100);
            setVideoProgress(percent);
            if (Math.abs(percent - lastSavedPercent) >= 5) {
              lastSavedPercent = percent;
              updateProgressMutationRef.current?.mutate({ lessonId, progressPercent: percent, completed: currentTime >= 60 });
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    progressUpdateInterval.current = setInterval(checkProgress, 3000);

    return () => {
      isActive = false;
      window.removeEventListener('message', handleMessage);
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    };
  }, [currentLesson?.id, isAdmin, normalizedEmail]);

  // Helpers
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('docs.google.com/document')) {
      const id = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return id ? `https://docs.google.com/document/d/${id}/preview` : url;
    }
    if (url.includes('docs.google.com/spreadsheets')) {
      const id = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return id ? `https://docs.google.com/spreadsheets/d/${id}/preview` : url;
    }
    if (url.includes('docs.google.com/presentation')) {
      const id = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return id ? `https://docs.google.com/presentation/d/${id}/preview` : url;
    }
    if (url.includes('drive.google.com')) {
      const id = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || url.match(/id=([a-zA-Z0-9-_]+)/)?.[1];
      return id ? `https://drive.google.com/file/d/${id}/preview` : url;
    }
    return url;
  };

  // --- Loading / access guards ---
  const isLoading = userLoading || (!isAdmin && normalizedEmail && clientAccessLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  const hasAccess = isAdmin || clientAccess.some(a => a.course_id === courseId);

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

  const completedCount = progress.filter(p => p.completed).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = getNextLesson();

  return (
    <div className="min-h-screen bg-black" dir="rtl">
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
              {!isAdmin && (
                <p className="text-gray-500 text-sm">
                  {completedCount}/{totalCount} שיעורים הושלמו
                </p>
              )}
            </div>
          </div>
          {!isAdmin && totalCount > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#c7af48] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-[#c7af48] font-medium text-sm">{progressPercent}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Main content area */}
        <div className="flex-1 lg:mr-96">
          {/* Course content toggle button */}
          <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2">
            <button
              onClick={() => setCourseContentOpen(prev => !prev)}
              className="flex items-center gap-2 text-[#c7af48] hover:text-[#e5d07a] transition-colors font-medium text-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>תוכן הקורס</span>
              {courseContentOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <span className="text-gray-600 text-xs mr-2">{sortedChapters.length} פרקים • {lessons.length} שיעורים</span>
          </div>

          {/* Inline course content panel */}
          <AnimatePresence initial={false}>
            {courseContentOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden bg-zinc-950 border-b border-zinc-800"
              >
                <div className="divide-y divide-zinc-800 max-h-[60vh] overflow-y-auto">
                  {sortedChapters.map((chapter, chapterIndex) => {
                    const chapterLessons = getLessonsForChapter(chapter.id);
                    const chapterCompletedCount = chapterLessons.filter(l => isLessonCompleted(l.id)).length;
                    const isExpanded = !!expandedChapters[chapter.id];

                    return (
                      <div key={chapter.id}>
                        <button
                          onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                          className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[#c7af48]/10 flex items-center justify-center shrink-0">
                              <span className="text-[#c7af48] font-bold text-xs">{chapterIndex + 1}</span>
                            </div>
                            <div className="text-right">
                              <h4 className="text-white font-medium text-sm">{chapter.title}</h4>
                              <p className="text-gray-500 text-xs">{chapterCompletedCount}/{chapterLessons.length} הושלמו</p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden bg-zinc-900/30"
                            >
                              {chapterLessons.map((lesson, lessonIndex) => {
                                const isCompleted = isLessonCompleted(lesson.id);
                                const isCurrent = currentLesson?.id === lesson.id;

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => { selectLesson(lesson); setCourseContentOpen(false); }}
                                    className={`w-full p-3 pr-10 flex items-center gap-3 transition-all text-right ${
                                      isCurrent
                                        ? 'bg-[#c7af48]/10 border-r-2 border-[#c7af48]'
                                        : 'hover:bg-zinc-800/50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                      isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#c7af48]' : 'bg-zinc-800'
                                    }`}>
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      ) : lesson.lesson_type === 'external_link' ? (
                                        <FileText className="w-3 h-3 text-white" />
                                      ) : (
                                        <span className="text-xs text-white">{lessonIndex + 1}</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`${isCurrent ? 'text-[#c7af48]' : 'text-gray-300'} break-words text-sm`}>
                                        {lesson.title}
                                      </p>
                                      {lesson.duration && <p className="text-gray-600 text-xs">{lesson.duration}</p>}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video / Document player */}
          <div className={`relative bg-zinc-900 ${currentLesson?.lesson_type === 'external_link' ? 'min-h-[60vh]' : 'aspect-video'}`}>
            {!currentLesson ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#c7af48]"></div>
              </div>
            ) : currentLesson.lesson_type === 'external_link' ? (
              currentLesson.external_url ? (
                <iframe
                  key={currentLesson.id}
                  ref={playerRef}
                  src={getEmbedUrl(currentLesson.external_url)}
                  className="w-full border-0"
                  style={{ minHeight: '70vh' }}
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400">קישור לא זמין לשיעור זה</p>
                </div>
              )
            ) : (
              extractYouTubeId(currentLesson.youtube_url) ? (
                <iframe
                  key={currentLesson.id}
                  ref={playerRef}
                  src={`https://www.youtube.com/embed/${extractYouTubeId(currentLesson.youtube_url)}?enablejsapi=1&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400">סרטון לא זמין לשיעור זה</p>
                </div>
              )
            )}
          </div>

          {/* Lesson info */}
          {currentLesson && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">{currentLesson.title}</h2>
                  {currentLesson.duration && <p className="text-gray-500">משך: {currentLesson.duration}</p>}
                </div>
                {!isAdmin && (
                  <Button
                    onClick={handleLessonComplete}
                    disabled={isLessonCompleted(currentLesson.id)}
                    className={`shrink-0 ${isLessonCompleted(currentLesson.id) ? 'bg-green-600 hover:bg-green-600' : 'bg-[#c7af48] hover:bg-[#b39d3d]'} text-black font-semibold`}
                  >
                    {isLessonCompleted(currentLesson.id) ? (
                      <><CheckCircle2 className="w-4 h-4 ml-2" />הושלם</>
                    ) : 'סמן כנצפה'}
                  </Button>
                )}
              </div>

              {nextLesson && (
                <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <p className="text-gray-500 text-sm mb-2">השיעור הבא</p>
                  <button
                    onClick={() => selectLesson(nextLesson)}
                    className="flex items-center gap-3 text-white hover:text-[#c7af48] transition-colors"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span className="font-medium">{nextLesson.title}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:fixed lg:right-0 lg:top-[57px] lg:bottom-0 lg:w-96 bg-zinc-950 border-l border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
            <h3 className="font-bold text-white">תוכן הקורס</h3>
            <p className="text-gray-500 text-sm mt-1">
              {sortedChapters.length} פרקים • {lessons.length} שיעורים
            </p>
          </div>

          <div className="divide-y divide-zinc-800">
            {sortedChapters.map((chapter, chapterIndex) => {
              const chapterLessons = getLessonsForChapter(chapter.id);
              const chapterCompletedCount = chapterLessons.filter(l => isLessonCompleted(l.id)).length;
              const isExpanded = !!expandedChapters[chapter.id];

              return (
                <div key={chapter.id}>
                  <button
                    onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c7af48]/10 flex items-center justify-center">
                        <span className="text-[#c7af48] font-bold text-sm">{chapterIndex + 1}</span>
                      </div>
                      <div className="text-right">
                        <h4 className="text-white font-medium">{chapter.title}</h4>
                        <p className="text-gray-500 text-xs">{chapterCompletedCount}/{chapterLessons.length} הושלמו</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
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
                              className={`w-full p-4 pr-12 flex items-center gap-3 transition-all text-right ${
                                isCurrent
                                  ? 'bg-[#c7af48]/10 border-r-2 border-[#c7af48]'
                                  : 'hover:bg-zinc-800/50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isCompleted ? 'bg-green-500' : isCurrent ? 'bg-[#c7af48]' : 'bg-zinc-800'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : lesson.lesson_type === 'external_link' ? (
                                  <FileText className="w-3 h-3 text-white" />
                                ) : (
                                  <span className="text-xs text-white">{lessonIndex + 1}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`${isCurrent ? 'text-[#c7af48]' : 'text-gray-300'} break-words text-sm`}>
                                  {lesson.title}
                                </p>
                                {lesson.duration && <p className="text-gray-600 text-xs">{lesson.duration}</p>}
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