import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, LogOut, Trash2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const handleDeleteAccount = async () => {
    if (!user?.email || deleting) return;
    setDeleting(true);

    try {
      const emails = [...new Set([user.email, user.email.toLowerCase()])];

      // Delete the client's data first (best effort — the account deletion purges it too)
      await Promise.allSettled(emails.map(async (email) => {
        const [allowedClients, accessRecords, progressRecords] = await Promise.all([
          base44.entities.AllowedClient.filter({ email }),
          base44.entities.ClientCourseAccess.filter({ email }),
          base44.entities.LessonProgress.filter({ user_email: email }),
        ]);

        await Promise.all([
          ...allowedClients.map(r => base44.entities.AllowedClient.delete(r.id)),
          ...accessRecords.map(r => base44.entities.ClientCourseAccess.delete(r.id)),
          ...progressRecords.map(r => base44.entities.LessonProgress.delete(r.id)),
        ]);
      }));

      // Delete the user account itself
      await base44.functions.invoke('deleteMyAccount', {});
    } catch (e) {
      console.warn('Account deletion failed', e);
      setDeleting(false);
      toast({
        title: "שגיאה במחיקת החשבון",
        description: "לא הצלחנו למחוק את החשבון. נא לפנות למנהל המערכת.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "החשבון נמחק",
      description: "כל הנתונים שלך נמחקו לצמיתות. תתנתק כעת מהמערכת.",
    });
    // Brief delay so the toast is visible before logout redirects
    setTimeout(() => base44.auth.logout('/'), 1200);
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10" dir="rtl">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">הפרופיל שלי</h1>

        {/* User Info */}
        <div className="bg-card/50 border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--gold)] flex items-center justify-center">
              <span className="text-black text-2xl font-bold">
                {user?.full_name?.[0] || user?.email?.[0] || '?'}
              </span>
            </div>
            <div>
              <p className="text-foreground font-semibold text-lg">{user?.full_name || 'משתמש'}</p>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => base44.auth.logout('/')}
            variant="outline"
            className="w-full justify-start border-border text-muted-foreground hover:bg-secondary hover:text-foreground gap-3 py-6"
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start border-red-900/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-3 py-6"
              >
                <Trash2 className="w-5 h-5" />
                מחק חשבון
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border text-foreground" dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">מחיקת חשבון</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  האם אתה בטוח שברצונך למחוק את החשבון? כל הנתונים שלך — הפרופיל, הגישה לקורסים וההתקדמות בשיעורים — יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם. בסיום תתנתק אוטומטית מהמערכת.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-foreground disabled:opacity-70"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מוחק...
                    </>
                  ) : 'מחק חשבון'}
                </AlertDialogAction>
                <AlertDialogCancel className="border-border text-muted-foreground hover:bg-secondary">
                  ביטול
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}