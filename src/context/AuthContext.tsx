import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/apiClient.ts";
import {
  attemptOfflineLogin,
  clearActiveOfflinePointer,
  enrollOfflineSession,
  getActiveOfflineScope,
  restoreActiveOfflineSession,
  revokeLocalLicense,
  validateLocalLicenseState,
} from "../services/offlineLicense.ts";
import type { LicenseBlockReason, SignedOfflineLicense } from "../shared/offline-license.ts";
import type { Tenant, User } from "../types/index.ts";

export interface LoginResult {
  success: boolean;
  error?: string;
  code?: string;
  status?: number;
  offline?: boolean;
}

export interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode?: boolean;
  offlineBlockReason?: LicenseBlockReason | null;
  offlineBlockMessage?: string | null;
  login: (
    agency_code: string,
    username: string,
    password: string
  ) => Promise<LoginResult>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
  clearOfflineBlock?: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [offlineBlockReason, setOfflineBlockReason] = useState<LicenseBlockReason | null>(null);
  const [offlineBlockMessage, setOfflineBlockMessage] = useState<string | null>(null);
  const activeScopeRef = useRef<{ tenantId: string; userId: string } | null>(null);

  useEffect(() => {
    activeScopeRef.current =
      user && tenant ? { tenantId: tenant.id, userId: user.id } : null;
  }, [user, tenant]);

  const tryRestoreOffline = useCallback(async () => {
    const restored = await restoreActiveOfflineSession();
    if (restored.ok && restored.user && restored.tenant) {
      setUser(restored.user);
      setTenant(restored.tenant);
      setIsOfflineMode(true);
      setOfflineBlockReason(null);
      setOfflineBlockMessage(null);
      return true;
    }
    const reason = restored.validation?.reason;
    if (
      reason &&
      reason !== "NO_LICENSE"
    ) {
      setOfflineBlockReason(reason);
      setOfflineBlockMessage(
        restored.validation?.message ||
          "اعتبار اشتراک در حالت آفلاین معتبر نیست. لطفاً به اینترنت متصل شوید.",
      );
    } else {
      setOfflineBlockReason(null);
      setOfflineBlockMessage(null);
    }
    setUser(null);
    setTenant(null);
    setIsOfflineMode(false);
    return false;
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!isOnline) {
        await tryRestoreOffline();
        return;
      }

      const response = await api.get<{
        authenticated?: boolean;
        user: User | null;
        tenant: Tenant | null;
        offline_license?: SignedOfflineLicense | null;
      }>("/api/v1/auth/session");

      if (
        response.success &&
        response.data?.authenticated &&
        response.data.user &&
        response.data.tenant
      ) {
        setUser(response.data.user);
        setTenant(response.data.tenant);
        setIsOfflineMode(false);
        setOfflineBlockReason(null);
        setOfflineBlockMessage(null);
        await enrollOfflineSession({
          user: response.data.user,
          tenant: response.data.tenant,
          offlineLicense: response.data.offline_license,
        }).catch(() => {});
      } else if (response.status === 0 || response.error?.code === "NETWORK_ERROR") {
        await tryRestoreOffline();
      } else {
        api.setToken(null);
        await clearActiveOfflinePointer().catch(() => {});
        setUser(null);
        setTenant(null);
        setIsOfflineMode(false);
        if (
          (response.status === 402 || response.status === 403) &&
          (response.error?.code === "SUBSCRIPTION_EXPIRED" ||
            response.error?.code === "AGENCY_SUSPENDED")
        ) {
          setOfflineBlockReason(
            response.error.code === "AGENCY_SUSPENDED" ? "SUSPENDED" : "EXPIRED",
          );
          setOfflineBlockMessage(
            response.error.message || "اشتراک دفتر املاک فعال نیست.",
          );
        }
      }
    } catch {
      await tryRestoreOffline();
    } finally {
      setIsLoading(false);
    }
  }, [tryRestoreOffline]);

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
      setTenant(null);
      setIsOfflineMode(false);
      void clearActiveOfflinePointer().catch(() => {});
    });

    api.onSubscriptionBlocked((code, message) => {
      const reason = code === "AGENCY_SUSPENDED" ? "SUSPENDED" : "EXPIRED";
      void (async () => {
        const scope = activeScopeRef.current || (await getActiveOfflineScope());
        if (scope) {
          await revokeLocalLicense(scope, reason).catch(() => {});
        }
      })();
      api.setToken(null);
      setUser(null);
      setTenant(null);
      setIsOfflineMode(false);
      setOfflineBlockReason(reason);
      setOfflineBlockMessage(message);
    });

    refreshAuth();
  }, [refreshAuth]);

  // Re-check local subscription/clock validity periodically while running offline
  useEffect(() => {
    if (!user || !tenant) return;
    const scope = { tenantId: tenant.id, userId: user.id };
    const timer = window.setInterval(async () => {
      if (typeof navigator !== "undefined" && navigator.onLine) return;
      const check = await validateLocalLicenseState(scope);
      if (!check.valid) {
        setUser(null);
        setTenant(null);
        setIsOfflineMode(false);
        setOfflineBlockReason(check.reason || "EXPIRED");
        setOfflineBlockMessage(
          check.message || "دسترسی آفلاین به دلیل انقضای اشتراک یا تغییر ساعت مسدود شد.",
        );
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [user, tenant]);

  const login = async (
    agency_code: string,
    username: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      if (isOnline) {
        const response = await api.post<{
          token: string;
          user: User;
          tenant: Tenant;
          offline_license?: SignedOfflineLicense | null;
        }>("/api/v1/auth/login", { agency_code, username, password });

        if (response.success && response.data) {
          api.setToken(response.data.token);
          setUser(response.data.user);
          setTenant(response.data.tenant);
          setIsOfflineMode(false);
          setOfflineBlockReason(null);
          setOfflineBlockMessage(null);
          await enrollOfflineSession({
            user: response.data.user,
            tenant: response.data.tenant,
            offlineLicense: response.data.offline_license,
            password,
          }).catch(() => {});
          return { success: true };
        }

        if (response.status !== 0 && response.error?.code !== "NETWORK_ERROR") {
          return {
            success: false,
            error: response.error?.message,
            code: response.error?.code,
            status: response.status,
          };
        }
      }

      const offlineAttempt = await attemptOfflineLogin(agency_code, username, password);
      if (offlineAttempt.success && offlineAttempt.user && offlineAttempt.tenant) {
        setUser(offlineAttempt.user);
        setTenant(offlineAttempt.tenant);
        setIsOfflineMode(true);
        setOfflineBlockReason(null);
        setOfflineBlockMessage(null);
        return { success: true, offline: true };
      }

      return {
        success: false,
        error: offlineAttempt.message,
        code: offlineAttempt.code || "NETWORK_ERROR",
        status:
          offlineAttempt.code === "INVALID_CREDENTIALS"
            ? 401
            : offlineAttempt.code === "SUBSCRIPTION_EXPIRED"
            ? 402
            : offlineAttempt.code === "AGENCY_SUSPENDED" ||
              offlineAttempt.code === "OFFLINE_SECURITY_BLOCK"
            ? 403
            : 0,
      };
    } catch {
      return {
        success: false,
        code: "NETWORK_ERROR",
        status: 0,
        error: "ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
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
      await clearActiveOfflinePointer().catch(() => {});
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.removeItem("amlak_session_token");
        } catch {
          // Ignore storage errors
        }
      }
      setUser(null);
      setTenant(null);
      setIsOfflineMode(false);
      setOfflineBlockReason(null);
      setOfflineBlockMessage(null);
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
        isOfflineMode,
        offlineBlockReason,
        offlineBlockMessage,
        login,
        logout,
        refreshAuth,
        clearOfflineBlock: () => {
          setOfflineBlockReason(null);
          setOfflineBlockMessage(null);
        },
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

