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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
      </div>
    );
  }

  if (user.role !== 'admin') {
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

  const handleDragEnd = async (result) => {
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
    <div className="min-h-screen bg-black p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to={createPageUrl('AdminCourses')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">עריכת קורס</h1>
          <p className="text-gray-500">{course?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Details */}
        <div className="lg:col-span-1">
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-white mb-6">פרטי הקורס</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">שם הקורס</Label>
                <Input
                  id="title"
                  value={editingCourse.title || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">תיאור</Label>
                <Textarea
                  id="description"
                  value={editingCourse.description || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail" className="text-gray-300">תמונת קורס</Label>
                <div className="space-y-3">
                  {editingCourse.thumbnail && (
                    <div className="relative rounded-lg overflow-hidden aspect-video bg-zinc-800">
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
                        className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white"
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
                    className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800"
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
                    className="bg-zinc-800 border-zinc-700 text-white"
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
            <h2 className="text-lg font-bold text-white">פרקים ושיעורים</h2>
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
            <Card className="bg-zinc-900/50 border-zinc-800 p-10 text-center">
              <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">אין פרקים עדיין</p>
              <Button
                onClick={() => setShowChapterDialog(true)}
                className="bg-[#c7af48] hover:bg-[#b39d3d] text-black"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף פרק ראשון
              </Button>
            </Card>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                {sortedChapters.map((chapter, chapterIndex) => {
                  const chapterLessons = getLessonsForChapter(chapter.id);

                  return (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: chapterIndex * 0.05 }}
                    >
                      <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                        {/* Chapter Header */}
                        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#c7af48]/10 flex items-center justify-center">
                              <span className="text-[#c7af48] font-bold text-sm">
                                {chapterIndex + 1}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{chapter.title}</h3>
                              <p className="text-gray-500 text-sm">{chapterLessons.length} שיעורים</p>
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
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItem({ type: 'chapter', item: chapter })}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Lessons List */}
                        <Droppable droppableId={chapter.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`divide-y divide-zinc-800/50 ${
                                snapshot.isDraggingOver ? 'bg-zinc-800/30' : ''
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
                                        className={`p-4 pr-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors ${
                                          snapshot.isDragging ? 'bg-zinc-800 shadow-lg' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="w-5 h-5 text-gray-600 hover:text-gray-400" />
                                          </div>
                                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                            {lesson.lesson_type === 'external_link' ? (
                                              <FileText className="w-4 h-4 text-gray-400" />
                                            ) : (
                                              <PlayCircle className="w-4 h-4 text-gray-400" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-gray-300">{lesson.title}</p>
                                            <div className="flex items-center gap-2">
                                              {lesson.duration && (
                                                <p className="text-gray-600 text-xs">{lesson.duration}</p>
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
                                            className="text-gray-500 hover:text-white"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteItem({ type: 'lesson', item: lesson })}
                                            className="text-gray-500 hover:text-red-500"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              ) : (
                                <div className="p-8 text-center text-gray-500">
                                  אין שיעורים בפרק זה
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Chapter Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
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
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChapterDialog(false)}
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
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
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
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
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            {editingLesson && (
              <div className="space-y-2">
                <Label htmlFor="chapterSelect">פרק</Label>
                <Select
                  value={selectedChapterId}
                  onValueChange={(value) => setSelectedChapterId(value)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="בחר פרק" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {sortedChapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id} className="text-white">
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lessonType">סוג השיעור</Label>
              <Select
                value={newLesson.lesson_type}
                onValueChange={(value) => setNewLesson({ ...newLesson, lesson_type: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="בחר סוג שיעור" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="video" className="text-white">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <span>וידאו YouTube</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="external_link" className="text-white">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>קישור חיצוני (Docs, Sheets...)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newLesson.lesson_type === 'video' ? (
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">קישור YouTube</Label>
                <div className="relative">
                  <Video className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="youtubeUrl"
                    required
                    value={newLesson.youtube_url}
                    onChange={(e) => setNewLesson({ ...newLesson, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-zinc-800 border-zinc-700 text-white pr-11"
                  />
                </div>
                <p className="text-gray-500 text-xs">הזן קישור לסרטון YouTube</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="externalUrl">קישור חיצוני</Label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="externalUrl"
                    required
                    value={newLesson.external_url}
                    onChange={(e) => setNewLesson({ ...newLesson, external_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-zinc-800 border-zinc-700 text-white pr-11"
                  />
                </div>
                <p className="text-gray-500 text-xs">הזן קישור לאתר, Google Docs, Sheets, Slides או כל קובץ אחר - יוצג בתוך המערכת</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="duration">משך (אופציונלי)</Label>
              <Input
                id="duration"
                value={newLesson.duration}
                onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                placeholder="לדוגמה: 15:30"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLessonDialog(false)}
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
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
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              מחיקת {deleteItem?.type === 'chapter' ? 'פרק' : 'שיעור'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {deleteItem?.type === 'chapter' 
                ? `האם אתה בטוח שברצונך למחוק את "${deleteItem?.item?.title}"? כל השיעורים בפרק זה יימחקו גם כן.`
                : `האם אתה בטוח שברצונך למחוק את "${deleteItem?.item?.title}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}