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

export default function Profile() {
  const [user, setUser] = useState(null);

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
    } catch (e) {
      // Even if email fails, proceed with logout
      console.warn('Failed to send deletion request email', e);
    }
    base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-black p-6 lg:p-10" dir="rtl">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">הפרופיל שלי</h1>

        {/* User Info */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#c7af48] flex items-center justify-center">
              <span className="text-black text-2xl font-bold">
                {user?.full_name?.[0] || user?.email?.[0] || '?'}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user?.full_name || 'משתמש'}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => base44.auth.logout('/')}
            variant="outline"
            className="w-full justify-start border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white gap-3 py-6"
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
            <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-white" dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">מחיקת חשבון</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו תשלח בקשה למנהל המערכת ואינה ניתנת לביטול.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  מחק חשבון
                </AlertDialogAction>
                <AlertDialogCancel className="border-zinc-700 text-gray-300 hover:bg-zinc-800">
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