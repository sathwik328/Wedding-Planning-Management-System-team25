import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthenticatedUser, PermissionKey, LoginInput } from "shared";
import { apiFetch, setCsrfToken } from "../services/api";

interface AuthContextType {
  user: AuthenticatedUser | null;
  permissions: PermissionKey[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPermissions(data.permissions || []);
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      } else {
        setUser(null);
        setPermissions([]);
        setCsrfToken(null);
      }
    } catch {
      setUser(null);
      setPermissions([]);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for global 401s
    const handleUnauthorized = () => {
      setUser(null);
      setPermissions([]);
      setCsrfToken(null);
    };

    window.addEventListener("royal-knot:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("royal-knot:unauthorized", handleUnauthorized);
    };
  }, [checkAuth]);

  const login = async (credentials: LoginInput): Promise<void> => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
    setPermissions(data.permissions || []);
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST"
      });
    } catch {
      // Clean local state even if network call failed
    } finally {
      setUser(null);
      setPermissions([]);
      setCsrfToken(null);
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    // Admins and Founders have full access or check permission array
    if (user.role === "ADMIN" || user.role === "FOUNDER") return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
