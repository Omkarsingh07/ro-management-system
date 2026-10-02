"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthUser, LoginCredentials } from "../lib/types";
import { fetchCurrentUser, loginUser, logoutUser } from "../lib/api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = pathname === "/login";

  useEffect(() => {
    let active = true;

    async function verify() {
      if (user) {
        setLoading(false);
        if (isPublicRoute) {
          router.replace("/dashboard");
        }
        return;
      }

      // Fast-path for login page: skip network check if there's no stored token
      const token = typeof window !== "undefined" ? localStorage.getItem("ro_token") : null;
      if (!token && isPublicRoute) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        if (!active) return;
        setUser(currentUser);
        if (isPublicRoute) {
          router.replace("/dashboard");
        }
      } catch {
        if (!active) return;
        setUser(null);
        if (!isPublicRoute) {
          router.replace("/login");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    verify();

    return () => {
      active = false;
    };
  }, [isPublicRoute, pathname, router]);

  const handleLogin = async (credentials: LoginCredentials) => {
    const authData = await loginUser(credentials);
    setUser(authData);
    setLoading(false);
    router.replace("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout request errors — proceed to reset state
    } finally {
      setUser(null);
      setLoading(false);
      router.replace("/login");
    }
  };

  // If we are checking auth on a protected route, show a minimal loading placeholder
  if (loading && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and trying to access a protected route
  if (!loading && !user && !isPublicRoute) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
