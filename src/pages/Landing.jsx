import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Landing() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  // If already logged in, go straight to courses
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) window.location.href = '/Home';
    });
  }, []);

  useEffect(() => {
    base44.entities.SiteSetting.list()
      .then(s => { if (s[0]?.logo_url) setLogoUrl(s[0].logo_url); })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email is registered in AllowedClient
      const clientData = await base44.entities.AllowedClient.filter({ email: normalizedEmail });

      if (clientData.length === 0) {
        setError('כניסה ללקוחות בלבד. האימייל שלך אינו רשום במערכת.');
        setLoading(false);
        return;
      }

      // Redirect to platform login — it will send a magic link and return user to /Home
      base44.auth.redirectToLogin('/Home');
    } catch (err) {
      setError('אירעה שגיאה. נסה שוב.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(16, 83, 48, 0.2);
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          {logoUrl ? (
            <img src={logoUrl} alt="האקדמיה לפיננסים" className="h-28 w-auto max-w-[260px] object-contain mb-5" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#105330] flex items-center justify-center mb-5 shadow-lg shadow-green-900/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-center leading-tight text-[#105330]">
            האקדמיה לפיננסים
          </h1>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="text-muted-foreground text-sm mb-1">ברוכים הבאים</p>
            <h2 className="text-lg font-bold text-foreground">התחבר לחשבון שלך</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="כתובת אימייל"
                className="bg-card/80 border-border text-foreground placeholder:text-muted-foreground pr-11 py-6 focus:border-[#105330] focus:ring-[#105330]/20"
                dir="rtl"
              />
            </div>


            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#105330] text-white font-bold py-6 text-base rounded-xl hover:bg-[#0a3d20] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  בודק...
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <span>כניסה לאקדמיה</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-6">
          האקדמיה לפיננסים © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}