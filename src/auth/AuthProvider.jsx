import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      }

      setLoading(false);
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const authUser = session?.user ?? null;

      setUser(authUser);

      if (authUser) {
        await loadProfile(authUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
    };
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }
  }

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}