"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { apiService } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<string>;
  resendVerification: (email: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "matpilot_token";
const REFRESH_KEY = "matpilot_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    setToken(accessToken);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const restoreUser = useCallback(async (accessToken: string) => {
    try {
      const me = await apiService.getMe();
      setUser(me);
      setToken(accessToken);
    } catch {
      clearTokens();
    }
  }, [clearTokens]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      restoreUser(stored).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [restoreUser]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const res = await apiService.login({
        username_or_email: usernameOrEmail,
        password,
      });
      saveTokens(res.access_token, res.refresh_token);
      setUser(res.user);
    },
    [saveTokens],
  );

  const register = useCallback(
    async (username: string, email: string, password: string, fullName?: string) => {
      const res = await apiService.register({
        username,
        email,
        password,
        full_name: fullName,
      });
      saveTokens(res.access_token, res.refresh_token);
      setUser(res.user);
    },
    [saveTokens],
  );

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch {
      // Server-side revocation is best-effort; always clear local session.
    } finally {
      clearTokens();
    }
  }, [clearTokens]);

  const verifyEmail = useCallback(async (token: string) => {
    const res = await apiService.verifyEmail(token);
    if (token) {
      try {
        const me = await apiService.getMe();
        setUser(me);
      } catch {
        // Ignore refresh failures here; the user can reload.
      }
    }
    return res.message;
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const res = await apiService.resendVerification(email);
    return res.message;
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await apiService.forgotPassword(email);
    return res.message;
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const res = await apiService.resetPassword(token, newPassword);
    return res.message;
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const res = await apiService.changePassword(oldPassword, newPassword);
      saveTokens(res.access_token, res.refresh_token);
    },
    [saveTokens],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
