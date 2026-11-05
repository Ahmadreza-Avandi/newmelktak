import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/apiClient.ts";
import type { Tenant, User } from "../types/index.ts";

export interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    agency_code: string,
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await api.get<{
        authenticated?: boolean;
        user: User | null;
        tenant: Tenant | null;
      }>("/api/v1/auth/session");
      if (
        response.success &&
        response.data?.authenticated &&
        response.data.user &&
        response.data.tenant
      ) {
        setUser(response.data.user);
        setTenant(response.data.tenant);
      } else {
        api.setToken(null);
        setUser(null);
        setTenant(null);
      }
    } catch {
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
      setTenant(null);
    });
    refreshAuth();
  }, [refreshAuth]);

  const login = async (agency_code: string, username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; user: User; tenant: Tenant }>(
        "/api/v1/auth/login",
        { agency_code, username, password }
      );
      if (response.success && response.data) {
        api.setToken(response.data.token);
        setUser(response.data.user);
        setTenant(response.data.tenant);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return {
        success: false,
        error: response.error?.message || "کد آژانس، نام کاربری یا رمز عبور اشتباه است.",
      };
    } catch {
      setIsLoading(false);
      return {
        success: false,
        error: "ارتباط با سرور برقرار نشد. لطفاً وضعیت اینترنت را بررسی فرمایید.",
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    let errorMessage: string | undefined;
    try {
      const response = await api.post("/api/v1/auth/logout");
      if (!response.success) {
        errorMessage = response.error?.message || "خطا در فرآیند خروج از سامانه.";
      }
    } catch (error) {
      console.error("Logout error:", error);
      errorMessage = "ارتباط با سرور برقرار نشد.";
    } finally {
      api.setToken(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.clear();
        } catch {
          // Ignore storage errors
        }
      }
      setUser(null);
      setTenant(null);
      setIsLoading(false);
    }
    return { success: !errorMessage, error: errorMessage };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useOfficeAdmin(): boolean {
  const { user } = useAuth();
  return ["ADMIN", "OWNER"].includes(user?.role_code || "");
}
