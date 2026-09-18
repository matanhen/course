import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  CheckCircle2, 
  Check,
  ChevronDown, 
  ChevronUp,
  ArrowLeft,
  Lock,
  BookOpen,
  FileText,
  ExternalLink,
  Maximize2,
  Minimize2,
  X
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
  const ytApiPlayerRef = useRef(null);
  const hostRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const seekBarRef = useRef(null);
  const seekingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fsMode, setFsMode] = useState(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const progressUpdateInterval = useRef(null);
  const initialLessonSet = useRef(false);
  const updateProgressMutationRef = useRef(null);
  const progressRef = useRef([]);
  const [logoUrl, setLogoUrl] = useState('');
  useEffect(() => {
    base44.entities.SiteSetting.list()
      .then(s => { if (s[0]?.logo_url) setLogoUrl(s[0].logo_url); })
      .catch(() => {});
  }, []);

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
  }, []);

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

  const togglePlayPause = useCallback(() => {
    const p = ytApiPlayerRef.current;
    if (!p || !window.YT) return;
    const state = p.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFsMode(prev => prev === 'pseudo' ? null : 'pseudo');
  }, []);

  // Pseudo-fullscreen: neutralize transformed ancestors (e.g. framer-motion's
  // page wrapper) so position:fixed on the wrapper is relative to the viewport,
  // then style it to cover the screen. No DOM move → the YouTube player stays
  // alive and the overlay keeps receiving clicks (fixes the mobile freeze).
  useEffect(() => {
    if (fsMode !== 'pseudo') return;
    const neutralized = [];
    let node = videoWrapperRef.current?.parentElement;
    while (node && node !== document.body) {
      const cs = window.getComputedStyle(node);
      if (cs.transform !== 'none' || cs.willChange === 'transform') {
        neutralized.push({ el: node, transform: node.style.transform, willChange: node.style.willChange });
        node.style.transform = 'none';
        node.style.willChange = 'auto';
      }
      node = node.parentElement;
    }
    return () => {
      neutralized.forEach(({ el, transform, willChange }) => {
        el.style.transform = transform;
        el.style.willChange = willChange;
      });
    };
  }, [fsMode]);

  // Exit pseudo-fullscreen on Escape
  useEffect(() => {
    if (fsMode !== 'pseudo') return;
    const onKey = (e) => { if (e.key === 'Escape') setFsMode(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fsMode]);

  useEffect(() => { setFsMode(null); setSpeedMenuOpen(false); }, [currentLesson?.id]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const seekToClientX = useCallback((clientX) => {
    const p = ytApiPlayerRef.current;
    const bar = seekBarRef.current;
    if (!p || !window.YT || !bar) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = p.getDuration();
    if (dur > 0) {
      p.seekTo(fraction * dur, true);
      setVideoProgress(Math.round(fraction * 100));
      setVideoTime(fraction * dur);
    }
  }, []);

  const onSeekPointerDown = useCallback((e) => {
    seekingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    seekToClientX(e.clientX);
  }, [seekToClientX]);

  const onSeekPointerMove = useCallback((e) => {
    if (seekingRef.current) seekToClientX(e.clientX);
  }, [seekToClientX]);

  const onSeekPointerUp = useCallback(() => {
    seekingRef.current = false;
  }, []);

  const changeRate = useCallback((rate) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    setSpeedMenuOpen(false);
    const p = ytApiPlayerRef.current;
    if (p && p.setPlaybackRate) p.setPlaybackRate(rate);
  }, []);

  // Mark the current lesson as watched as soon as the user opens it
  useEffect(() => {
    if (!currentLesson || isAdmin || !normalizedEmail) return;
    updateProgressMutationRef.current?.mutate({
      lessonId: currentLesson.id,
      progressPercent: 100,
      completed: true,
    });
  }, [currentLesson?.id, isAdmin, normalizedEmail]);

  // YouTube player — uses the official IFrame Player API inside a host div
  // (React never owns the iframe, avoiding reconciliation conflicts) to
  // reliably control playback, track progress, and detect when a video plays.
  useEffect(() => {
    if (!currentLesson || currentLesson.lesson_type === 'external_link') return;
    const videoId = extractYouTubeId(currentLesson.youtube_url);
    if (!videoId) return;

    let cancelled = false;
    let ytPlayer = null;
    let pollInterval = null;

    const createPlayer = () => {
      if (cancelled) return;
      const host = hostRef.current;
      if (!host || !window.YT || !window.YT.Player) return;
      host.innerHTML = '';
      const playerDiv = document.createElement('div');
      host.appendChild(playerDiv);
      ytPlayer = new window.YT.Player(playerDiv, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            try { ytPlayer.setPlaybackRate?.(playbackRateRef.current); } catch {}
            pollInterval = setInterval(() => {
              if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
              try {
                const cur = ytPlayer.getCurrentTime();
                const dur = ytPlayer.getDuration();
                setVideoTime(cur || 0);
                if (dur > 0) {
                  setVideoDuration(dur);
                  setVideoProgress(Math.min(100, Math.round((cur / dur) * 100)));
                }
              } catch {}
            }, 500);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setVideoProgress(100);
            }
          },
        },
      });
      ytApiPlayerRef.current = ytPlayer;
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        createPlayer();
      };
    }

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      ytApiPlayerRef.current = null;
      setIsPlaying(false);
      setVideoProgress(0);
      setVideoTime(0);
      setVideoDuration(0);
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch {}
      }
      if (hostRef.current) hostRef.current.innerHTML = '';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9b14d]"></div>
      </div>
    );
  }

  const hasAccess = isAdmin || clientAccess.some(a => a.course_id === courseId);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">אין לך גישה לקורס זה</h1>
          <p className="text-muted-foreground mb-8">קורס זה אינו זמין עבורך. פנה למנהל המערכת לקבלת גישה.</p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-[#c9b14d] hover:bg-[#a89436] text-black font-semibold">
              חזור לקורסים שלי
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9b14d]"></div>
      </div>
    );
  }

  const completedCount = progress.filter(p => p.completed).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = getNextLesson();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <style>{`
        :fullscreen, :-webkit-full-screen {
          width: 100% !important;
          height: 100% !important;
          background: #000;
        }
      `}</style>
      {/* Header */}
      <div className="hidden lg:flex sticky top-0 z-40 bg-[#105330] border-b border-white/10 lg:mr-96 px-6 py-3 items-center relative">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" size="icon" aria-label="חזרה" className="text-white hover:bg-white/10 min-w-[44px] min-h-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          {logoUrl ? (
            <img src={logoUrl} alt="לוגו האקדמיה" className="h-12 w-auto max-w-[240px] object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">האקדמיה לפיננסים</span>
          )}
        </div>
      </div>

      {course.external_button_url && (
        <div className="bg-sidebar border-b border-border px-4 py-2 lg:mr-96 flex justify-start">
          <a
            href={course.external_button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#c9b14d] hover:bg-[#a89436] text-black font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors w-full sm:w-auto sm:min-w-[260px]"
          >
            <ExternalLink className="w-4 h-4" />
            {course.external_button_text || 'מערכת לניהול הכסף >>'}
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Main content area */}
        <div className="flex-1 lg:mr-96">
          {/* Course content toggle button */}
          <div className="px-4 py-2 bg-sidebar border-b border-border flex items-center justify-center lg:justify-start gap-2">
            <button
              onClick={() => setCourseContentOpen(prev => !prev)}
              className="flex items-center gap-2 bg-[#105330] text-white hover:bg-[#0a3d20] px-3 py-1.5 min-h-[44px] rounded-lg transition-colors font-medium text-sm focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
            >
              <BookOpen className="w-4 h-4" />
              <span>תוכן הקורס</span>
              {courseContentOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <span className="hidden lg:inline text-muted-foreground text-xs mr-2">{sortedChapters.length} פרקים • {lessons.length} שיעורים</span>
          </div>

          {/* Inline course content panel */}
          <AnimatePresence initial={false}>
            {courseContentOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden bg-[#105330] border-b border-white/10"
              >
                <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto overscroll-auto">
                  {sortedChapters.map((chapter, chapterIndex) => {
                    const chapterLessons = getLessonsForChapter(chapter.id);
                    const chapterCompletedCount = chapterLessons.filter(l => isLessonCompleted(l.id)).length;
                    const isExpanded = !!expandedChapters[chapter.id];

                    return (
                      <div key={chapter.id}>
                        <button
                          onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                          className="w-full p-2 lg:p-4 min-h-[44px] flex items-center justify-between hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
                        >
                          <div className="flex items-center gap-2 lg:gap-3">
                            <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                              <span className="text-white font-bold text-xs">{chapterIndex + 1}</span>
                            </div>
                            <div className="text-right">
                              <h4 className="text-white font-bold text-sm">{chapter.title}</h4>
                              <p className="text-white/70 text-sm">{chapterCompletedCount}/{chapterLessons.length} הושלמו</p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white/70 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white/70 shrink-0" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden bg-transparent"
                            >
                              {chapterLessons.map((lesson, lessonIndex) => {
                                const isCompleted = isLessonCompleted(lesson.id);
                                const isCurrent = currentLesson?.id === lesson.id;

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => { selectLesson(lesson); setCourseContentOpen(false); }}
                                    className={`w-full p-3 pr-8 lg:p-3 lg:pr-10 min-h-[44px] flex items-center gap-2 lg:gap-3 transition-all text-right focus-visible:ring-2 focus-visible:ring-[#c9b14d] ${
                                      isCurrent
                                        ? 'bg-[#c9b14d]/15 border-r-2 border-[#c9b14d]'
                                        : 'hover:bg-white/10'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shrink-0 ${
                                      isCurrent ? 'bg-[#c9b14d]' : 'bg-white/15'
                                    }`}>
                                      {lesson.lesson_type === 'external_link' ? (
                                        <FileText className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                                      ) : (
                                        <span className="text-xs text-white">{lessonIndex + 1}</span>
                                      )}
                                    </div>
                                    {isCompleted && (
                                      <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                        <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#105330]" strokeWidth={3} />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`${isCurrent ? 'text-[#c9b14d] font-bold' : 'text-white'} break-words text-sm`}>
                                        {lesson.title}
                                      </p>
                                      {lesson.duration && <p className="text-white/60 text-xs">{lesson.duration}</p>}
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
          <div className={`relative bg-card ${currentLesson?.lesson_type === 'external_link' ? 'min-h-[60vh]' : 'aspect-video'}`}>
            {!currentLesson ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#c9b14d]"></div>
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
                  <p className="text-muted-foreground">קישור לא זמין לשיעור זה</p>
                </div>
              )
            ) : (
              extractYouTubeId(currentLesson.youtube_url) ? (
                <div ref={videoWrapperRef} className={`bg-background ${fsMode === 'pseudo' ? 'fixed inset-0 z-[9999]' : 'relative w-full h-full'}`}>
                  {/* YouTube player host — the IFrame API injects the iframe here */}
                  <div ref={hostRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:pointer-events-none" />
                  {fsMode === 'pseudo' && (
                    <button
                      type="button"
                      aria-label="יציאה ממסך מלא"
                      onClick={toggleFullscreen}
                      className="absolute top-4 left-4 z-40 w-11 h-11 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors"
                    >
                      <X className="w-6 h-6 text-foreground" />
                    </button>
                  )}
                  {/* App control overlay — blocks all direct interaction with the YouTube player */}
                  <div className="absolute inset-0 z-10">
                    {/* Center play/pause (exactly centered) */}
                    <div className="absolute inset-0 flex items-center justify-center" onClick={togglePlayPause}>
                      {!isPlaying && (
                        <button
                          type="button"
                          aria-label={isPlaying ? "השהה" : "נגן"}
                          className="w-16 h-16 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors"
                          onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                        >
                          <PlayCircle className="w-10 h-10 text-foreground" />
                        </button>
                      )}
                    </div>
                    {/* Bottom controls: seek bar, speed, fullscreen */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent" dir="ltr">
                      <span className="text-white font-bold text-xs tabular-nums w-10 text-right shrink-0">{formatTime(videoTime)}</span>
                      <div
                        ref={seekBarRef}
                        tabIndex={0}
                        className="flex-1 h-2 bg-secondary rounded-full cursor-pointer relative touch-none focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
                        onPointerDown={onSeekPointerDown}
                        onPointerMove={onSeekPointerMove}
                        onPointerUp={onSeekPointerUp}
                      >
                        <div className="absolute inset-y-0 left-0 bg-[#105330] rounded-full" style={{ width: `${videoProgress}%` }} />
                      </div>
                      <span className="text-white font-bold text-xs tabular-nums w-10 shrink-0">{formatTime(videoDuration)}</span>
                      <div className="relative shrink-0">
                        {speedMenuOpen && <div className="fixed inset-0 z-20" onClick={() => setSpeedMenuOpen(false)} />}
                        <button
                          type="button"
                          onClick={() => setSpeedMenuOpen(o => !o)}
                          aria-label="מהירות נגינה"
                          className="h-11 min-w-[44px] px-2 rounded-lg bg-background/50 backdrop-blur-sm flex items-center justify-center hover:bg-background/70 transition-colors text-foreground text-xs font-medium focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
                        >
                          {playbackRate}x
                        </button>
                        {speedMenuOpen && (
                          <div className="absolute bottom-10 right-0 z-30 bg-card rounded-lg overflow-hidden border border-border shadow-xl min-w-[64px]">
                            {[1, 1.25, 1.5, 1.75, 2].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => changeRate(r)}
                                className={`block w-full px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-center ${r === playbackRate ? 'bg-[#c9b14d]/20 text-[#c9b14d]' : ''}`}
                              >
                                {r}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={fsMode ? "צא ממסך מלא" : "מסך מלא"}
                        onClick={toggleFullscreen}
                        className="w-11 h-11 rounded-lg bg-background/50 backdrop-blur-sm flex items-center justify-center hover:bg-background/70 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
                      >
                        {fsMode ? <Minimize2 className="w-5 h-5 text-foreground" /> : <Maximize2 className="w-5 h-5 text-foreground" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">סרטון לא זמין לשיעור זה</p>
                </div>
              )
            )}
          </div>

          {/* Lesson info */}
          {currentLesson && (
            <div className="p-3 lg:p-6 border-b border-border">
              <div className="p-2.5 lg:p-4 bg-[#f3ead4] rounded-xl border border-black/10 mb-2 lg:mb-3">
                <p className="text-black text-xs lg:text-sm mb-1">השיעור הנוכחי</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm lg:text-xl font-bold text-black mb-0.5 truncate">{currentLesson.title}</h2>
                    {currentLesson.duration && <p className="text-black/60 text-xs">משך: {currentLesson.duration}</p>}
                  </div>
                  {!isAdmin && (
                    <Button
                      onClick={handleLessonComplete}
                      disabled={isLessonCompleted(currentLesson.id)}
                      size="sm"
                      className={`shrink-0 ${isLessonCompleted(currentLesson.id) ? 'bg-green-600 hover:bg-green-600' : 'bg-[#c9b14d] hover:bg-[#a89436]'} text-black font-semibold`}
                    >
                      {isLessonCompleted(currentLesson.id) ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 ml-1" />הושלם</>
                      ) : 'סמן כנצפה'}
                    </Button>
                  )}
                </div>
              </div>

              {nextLesson && (
                <div className="mt-2 lg:mt-3 p-2.5 lg:p-4 bg-[#f3ead4] rounded-xl border border-black/10">
                  <p className="text-black text-xs lg:text-sm mb-1">השיעור הבא</p>
                  <button
                    onClick={() => selectLesson(nextLesson)}
                    className="w-full flex items-center gap-2 bg-[#105330] hover:bg-[#0a3d20] text-white font-bold rounded-lg px-3 py-2 text-sm transition-colors"
                  >
                    <PlayCircle className="w-4 h-4 shrink-0" />
                    <span className="text-right flex-1 truncate">{nextLesson.title}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:w-96 bg-[#105330] border-l border-white/10 overflow-y-auto overscroll-behavior-none">
          <div className="p-4 border-b border-white/10 sticky top-0 bg-[#105330] z-10">
            <h3 className="font-bold text-white">תוכן הקורס</h3>
            <p className="text-white/70 text-sm mt-1">
              {sortedChapters.length} פרקים • {lessons.length} שיעורים
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {sortedChapters.map((chapter, chapterIndex) => {
              const chapterLessons = getLessonsForChapter(chapter.id);
              const chapterCompletedCount = chapterLessons.filter(l => isLessonCompleted(l.id)).length;
              const isExpanded = !!expandedChapters[chapter.id];

              return (
                <div key={chapter.id}>
                  <button
                    onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                    className="w-full p-2 lg:p-4 min-h-[44px] flex items-center justify-between hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#c9b14d]"
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg bg-white/15 flex items-center justify-center">
                        <span className="text-white font-bold text-xs lg:text-sm">{chapterIndex + 1}</span>
                      </div>
                      <div className="text-right">
                        <h4 className="text-white font-bold text-sm lg:text-base">{chapter.title}</h4>
                        <p className="text-white/70 text-sm">{chapterCompletedCount}/{chapterLessons.length} הושלמו</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 lg:w-5 lg:h-5 text-white/70" /> : <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 text-white/70" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-transparent"
                      >
                        {chapterLessons.map((lesson, lessonIndex) => {
                          const isCompleted = isLessonCompleted(lesson.id);
                          const isCurrent = currentLesson?.id === lesson.id;

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson)}
                              className={`w-full p-3 pr-8 lg:p-4 lg:pr-12 min-h-[44px] flex items-center gap-2 lg:gap-3 transition-all text-right focus-visible:ring-2 focus-visible:ring-[#c9b14d] ${
                                isCurrent
                                  ? 'bg-[#c9b14d]/15 border-r-2 border-[#c9b14d]'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center shrink-0 ${
                                isCurrent ? 'bg-[#c9b14d]' : 'bg-white/15'
                              }`}>
                                {lesson.lesson_type === 'external_link' ? (
                                  <FileText className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                                ) : (
                                  <span className="text-xs text-white">{lessonIndex + 1}</span>
                                )}
                              </div>
                              {isCompleted && (
                                <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#105330]" strokeWidth={3} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`${isCurrent ? 'text-[#c9b14d] font-bold' : 'text-white'} break-words text-sm`}>
                                  {lesson.title}
                                </p>
                                {lesson.duration && <p className="text-white/60 text-xs">{lesson.duration}</p>}
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