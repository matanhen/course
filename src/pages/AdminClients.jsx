import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Trash2, 
  Search,
  Mail,
  User,
  X,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminClients() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteClient, setDeleteClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newClient, setNewClient] = useState({ email: '', name: '', course_id: '' });
  const [selectedClientCourses, setSelectedClientCourses] = useState(null);
  const [selectedClientLessons, setSelectedClientLessons] = useState(null);
  const [removeAccess, setRemoveAccess] = useState(null);
  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState('');
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    checkUser();
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.AllowedClient.list('-created_date'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allProgress'],
    queryFn: () => base44.entities.LessonProgress.list(),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => base44.entities.Chapter.list(),
  });

  const { data: clientAccess = [] } = useQuery({
    queryKey: ['clientAccess'],
    queryFn: () => base44.entities.ClientCourseAccess.list(),
  });

  const addClientMutation = useMutation({
    mutationFn: async (data) => {
      const client = await base44.entities.AllowedClient.create({ email: data.email, name: data.name });
      if (data.course_id) {
        await base44.entities.ClientCourseAccess.create({
          email: data.email,
          course_id: data.course_id
        });
      }
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['clientAccess']);
      setShowAddDialog(false);
      setNewClient({ email: '', name: '', course_id: '' });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (client) => {
      // Delete all course access for this client
      const access = clientAccess.filter(a => a.email === client.email);
      for (const a of access) {
        await base44.entities.ClientCourseAccess.delete(a.id);
      }
      await base44.entities.AllowedClient.delete(client.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['clientAccess']);
      setDeleteClient(null);
    },
  });

  const removeAccessMutation = useMutation({
    mutationFn: ({ email, course_id }) => {
      const access = clientAccess.find(a => a.email === email && a.course_id === course_id);
      return base44.entities.ClientCourseAccess.delete(access.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccess']);
      setRemoveAccess(null);
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: ({ email, course_id }) => {
      return base44.entities.ClientCourseAccess.create({
        email: email,
        course_id: course_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAccess']);
      setShowAddCourseDialog(false);
      setSelectedCourseToAdd('');
    },
  });

  const filteredClients = clients.filter(client =>
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientProgress = (clientEmail) => {
    const clientProgress = allProgress.filter(p => p.user_email === clientEmail && p.completed);
    return clientProgress.length;
  };

  const getTotalLessons = () => {
    return lessons.length;
  };

  const getClientCourses = (clientEmail) => {
    const accessList = clientAccess.filter(a => a.email === clientEmail);
    return courses.filter(c => accessList.some(a => a.course_id === c.id));
  };

  const getAvailableCoursesForClient = (clientEmail) => {
    const clientCourseIds = clientAccess
      .filter(a => a.email === clientEmail)
      .map(a => a.course_id);
    return courses.filter(c => !clientCourseIds.includes(c.id));
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (selectedCourseToAdd && selectedClientCourses) {
      addCourseMutation.mutate({
        email: selectedClientCourses.email,
        course_id: selectedCourseToAdd
      });
    }
  };

  const handleAddClient = (e) => {
    e.preventDefault();
    if (newClient.email) {
      addClientMutation.mutate(newClient);
    }
  };

  if (!user) {
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

  return (
    <div className="min-h-screen bg-black p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-10">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-white mb-2"
          >
            ניהול לקוחות
          </motion.h1>
          <p className="text-gray-400">{clients.length} לקוחות מורשים</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף לקוח
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          placeholder="חיפוש לפי שם או אימייל..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-gray-500 pr-12 py-6"
        />
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c7af48]"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 p-10 text-center">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">
            {searchQuery ? 'לא נמצאו לקוחות' : 'אין לקוחות מורשים עדיין'}
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="mt-4 bg-[#c7af48] hover:bg-[#b39d3d] text-black"
            >
              הוסף לקוח ראשון
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-zinc-900/50 border-zinc-800 p-5 group hover:border-zinc-700 transition-all">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c7af48] to-[#e5d07a] flex items-center justify-center shrink-0">
                        <span className="text-black font-bold text-lg">
                          {(client.name || client.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium">
                          {client.name || 'ללא שם'}
                        </h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteClient(client)}
                      className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Progress Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => setSelectedClientCourses(client)}
                      className="flex items-center gap-2 hover:bg-zinc-800/50 rounded-lg p-2 transition-colors group/stat"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover/stat:bg-blue-500/20 transition-colors">
                        <PlayCircle className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 group-hover/stat:text-blue-400 transition-colors">קורסים מורשים</p>
                        <p className="text-white font-semibold">{getClientCourses(client.email).length}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedClientLessons(client)}
                      className="flex items-center gap-2 hover:bg-zinc-800/50 rounded-lg p-2 transition-colors group/stat"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover/stat:bg-green-500/20 transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 group-hover/stat:text-green-400 transition-colors">שיעורים נצפו</p>
                        <p className="text-white font-semibold">
                          {getClientProgress(client.email)}/{getTotalLessons()}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#c7af48]/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-[#c7af48]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">התקדמות</p>
                        <p className="text-white font-semibold">
                          {getTotalLessons() > 0 
                            ? Math.round((getClientProgress(client.email) / getTotalLessons()) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>הוסף לקוח חדש</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClient} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל *</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-zinc-800 border-zinc-700 text-white pr-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">שם (אופציונלי)</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="שם הלקוח"
                  className="bg-zinc-800 border-zinc-700 text-white pr-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">קורס *</Label>
              <Select
                value={newClient.course_id}
                onValueChange={(value) => setNewClient({ ...newClient, course_id: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="בחר קורס" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id} className="text-white">
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1 border-red-700 text-red-400 hover:bg-red-500/10"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={addClientMutation.isPending || !newClient.course_id}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold disabled:opacity-50"
              >
                {addClientMutation.isPending ? 'מוסיף...' : 'הוסף לקוח'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Courses Dialog */}
      <Dialog open={!!selectedClientCourses} onOpenChange={() => setSelectedClientCourses(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>קורסים של {selectedClientCourses?.name || selectedClientCourses?.email}</DialogTitle>
              <Button
                onClick={() => setShowAddCourseDialog(true)}
                className="bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
                size="sm"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף קורס
              </Button>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {getClientCourses(selectedClientCourses?.email).length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">אין קורסים מורשים ללקוח זה</p>
              </div>
            ) : (
              getClientCourses(selectedClientCourses?.email).map((course) => {
                const courseLessons = lessons.filter(l => l.course_id === course.id);
                const clientProgress = allProgress.filter(
                  p => p.user_email === selectedClientCourses?.email && 
                       p.course_id === course.id && 
                       p.completed
                );
                const progressPercent = courseLessons.length > 0 
                  ? Math.round((clientProgress.length / courseLessons.length) * 100)
                  : 0;

                return (
                  <Card key={course.id} className="bg-zinc-800/50 border-zinc-700 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-zinc-700 overflow-hidden shrink-0">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold mb-1">{course.title}</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-400">{courseLessons.length} שיעורים</span>
                          <span className="text-gray-600">•</span>
                          <span className={`font-medium ${
                            progressPercent === 100 ? 'text-green-400' :
                            progressPercent > 0 ? 'text-[#c7af48]' : 'text-gray-500'
                          }`}>
                            {clientProgress.length}/{courseLessons.length} נצפו ({progressPercent}%)
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoveAccess({ email: selectedClientCourses.email, course_id: course.id, course_title: course.title })}
                        className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lessons Dialog */}
      <Dialog open={!!selectedClientLessons} onOpenChange={() => setSelectedClientLessons(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>שיעורים נצפו - {selectedClientLessons?.name || selectedClientLessons?.email}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Course Selection */}
            <div className="space-y-2">
              <Label>בחר קורס</Label>
              <div className="grid grid-cols-1 gap-2">
                {getClientCourses(selectedClientLessons?.email).map((course) => {
                  const courseLessons = lessons.filter(l => l.course_id === course.id);
                  const clientProgress = allProgress.filter(
                    p => p.user_email === selectedClientLessons?.email && 
                         p.course_id === course.id && 
                         p.completed
                  );
                  const progressPercent = courseLessons.length > 0 
                    ? Math.round((clientProgress.length / courseLessons.length) * 100)
                    : 0;

                  return (
                    <button
                      key={course.id}
                      onClick={() => {
                        const courseChapters = chapters
                          .filter(ch => ch.course_id === course.id)
                          .sort((a, b) => a.order - b.order);

                        if (courseChapters.length > 0) {
                          document.getElementById(`course-details-${course.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-[#c7af48]/50 transition-all text-right group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold group-hover:text-[#c7af48] transition-colors">
                            {course.title}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {clientProgress.length}/{courseLessons.length} שיעורים נצפו
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            progressPercent === 100 ? 'text-green-400' :
                            progressPercent > 0 ? 'text-[#c7af48]' : 'text-gray-500'
                          }`}>
                            {progressPercent}%
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Course Details */}
            {getClientCourses(selectedClientLessons?.email).map((course) => {
              const courseChapters = chapters
                .filter(ch => ch.course_id === course.id)
                .sort((a, b) => a.order - b.order);

              return (
                <div key={course.id} id={`course-details-${course.id}`} className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#c7af48]" />
                    {course.title}
                  </h3>
                  {courseChapters.map((chapter) => {
                    const chapterLessons = lessons
                      .filter(l => l.chapter_id === chapter.id)
                      .sort((a, b) => a.order - b.order);

                    if (chapterLessons.length === 0) return null;

                    return (
                      <div key={chapter.id} className="space-y-2">
                        <h4 className="text-white font-semibold text-sm px-2">{chapter.title}</h4>
                        <div className="space-y-1">
                          {chapterLessons.map((lesson, index) => {
                            const lessonProgress = allProgress.find(
                              p => p.user_email === selectedClientLessons?.email && 
                                   p.lesson_id === lesson.id
                            );
                            const isCompleted = lessonProgress?.completed || false;
                            const progressPercent = lessonProgress?.progress_percent || 0;

                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  isCompleted 
                                    ? 'bg-green-500/5 border-green-500/20' 
                                    : progressPercent > 0
                                      ? 'bg-yellow-500/5 border-yellow-500/20'
                                      : 'bg-zinc-800/30 border-zinc-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCompleted 
                                      ? 'bg-green-500' 
                                      : progressPercent > 0
                                        ? 'bg-yellow-500'
                                        : 'bg-zinc-700'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                    ) : (
                                      <span className="text-xs text-white">{progressPercent > 0 ? `${progressPercent}%` : index + 1}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-gray-300">{lesson.title}</p>
                                    {lesson.duration && (
                                      <p className="text-xs text-gray-500">{lesson.duration}</p>
                                    )}
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  isCompleted 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : progressPercent > 0
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-zinc-700 text-gray-400'
                                }`}>
                                  {isCompleted ? 'נצפה' : progressPercent > 0 ? `בתהליך ${progressPercent}%` : 'לא נצפה'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              האם אתה בטוח שברצונך למחוק את {deleteClient?.name || deleteClient?.email}? 
              הלקוח לא יוכל יותר לגשת למערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate(deleteClient)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Course Dialog */}
      <Dialog open={showAddCourseDialog} onOpenChange={setShowAddCourseDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>הוסף קורס ללקוח</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCourse} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addCourse">בחר קורס</Label>
              {getAvailableCoursesForClient(selectedClientCourses?.email).length === 0 ? (
                <p className="text-gray-400 text-sm py-3">כל הקורסים כבר מורשים ללקוח זה</p>
              ) : (
                <Select
                  value={selectedCourseToAdd}
                  onValueChange={(value) => setSelectedCourseToAdd(value)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="בחר קורס" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {getAvailableCoursesForClient(selectedClientCourses?.email).map((course) => (
                      <SelectItem key={course.id} value={course.id} className="text-white">
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddCourseDialog(false);
                  setSelectedCourseToAdd('');
                }}
                className="flex-1 border-red-700 text-red-400 hover:bg-red-500/10"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={addCourseMutation.isPending || !selectedCourseToAdd}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold disabled:opacity-50"
              >
                {addCourseMutation.isPending ? 'מוסיף...' : 'הוסף קורס'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Access Confirmation */}
      <AlertDialog open={!!removeAccess} onOpenChange={() => setRemoveAccess(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">הסרת גישה לקורס</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              האם אתה בטוח שברצונך להסיר את הגישה לקורס "{removeAccess?.course_title}"? 
              הלקוח לא יוכל יותר לגשת לקורס זה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeAccessMutation.mutate({ email: removeAccess.email, course_id: removeAccess.course_id })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              הסר גישה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}