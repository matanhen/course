import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search,
  Edit,
  MoreVertical,
  Eye,
  EyeOff,
  X,
  Copy
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminCourses() {
  const [user, setUser] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCourse, setNewCourse] = useState({ 
    title: '', 
    description: '', 
    thumbnail: '',
    is_published: true 
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const queryClient = useQueryClient();

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

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => base44.entities.Chapter.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const addCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      setShowAddDialog(false);
      setNewCourse({ title: '', description: '', thumbnail: '', is_published: true });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId) => {
      // Delete all lessons and chapters for this course
      const courseChapters = chapters.filter(c => c.course_id === courseId);
      const courseLessons = lessons.filter(l => l.course_id === courseId);
      
      for (const lesson of courseLessons) {
        await base44.entities.Lesson.delete(lesson.id);
      }
      for (const chapter of courseChapters) {
        await base44.entities.Chapter.delete(chapter.id);
      }
      await base44.entities.Course.delete(courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      queryClient.invalidateQueries(['chapters']);
      queryClient.invalidateQueries(['lessons']);
      setDeleteCourse(null);
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }) => 
      base44.entities.Course.update(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
    },
  });

  const duplicateCourseMutation = useMutation({
    mutationFn: async (courseId) => {
      const courseToDuplicate = courses.find(c => c.id === courseId);
      if (!courseToDuplicate) return;

      // Create new course
      const newCourse = await base44.entities.Course.create({
        title: `${courseToDuplicate.title} (עותק)`,
        description: courseToDuplicate.description,
        thumbnail: courseToDuplicate.thumbnail,
        is_published: false,
      });

      // Get all chapters for this course
      const courseChapters = chapters.filter(ch => ch.course_id === courseId);
      const chapterMapping = {};

      // Duplicate chapters
      for (const chapter of courseChapters) {
        const newChapter = await base44.entities.Chapter.create({
          course_id: newCourse.id,
          title: chapter.title,
          order: chapter.order,
        });
        chapterMapping[chapter.id] = newChapter.id;
      }

      // Get all lessons for this course
      const courseLessons = lessons.filter(l => l.course_id === courseId);

      // Duplicate lessons
      for (const lesson of courseLessons) {
        await base44.entities.Lesson.create({
          chapter_id: chapterMapping[lesson.chapter_id],
          course_id: newCourse.id,
          title: lesson.title,
          lesson_type: lesson.lesson_type,
          youtube_url: lesson.youtube_url,
          external_url: lesson.external_url,
          duration: lesson.duration,
          order: lesson.order,
        });
      }

      return newCourse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      queryClient.invalidateQueries(['chapters']);
      queryClient.invalidateQueries(['lessons']);
    },
  });

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (newCourse.title) {
      addCourseMutation.mutate(newCourse);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewCourse({ ...newCourse, thumbnail: file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-white mb-2"
          >
            ניהול קורסים
          </motion.h1>
          <p className="text-gray-400">{courses.length} קורסים</p>
        </div>
        {!isManager && (
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
          >
            <Plus className="w-5 h-5 ml-2" />
            קורס חדש
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          placeholder="חיפוש קורס..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-gray-500 pr-12 py-6"
        />
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 p-10 text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchQuery ? 'לא נמצאו קורסים' : 'אין קורסים עדיין'}
          </p>
          {!searchQuery && !isManager && (
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="mt-4 bg-[#c7af48] hover:bg-[#b39d3d] text-black"
            >
              צור קורס ראשון
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCourses.map((course, index) => {
              const courseChapters = chapters.filter(c => c.course_id === course.id);
              const courseLessons = lessons.filter(l => l.course_id === course.id);
              
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
                          course.is_published 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {course.is_published ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          <span className="text-xs font-medium">
                            {course.is_published ? 'פורסם' : 'טיוטה'}
                          </span>
                        </div>
                      </div>

                      {/* Actions Menu */}
                      {!isManager && <div className="absolute top-3 left-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="bg-black/50 hover:bg-black/70 text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem asChild>
                              <Link 
                                to={createPageUrl(`AdminCourseEdit?id=${course.id}`)}
                                className="flex items-center gap-2 text-white"
                              >
                                <Edit className="w-4 h-4" />
                                ערוך קורס
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateCourseMutation.mutate(course.id)}
                              disabled={duplicateCourseMutation.isPending}
                              className="flex items-center gap-2 text-white"
                            >
                              <Copy className="w-4 h-4" />
                              שכפל קורס
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => togglePublishMutation.mutate({
                                id: course.id,
                                is_published: !course.is_published
                              })}
                              className="flex items-center gap-2 text-white"
                            >
                              {course.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  הסתר
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4" />
                                  פרסם
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteCourse(course)}
                              className="flex items-center gap-2 text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>}
                    </div>

                    {/* Content */}
                    <Link to={isManager ? '#' : createPageUrl(`AdminCourseEdit?id=${course.id}`)}>
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#c7af48] transition-colors">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-gray-400 text-sm line-clamp-2 mt-2">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                          <span>{courseChapters.length} פרקים</span>
                          <span>{courseLessons.length} שיעורים</span>
                        </div>
                      </div>
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Course Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>קורס חדש</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCourse} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">שם הקורס *</Label>
              <Input
                id="title"
                required
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                placeholder="שם הקורס"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                placeholder="תיאור הקורס..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">תמונת קורס</Label>
              <div className="space-y-3">
                {newCourse.thumbnail && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800">
                    <img 
                      src={newCourse.thumbnail} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewCourse({ ...newCourse, thumbnail: '' })}
                      className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload').click()}
                    disabled={uploadingImage}
                    className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  >
                    {uploadingImage ? 'מעלה...' : 'העלה תמונה'}
                  </Button>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <Input
                  id="thumbnail"
                  value={newCourse.thumbnail}
                  onChange={(e) => setNewCourse({ ...newCourse, thumbnail: e.target.value })}
                  placeholder="או הזן קישור ישיר: https://..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="published">פרסום מיידי</Label>
              <Switch
                id="published"
                checked={newCourse.is_published}
                onCheckedChange={(checked) => setNewCourse({ ...newCourse, is_published: checked })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={addCourseMutation.isPending}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
              >
                {addCourseMutation.isPending ? 'יוצר...' : 'צור קורס'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCourse} onOpenChange={() => setDeleteCourse(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">מחיקת קורס</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              האם אתה בטוח שברצונך למחוק את "{deleteCourse?.title}"? 
              כל הפרקים והשיעורים בקורס זה יימחקו גם כן. פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCourseMutation.mutate(deleteCourse?.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteCourseMutation.isPending ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}