import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import { authApi } from "../api/endpoints";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  /** True while we check a saved token on first load. */
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Admins and managers can edit the catalogue, suppliers and reports. */
  canManage: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setChecking(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      checking,
      login,
      logout,
      canManage: user?.role === "ADMIN" || user?.role === "MANAGER",
      isAdmin: user?.role === "ADMIN",
    }),
    [user, checking, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
