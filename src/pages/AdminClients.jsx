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
  BookOpen
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

export default function AdminClients() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteClient, setDeleteClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newClient, setNewClient] = useState({ email: '', name: '' });
  const [selectedClientCourses, setSelectedClientCourses] = useState(null);
  const [selectedClientLessons, setSelectedClientLessons] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const getWebhookUrl = async () => {
      try {
        // Get the actual function URL from base44 SDK
        const url = base44.functions.getUrl('addClient');
        setWebhookUrl(url);
      } catch (error) {
        console.error('Error getting webhook URL:', error);
      }
    };
    getWebhookUrl();
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

  const addClientMutation = useMutation({
    mutationFn: (data) => base44.entities.AllowedClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setNewClient({ email: '', name: '' });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.AllowedClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setDeleteClient(null);
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

  const handleAddClient = (e) => {
    e.preventDefault();
    if (newClient.email) {
      addClientMutation.mutate(newClient);
    }
  };

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

      {/* Webhook Info Card */}
      <Card className="bg-gradient-to-br from-[#c7af48]/10 to-transparent border-[#c7af48]/20 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#c7af48]/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-[#c7af48]" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-2">הוספת לקוחות אוטומטית דרך Webhook</h3>
            <p className="text-gray-400 text-sm mb-4">
              שלח POST request כדי להוסיף לקוחות אוטומטית מטפסים או מערכות חיצוניות.
            </p>
            
            {/* Webhook URL Display */}
            <div className="bg-zinc-950 rounded-lg p-4 mb-4 border border-[#c7af48]/30">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-semibold text-[#c7af48] uppercase tracking-wide">🔗 כתובת Webhook</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (webhookUrl) {
                      navigator.clipboard.writeText(webhookUrl);
                    }
                  }}
                  disabled={!webhookUrl}
                  className="text-[#c7af48] hover:text-[#b39d3d] text-xs h-7 hover:bg-[#c7af48]/10 disabled:opacity-50"
                >
                  📋 העתק
                </Button>
              </div>
              <code className="text-white text-sm break-all block bg-zinc-900 p-3 rounded border border-zinc-800 font-mono" dir="ltr">
                {webhookUrl || 'טוען...'}
              </code>
              <p className="text-xs text-gray-500 mt-3">
                ✅ זוהי הכתובת המדויקת לשליחת POST requests להוספת לקוחות אוטומטית
              </p>
            </div>

            {/* Additional Instructions */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-400 flex items-start gap-2">
                <span className="shrink-0text-sm">ℹ️</span>
                <span>אם הכתובת לא עובדת, עבור ל-<strong>Dashboard → Code → Functions → addClient</strong> והעתק את ה-Function URL הרשמי משם.</span>
              </p>
            </div>

            {/* Example Request */}
            <details className="bg-zinc-900/30 rounded-lg p-3 mb-3">
              <summary className="cursor-pointer text-sm text-gray-300 font-medium">
                📝 דוגמה לשליחת בקשה
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-2">POST Request עם JSON body:</p>
                  <pre className="bg-zinc-950 rounded p-3 text-xs text-gray-300 overflow-x-auto">
{`{
  "email": "client@example.com",
  "name": "שם הלקוח"
}`}
                  </pre>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-2">דוגמה עם cURL (החלף YOUR_FUNCTION_URL בכתובת מה-Dashboard):</p>
                  <pre className="bg-zinc-950 rounded p-3 text-xs text-gray-300 overflow-x-auto" dir="ltr">
{`curl -X POST YOUR_FUNCTION_URL \\
  -H "Content-Type: application/json" \\
  -d '{"email":"client@example.com","name":"John Doe"}'`}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">דוגמה עם JavaScript/Fetch:</p>
                  <pre className="bg-zinc-950 rounded p-3 text-xs text-gray-300 overflow-x-auto" dir="ltr">
{`fetch('YOUR_FUNCTION_URL', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'client@example.com',
    name: 'John Doe'
  })
})
.then(res => res.json())
.then(data => console.log(data));`}
                  </pre>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mt-2">
                  <p className="text-xs text-blue-400">
                    <strong>📌 שים לב:</strong> החלף <code className="bg-zinc-900 px-1 rounded">YOUR_FUNCTION_URL</code> בכתובת המלאה שקיבלת מה-Dashboard.
                  </p>
                </div>
              </div>
            </details>

            {/* Response Examples */}
            <details className="bg-zinc-900/30 rounded-lg p-3 mb-3">
              <summary className="cursor-pointer text-sm text-gray-300 font-medium">
                ✅ תשובות אפשריות
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-green-400 mb-1">✅ הצלחה (201):</p>
                  <pre className="bg-zinc-950 rounded p-2 text-xs text-gray-300 overflow-x-auto">
{`{
  "success": true,
  "message": "Client added successfully",
  "client": {
    "id": "...",
    "email": "client@example.com",
    "name": "John Doe"
  }
}`}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-red-400 mb-1">❌ שגיאה - לקוח כבר קיים (409):</p>
                  <pre className="bg-zinc-950 rounded p-2 text-xs text-gray-300 overflow-x-auto">
{`{
  "error": "Client already exists",
  "client": { ... }
}`}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-red-400 mb-1">❌ שגיאה - חסר אימייל (400):</p>
                  <pre className="bg-zinc-950 rounded p-2 text-xs text-gray-300 overflow-x-auto">
{`{
  "error": "Email is required"
}`}
                  </pre>
                </div>


              </div>
            </details>

            {/* Parameters Info */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-zinc-800 text-gray-400 border border-zinc-700">
                📨 POST JSON
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-400 text-black border border-green-500">
                ✉️ email: חובה
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-zinc-800 text-gray-400 border border-zinc-700">
                👤 name: אופציונלי
              </span>
            </div>
          </div>
        </div>
      </Card>

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
                        <p className="text-xs text-gray-500 group-hover/stat:text-blue-400 transition-colors">סה"כ קורסים</p>
                        <p className="text-white font-semibold">{courses.length}</p>
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
                disabled={addClientMutation.isPending}
                className="flex-1 bg-[#c7af48] hover:bg-[#b39d3d] text-black font-semibold"
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
            <DialogTitle>קורסים של {selectedClientCourses?.name || selectedClientCourses?.email}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">אין קורסים במערכת</p>
              </div>
            ) : (
              courses.map((course) => {
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
            <DialogTitle>שיעורים של {selectedClientLessons?.name || selectedClientLessons?.email}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <PlayCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">אין שיעורים במערכת</p>
              </div>
            ) : (
              chapters
                .sort((a, b) => a.order - b.order)
                .map((chapter) => {
                  const chapterLessons = lessons
                    .filter(l => l.chapter_id === chapter.id)
                    .sort((a, b) => a.order - b.order);
                  
                  if (chapterLessons.length === 0) return null;

                  const course = courses.find(c => c.id === chapter.course_id);

                  return (
                    <div key={chapter.id} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-[#c7af48]" />
                        <h4 className="text-white font-semibold text-sm">{course?.title} - {chapter.title}</h4>
                      </div>
                      <div className="space-y-1">
                        {chapterLessons.map((lesson, index) => {
                          const isCompleted = allProgress.some(
                            p => p.user_email === selectedClientLessons?.email && 
                                 p.lesson_id === lesson.id && 
                                 p.completed
                          );

                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isCompleted 
                                  ? 'bg-green-500/5 border-green-500/20' 
                                  : 'bg-zinc-800/30 border-zinc-700/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isCompleted 
                                    ? 'bg-green-500' 
                                    : 'bg-zinc-700'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  ) : (
                                    <span className="text-xs text-gray-400">{index + 1}</span>
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
                                  : 'bg-zinc-700 text-gray-400'
                              }`}>
                                {isCompleted ? 'נצפה' : 'לא נצפה'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
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
              onClick={() => deleteClientMutation.mutate(deleteClient?.id)}
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