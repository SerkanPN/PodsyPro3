import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { API_BASE_URL } from './config';

interface AppContextType {
  favData: any[];
  historyData: any[];
  fetchFavorites: (type: string) => void;
  fetchHistory: (type: string) => void;
  toggleFollow: (type: string, id: string, e?: React.MouseEvent) => Promise<number | undefined>;
  HeartIcon: React.FC<{ isTracked: boolean }>;
  resolvePrice: (p: any) => number;
  currentUser: User | null | undefined;
  session: Session | null;
  logout: () => void;
  isAdmin: boolean;
  supabase: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favData, setFavData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
        setCurrentUser(session.user);
      } else {
        setIsAdmin(false);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    setIsAdmin(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchFavorites = useCallback(async (type: string) => {
    if (!currentUser) return;
    const table = `user_tracked_${type}s`; 
    const { data, error } = await supabase.from(table).select('*');
    if (!error && data) {
      setFavData(data);
    }
  }, [currentUser]);

  const fetchHistory = useCallback(async (type: string) => {
    if (!currentUser) return;
    const table = `user_history_${type}s`;
    const { data, error } = await supabase.from(table).select('*').order('last_viewed', { ascending: false });
    if (!error && data) {
      setHistoryData(data);
    }
  }, [currentUser]);

  const toggleFollow = useCallback(async (type: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return undefined;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return undefined;
      
      const res = await fetch(`${API_BASE_URL}/toggle-follow/${type}/${encodeURIComponent(id)}`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      
      if (data.is_tracked === 0) {
        setFavData(prev => prev.filter(item => (item.listing_id || item.shop_id || item.keyword) !== id));
      }
      
      setHistoryData(prev => prev.map(item => {
        const itemId = item.listing_id || item.shop_id || item.keyword;
        if (itemId === id) return { ...item, is_tracked: data.is_tracked };
        return item;
      }));

      return data.is_tracked;
    } catch (err) { 
      console.error(err);
      alert("Takip işlemi başarısız.");
      return undefined;
    }
  }, [currentUser]);

  const HeartIcon: React.FC<{ isTracked: boolean }> = ({ isTracked }) => {
    if (isTracked) {
      return (
        <svg className="w-6 h-6 text-rose-500 fill-rose-500 drop-shadow-md transition hover:scale-110" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-white/60 hover:text-rose-500 drop-shadow-md transition hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
      </svg>
    );
  };
  
  const resolvePrice = (p: any): number => {
    if (typeof p === 'number') return p;
    if (p && typeof p === 'object' && p.amount !== undefined) return p.amount / (p.divisor || 100);
    if (typeof p === 'string') return parseFloat(p) || 0;
    return 0;
  };

  const value = { favData, historyData, fetchFavorites, fetchHistory, toggleFollow, HeartIcon, resolvePrice, currentUser, session, logout, isAdmin, supabase };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
