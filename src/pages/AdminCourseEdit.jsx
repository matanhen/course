import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit,
  GripVertical,
  PlayCircle,
  Save,
  ChevronDown,
  ChevronUp,
  Video,
  BookOpen,
  X,
  FileText,
  Link2
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MobileSelect from '@/components/MobileSelect';

export default function AdminCourseEdit() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [newChapter, setNewChapter] = useState({ title: '' });
  const [newLesson, setNewLesson] = useState({ 
    title: '', 
    lesson_type: 'video',
    youtube_url: '', 
    external_url: '',
    duration: '' 
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    checkUser();
  }, []);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId
  });

  React.useEffect(() => {
    if (course && !editingCourse) {
      setEditingCourse(course);
    }
  }, [course, editingCourse]);

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

  // Course mutations
  const updateCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.update(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['course', courseId]);
    },
  });

  // Chapter mutations
  const addChapterMutation = useMutation({
    mutationFn: (data) => base44.entities.Chapter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chapters', courseId]);
      setShowChapterDialog(false);
      setNewChapter({ title: '' });
      setEditingChapter(null);
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chapter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chapters', courseId]);
      setShowChapterDialog(false);
      setNewChapter({ title: '' });
      setEditingChapter(null);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId) => {
      const chapterLessons = lessons.filter(l => l.chapter_id === chapterId);
      for (const lesson of chapterLessons) {
        await base44.entities.Lesson.delete(lesson.id);
      }
      await base44.entities.Chapter.delete(chapterId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chapters', courseId]);
      queryClient.invalidateQueries(['lessons', courseId]);
      setDeleteItem(null);
    },
  });

  // Lesson mutations
  const addLessonMutation = useMutation({
    mutationFn: (data) => base44.entities.Lesson.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons', courseId]);
      setShowLessonDialog(false);
      setNewLesson({ title: '', lesson_type: 'video', youtube_url: '', external_url: '', duration: '' });
      setEditingLesson(null);
      setSelectedChapterId(null);
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons', courseId]);
      setShowLessonDialog(false);
      setNewLesson({ title: '', lesson_type: 'video', youtube_url: '', external_url: '', duration: '' });
      setEditingLesson(null);
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => base44.entities.Lesson.delete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons', courseId]);
      setDeleteItem(null);
    },
  });

  if (!user || courseLoading || !editingCourse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  if (user.role !== 'admin') {
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

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  const getLessonsForChapter = (chapterId) => {
    return lessons
      .filter(l => l.chapter_id === chapterId)
      .sort((a, b) => a.order - b.order);
  };

  const handleSaveCourse = () => {
    if (editingCourse) {
      updateCourseMutation.mutate({
        title: editingCourse.title,
        description: editingCourse.description,
        thumbnail: editingCourse.thumbnail,
        is_published: editingCourse.is_published,
        external_button_url: editingCourse.external_button_url || '',
        external_button_text: editingCourse.external_button_text || '',
      });
    }
  };

  const handleAddChapter = (e) => {
    e.preventDefault();
    if (editingChapter) {
      updateChapterMutation.mutate({
        id: editingChapter.id,
        data: { title: newChapter.title }
      });
    } else {
      const maxOrder = chapters.length > 0 
        ? Math.max(...chapters.map(c => c.order)) 
        : 0;
      addChapterMutation.mutate({
        course_id: courseId,
        title: newChapter.title,
        order: maxOrder + 1,
      });
    }
  };

  const handleAddLesson = (e) => {
    e.preventDefault();
    if (editingLesson) {
      updateLessonMutation.mutate({
        id: editingLesson.id,
        data: {
          title: newLesson.title,
          lesson_type: newLesson.lesson_type,
          youtube_url: newLesson.lesson_type === 'video' ? newLesson.youtube_url : '',
          external_url: newLesson.lesson_type === 'external_link' ? newLesson.external_url : '',
          duration: newLesson.duration,
          chapter_id: selectedChapterId,
        }
      });
    } else {
      const chapterLessons = getLessonsForChapter(selectedChapterId);
      const maxOrder = chapterLessons.length > 0 
        ? Math.max(...chapterLessons.map(l => l.order)) 
        : 0;
      addLessonMutation.mutate({
        chapter_id: selectedChapterId,
        course_id: courseId,
        title: newLesson.title,
        lesson_type: newLesson.lesson_type,
        youtube_url: newLesson.lesson_type === 'video' ? newLesson.youtube_url : '',
        external_url: newLesson.lesson_type === 'external_link' ? newLesson.external_url : '',
        duration: newLesson.duration,
        order: maxOrder + 1,
      });
    }
  };

  const openEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setNewChapter({ title: chapter.title });
    setShowChapterDialog(true);
  };

  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setSelectedChapterId(lesson.chapter_id);
    setNewLesson({
      title: lesson.title,
      lesson_type: lesson.lesson_type || 'video',
      youtube_url: lesson.youtube_url || '',
      external_url: lesson.external_url || '',
      duration: lesson.duration || '',
    });
    setShowLessonDialog(true);
  };

  const openAddLesson = (chapterId) => {
    setSelectedChapterId(chapterId);
    setEditingLesson(null);
    setNewLesson({ title: '', lesson_type: 'video', youtube_url: '', external_url: '', duration: '' });
    setShowLessonDialog(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditingCourse({ ...editingCourse, thumbnail: file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChapterDragEnd = async (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(sortedChapters);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    
    // Update order for all chapters
    for (let i = 0; i < reordered.length; i++) {
      await base44.entities.Chapter.update(reordered[i].id, { order: i + 1 });
    }
    
    queryClient.invalidateQueries(['chapters', courseId]);
  };

  const handleLessonDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceChapterId = result.source.droppableId;
    const destChapterId = result.destination.droppableId;
    const sourceLessons = getLessonsForChapter(sourceChapterId);
    
    // Reorder within same chapter
    if (sourceChapterId === destChapterId) {
      const reordered = Array.from(sourceLessons);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      
      // Update order for all lessons in this chapter
      for (let i = 0; i < reordered.length; i++) {
        await base44.entities.Lesson.update(reordered[i].id, { order: i + 1 });
      }
    } else {
      // Move to different chapter
      const destLessons = getLessonsForChapter(destChapterId);
      const movedLesson = sourceLessons[result.source.index];
      
      // Update the moved lesson's chapter and order
      await base44.entities.Lesson.update(movedLesson.id, {
        chapter_id: destChapterId,
        order: result.destination.index + 1
      });
      
      // Reorder source chapter
      const newSourceLessons = sourceLessons.filter(l => l.id !== movedLesson.id);
      for (let i = 0; i < newSourceLessons.length; i++) {
        await base44.entities.Lesson.update(newSourceLessons[i].id, { order: i + 1 });
      }
      
      // Reorder destination chapter
      const newDestLessons = [...destLessons];
      newDestLessons.splice(result.destination.index, 0, movedLesson);
      for (let i = 0; i < newDestLessons.length; i++) {
        await base44.entities.Lesson.update(newDestLessons[i].id, { order: i + 1 });
      }
    }
    
    queryClient.invalidateQueries(['lessons', courseId]);
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to={createPageUrl('AdminCourses')}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px]">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">עריכת קורס</h1>
          <p className="text-muted-foreground">{course?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Details */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 border-border p-6 sticky top-6">
            <h2 className="text-lg font-bold text-foreground mb-6">פרטי הקורס</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">שם הקורס</Label>
                <Input
                  id="title"
                  value={editingCourse.title || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">תיאור</Label>
                <Textarea
                  id="description"
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="bg-secondary border-border text-foreground min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail" className="text-gray-300">תמונת קורס</Label>
                <div className="space-y-3">
                  {editingCourse.thumbnail && (
                    <div className="relative rounded-lg overflow-hidden aspect-video bg-secondary">
                      <img 
                        src={editingCourse.thumbnail} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCourse({ ...editingCourse, thumbnail: '' })}
                        className="absolute top-2 left-2 bg-background/50 hover:bg-background/70 text-foreground min-w-[44px] min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('thumbnail-upload').click()}
                    disabled={uploadingImage}
                    className="w-full border-border text-gray-300 hover:bg-secondary"
                  >
                    {uploadingImage ? 'מעלה...' : 'העלה תמונה'}
                  </Button>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Input
                    id="thumbnail"
                    value={editingCourse.thumbnail || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                    placeholder="או הזן קישור ישיר: https://..."
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-gray-300">פרסום</Label>
                <Switch
                  checked={editingCourse.is_published}
                  onCheckedChange={(checked) => setEditingCourse({ ...editingCourse, is_published: checked })}
                />
              </div>
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-gray-300">כפתור חיצוני - קישור</Label>
                  <Input
                    value={editingCourse.external_button_url || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, external_button_url: e.target.value })}
                    placeholder="https://... (ריק = ללא כפתור)"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">כפתור חיצוני - טקסט</Label>
                  <Input
                    value={editingCourse.external_button_text || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, external_button_text: e.target.value })}
                    placeholder="מערכת לניהול הכסף >>"
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <p className="text-muted-foreground text-xs">השאר את הקישור ריק כדי שלא יוצג כפתור בקורס.</p>
              </div>
              <Button
                onClick={handleSaveCourse}
                disabled={updateCourseMutation.isPending}
                className="w-full bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold mt-4"
              >
                <Save className="w-4 h-4 ml-2" />
                {updateCourseMutation.isPending ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Chapters & Lessons */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">פרקים ושיעורים</h2>
            <Button
              onClick={() => {
                setEditingChapter(null);
                setNewChapter({ title: '' });
                setShowChapterDialog(true);
              }}
              className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
            >
              <Plus className="w-4 h-4 ml-2" />
              פרק חדש
            </Button>
          </div>

          {sortedChapters.length === 0 ? (
            <Card className="bg-card/50 border-border p-10 text-center">
              <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">אין פרקים עדיין</p>
              <Button
                onClick={() => setShowChapterDialog(true)}
                className="bg-[#c7af48] hover:bg-[#b39d3d] text-black"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף פרק ראשון
              </Button>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleChapterDragEnd}>
              <Droppable droppableId="chapters-list">
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-4"
                  >
                    {sortedChapters.map((chapter, chapterIndex) => (
                      <Draggable
                        key={chapter.id}
                        draggableId={chapter.id}
                        index={chapterIndex}
                      >
                        {(provided, snapshot) => {
                          const chapterLessons = getLessonsForChapter(chapter.id);
                          
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: chapterIndex * 0.05 }}
                                className={snapshot.isDragging ? 'opacity-50' : ''}
                              >
                              <Card className="bg-card/50 border-border overflow-hidden">
                                {/* Chapter Header */}
                                <div className="p-4 flex items-center justify-between border-b border-border">
                                  <div className="flex items-center gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-5 h-5 text-muted-foreground hover:text-muted-foreground" />
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-[#c7af48]/10 flex items-center justify-center">
                                      <span className="text-[#c7af48] font-bold text-sm">
                                        {chapterIndex + 1}
                                      </span>
                                    </div>
                            <div>
                              <h3 className="text-foreground font-semibold">{chapter.title}</h3>
                              <p className="text-muted-foreground text-sm">{chapterLessons.length} שיעורים</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAddLesson(chapter.id)}
                              className="text-[#c7af48] hover:text-[#b39d3d] hover:bg-[#c7af48]/10"
                            >
                              <Plus className="w-4 h-4 ml-1" />
                              שיעור
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditChapter(chapter)}
                              className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItem({ type: 'chapter', item: chapter })}
                              className="text-muted-foreground hover:text-red-500 min-w-[44px] min-h-[44px]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                                {/* Lessons List */}
                                <DragDropContext onDragEnd={handleLessonDragEnd}>
                                  <Droppable droppableId={chapter.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`divide-y divide-zinc-800/50 ${
                                snapshot.isDraggingOver ? 'bg-secondary/30' : ''
                              }`}
                            >
                              {chapterLessons.length > 0 ? (
                                chapterLessons.map((lesson, lessonIndex) => (
                                  <Draggable
                                    key={lesson.id}
                                    draggableId={lesson.id}
                                    index={lessonIndex}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`p-4 pr-4 flex items-center justify-between hover:bg-secondary/30 transition-colors ${
                                          snapshot.isDragging ? 'bg-secondary shadow-lg' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-muted-foreground" />
                                          </div>
                                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                                            {lesson.lesson_type === 'external_link' ? (
                                              <FileText className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                              <PlayCircle className="w-4 h-4 text-muted-foreground" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-gray-300">{lesson.title}</p>
                                            <div className="flex items-center gap-2">
                                              {lesson.duration && (
                                                <p className="text-muted-foreground text-xs">{lesson.duration}</p>
                                              )}
                                              {lesson.lesson_type === 'external_link' && (
                                                <span className="text-[#c7af48] text-xs">קישור חיצוני</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditLesson(lesson)}
                                            className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px]"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteItem({ type: 'lesson', item: lesson })}
                                            className="text-muted-foreground hover:text-red-500 min-w-[44px] min-h-[44px]"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                  אין שיעורים בפרק זה
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                                  </Droppable>
                                </DragDropContext>
                              </Card>
                            </motion.div>
                          </div>
                        );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Chapter Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingChapter ? 'עריכת פרק' : 'פרק חדש'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddChapter} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="chapterTitle">שם הפרק</Label>
              <Input
                id="chapterTitle"
                required
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                placeholder="שם הפרק"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChapterDialog(false)}
                className="flex-1 border-border text-gray-300 hover:bg-secondary"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={addChapterMutation.isPending || updateChapterMutation.isPending}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
              >
                {editingChapter ? 'עדכן' : 'הוסף'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'עריכת שיעור' : 'שיעור חדש'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLesson} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">שם השיעור</Label>
              <Input
                id="lessonTitle"
                required
                value={newLesson.title}
                onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                placeholder="שם השיעור"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            {editingLesson && (
              <div className="space-y-2">
                <Label htmlFor="chapterSelect">פרק</Label>
                <MobileSelect
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  placeholder="בחר פרק"
                  title="בחר פרק"
                  triggerClassName="bg-secondary border-border text-foreground"
                  options={sortedChapters.map(ch => ({ value: ch.id, label: ch.title }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lessonType">סוג השיעור</Label>
              <MobileSelect
                value={newLesson.lesson_type}
                onValueChange={(value) => setNewLesson({ ...newLesson, lesson_type: value })}
                placeholder="בחר סוג שיעור"
                title="סוג השיעור"
                triggerClassName="bg-secondary border-border text-foreground"
                options={[
                  { value: 'video', label: 'וידאו YouTube' },
                  { value: 'external_link', label: 'קישור חיצוני (Docs, Sheets...)' },
                ]}
              />
            </div>
            
            {newLesson.lesson_type === 'video' ? (
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">קישור YouTube</Label>
                <div className="relative">
                  <Video className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="youtubeUrl"
                    required
                    value={newLesson.youtube_url}
                    onChange={(e) => setNewLesson({ ...newLesson, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-secondary border-border text-foreground pr-11"
                  />
                </div>
                <p className="text-muted-foreground text-xs">הזן קישור לסרטון YouTube</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="externalUrl">קישור חיצוני</Label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="externalUrl"
                    required
                    value={newLesson.external_url}
                    onChange={(e) => setNewLesson({ ...newLesson, external_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-secondary border-border text-foreground pr-11"
                  />
                </div>
                <p className="text-muted-foreground text-xs">הזן קישור לאתר, Google Docs, Sheets, Slides או כל קובץ אחר - יוצג בתוך המערכת</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="duration">משך (אופציונלי)</Label>
              <Input
                id="duration"
                value={newLesson.duration}
                onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                placeholder="לדוגמה: 15:30"
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLessonDialog(false)}
                className="flex-1 border-border text-gray-300 hover:bg-secondary"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={addLessonMutation.isPending || updateLessonMutation.isPending}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
              >
                {editingLesson ? 'עדכן' : 'הוסף'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              מחיקת {deleteItem?.type === 'chapter' ? 'פרק' : 'שיעור'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteItem?.type === 'chapter' 
                ? `האם אתה בטוח שברצונך למחוק את "${deleteItem?.item?.title}"? כל השיעורים בפרק זה יימחקו גם כן.`
                : `האם אתה בטוח שברצונך למחוק את "${deleteItem?.item?.title}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-zinc-700">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteItem?.type === 'chapter') {
                  deleteChapterMutation.mutate(deleteItem.item.id);
                } else {
                  deleteLessonMutation.mutate(deleteItem.item.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-foreground"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}