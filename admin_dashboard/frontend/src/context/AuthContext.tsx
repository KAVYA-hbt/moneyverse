import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { AuthApi } from '../api/endpoints';
import { getAuthToken, setAuthToken, toApiError } from '../api/client';
import type { Role } from '../types/api';

interface AuthUser {
  adminId: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  retryBootstrap: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = 'finguru_admin_user';

// Per product decision ("no login/auth page"), the backend still requires a JWT on
// every request, so the app silently authenticates as a seeded dev admin on boot
// instead of showing a login form. This is a fixed dev credential, not a real
// secret — the backend's seed data (backend/app/seed.py) provisions it.
export const DEV_DEMO_ACCOUNTS: { email: string; password: string; role: Role; label: string }[] = [
  { email: 'rakesh.tier1@finguru.dev', password: 'devpass123', role: 'tier1_admin', label: 'Rakesh (Tier 1 Admin)' },
  { email: 'arvind.tier2@finguru.dev', password: 'devpass123', role: 'tier2_admin', label: 'Arvind (Tier 2 Admin)' },
  { email: 'farah.analyst@finguru.dev', password: 'devpass123', role: 'product_analyst', label: 'Farah (Product Analyst)' },
];
const DEFAULT_DEV_ACCOUNT = DEV_DEMO_ACCOUNTS[0];

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(!getAuthToken());
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const login = useCallback(async (email: string, password: string) => {
    const res = await AuthApi.login({ email, password });
    setAuthToken(res.access_token);
    const authUser: AuthUser = {
      adminId: res.admin_id,
      name: res.name,
      role: res.role,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    setToken(res.access_token);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const retryBootstrap = useCallback(() => {
    setBootstrapAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (getAuthToken()) return; // already have a token from a prior session/dev switch
    let cancelled = false;
    setIsBootstrapping(true);
    setBootstrapError(null);
    login(DEFAULT_DEV_ACCOUNT.email, DEFAULT_DEV_ACCOUNT.password)
      .catch((err) => {
        if (!cancelled) {
          setBootstrapError(
            toApiError(err).detail ||
              'Could not reach the backend. Is it running on http://localhost:8000?',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapAttempt]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isBootstrapping,
        bootstrapError,
        login,
        logout,
        retryBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
