
import React, { useState } from 'react';
import { User, Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (username: string, pin: string) => boolean;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a small delay for better UX feeling
    setTimeout(() => {
        const success = onLogin(username, pin);
        if (!success) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
            setLoading(false);
        }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 font-sans relative overflow-hidden" dir="rtl">
      
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-in slide-in-from-top-10 fade-in duration-700">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-900/20 border border-white/5 mb-4 group">
                <ShieldCheck size={40} className="text-blue-500 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">NIGHTMARE <span className="text-blue-500">SYSTEM</span></h1>
            <p className="text-slate-400 text-sm">نظام إدارة المبيعات والمخازن المتطور</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500 delay-150">
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block mr-1">اسم المستخدم</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <User className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0f172a]/80 border border-slate-700 text-white text-sm rounded-xl py-3.5 pr-12 pl-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-bold placeholder:text-slate-600"
                            placeholder="username"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block mr-1">كلمة المرور / PIN</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <KeyRound className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                        </div>
                        <input 
                            type="password" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-[#0f172a]/80 border border-slate-700 text-white text-sm rounded-xl py-3.5 pr-12 pl-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-bold placeholder:text-slate-600 tracking-widest"
                            placeholder="••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                        <span className="text-xs text-red-400 font-bold">{error}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>تسجيل الدخول</span>
                            <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform" />
                        </>
                    )}
                </button>

            </form>

            <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-500">
                    الإصدار 2.5.0 &copy; {new Date().getFullYear()} جميع الحقوق محفوظة
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
