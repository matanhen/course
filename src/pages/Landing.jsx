import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { GraduationCap, Mail, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Landing() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if email is registered in AllowedClient
      const normalizedEmail = email.trim().toLowerCase();
      const clientData = await base44.entities.AllowedClient.filter({ email: normalizedEmail });

      if (clientData.length === 0) {
        setError('כניסה ללקוחות בלבד. האימייל שלך אינו רשום במערכת.');
        setLoading(false);
        return;
      }

      base44.auth.redirectToLogin('https://academy.matanhen.com/Home');
    } catch (err) {
      setError('אירעה שגיאה. נסה שוב.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6" dir="rtl">
      <style>{`
        .gold-gradient {
          background: linear-gradient(135deg, #c7af48 0%, #e5d07a 50%, #c7af48 100%);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(199, 175, 72, 0.15);
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mb-5 shadow-lg shadow-yellow-900/30">
            <GraduationCap className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center leading-tight">
            האקדמיה של<br />
            <span className="text-[#c7af48]">צעירים מתעשרים</span>
          </h1>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-white mb-1">ברוכים הבאים</h2>
            <p className="text-gray-400 text-sm">התחבר לחשבון שלך</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium">כתובת אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-zinc-900/80 border-zinc-700 text-white placeholder:text-gray-600 pr-11 py-6 focus:border-[#c7af48] focus:ring-[#c7af48]/20"
                  dir="ltr"
                />
              </div>
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
              className="w-full gold-gradient text-black font-bold py-6 text-base rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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

        <p className="text-center text-gray-600 text-xs mt-6">
          צעירים מתעשרים © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}