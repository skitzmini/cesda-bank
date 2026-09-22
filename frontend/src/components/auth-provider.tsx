'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, post } from '@/services/api';
import type { User } from '@/types';
const Context = createContext<{
  user: User;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
} | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [error, setError] = useState('');
  const refreshUser = async () => setUser(await api<User>('/auth/me'));
  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch((e) => {
        if (e.status === 401) router.replace('/login');
        else setError(e.message);
      });
  }, [router]);
  if (error)
    return (
      <main className="connection-error">
        <h1>Não foi possível abrir sua conta</h1>
        <p role="alert">{error}</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      </main>
    );
  if (!user)
    return (
      <div className="app-loading">
        <span className="loading-dot" />
        <p>Abrindo seu Cesda Bank…</p>
      </div>
    );
  return (
    <Context.Provider
      value={{
        user,
        refreshUser,
        logout: async () => {
          await post('/auth/logout', {});
          setUser(null);
          router.replace('/login');
          router.refresh();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw Error('AuthProvider ausente');
  return ctx;
}
