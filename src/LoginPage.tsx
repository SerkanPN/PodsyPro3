import React, { useState } from 'react';
import { supabase } from './lib/supabase';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-sans p-4">
      <div className="max-w-md w-full bg-[#111] border border-[#222] p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-sky-500"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black m-0 tracking-tighter italic text-white mb-2">PODSY<span className="text-sky-500">PRO</span></h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Intelligence Engine</p>
        </div>
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 transition-all font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'YÖNLENDİRİLİYOR...' : 'GOOGLE İLE GİRİŞ YAP'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
