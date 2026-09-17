import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, LogOut, Trash2 } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const handleDeleteAccount = async () => {
    try {
      // Send deletion request email to admin
      await base44.integrations.Core.SendEmail({
        to: 'admin@youngrichacademy.co.il',
        subject: `בקשת מחיקת חשבון - ${user?.email}`,
        body: `המשתמש ${user?.full_name || ''} (${user?.email}) ביקש למחוק את חשבונו.\n\nמזהה משתמש: ${user?.id}\nתאריך: ${new Date().toLocaleString('he-IL')}\n\nנא לטפל בבקשה זו בהקדם.`,
      });
      toast({
        title: "הבקשה נשלחה בהצלחה",
        description: "בקשת מחיקת החשבון נשלחה למנהל המערכת ותטופל בהקדם. תתנתק כעת מהמערכת.",
      });
    } catch (e) {
      console.warn('Failed to send deletion request email', e);
      toast({
        title: "שגיאה בשליחת הבקשה",
        description: "לא הצלחנו לשלוח את בקשת המחיקה, אך תתנתק מהמערכת. נא לפנות שוב למנהל המערכת.",
        variant: "destructive",
      });
    }
    // Brief delay so the toast is visible before logout redirects
    setTimeout(() => base44.auth.logout('/'), 1500);
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10" dir="rtl">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">הפרופיל שלי</h1>

        {/* User Info */}
        <div className="bg-card/50 border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#c7af48] flex items-center justify-center">
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
            className="w-full justify-start border-border text-gray-300 hover:bg-secondary hover:text-foreground gap-3 py-6"
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
                  האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו תשלח בקשה למנהל המערכת ואינה ניתנת לביטול. לאחר שליחת הבקשה תתנתק אוטומטית מהמערכת, והבקשה תטופל על ידי מנהל המערכת בהמשך.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-foreground"
                >
                  מחק חשבון
                </AlertDialogAction>
                <AlertDialogCancel className="border-border text-gray-300 hover:bg-secondary">
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