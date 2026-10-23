"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, SuperAdminUser } from "@/lib/api/auth";

interface AdminAuthContextType {
  user: SuperAdminUser | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

function isAllowedPlatformUser(profile: SuperAdminUser): boolean {
  if (!profile.roles) return false;
  return (
    profile.roles.includes("ROLE_SUPER_ADMIN") ||
    profile.roles.includes("ROLE_ADMIN") ||
    Boolean(profile.adminRole)
  );
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("lefermier_admin_jwt") : null;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authApi.me();
      if (!isAllowedPlatformUser(profile)) {
        localStorage.removeItem("lefermier_admin_jwt");
        setUser(null);
      } else {
        setUser(profile);
      }
    } catch {
      localStorage.removeItem("lefermier_admin_jwt");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("admin:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", handleUnauthorized);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (!res.token) {
        throw new Error("Jeton d'authentification manquant dans la réponse serveur.");
      }

      // Stockage temporaire pour valider le profil via /api/auth/me
      localStorage.setItem("lefermier_admin_jwt", res.token);
      const profile = await authApi.me();

      // Vérification des privilèges plateforme (Super-Admin ou Collaborateur avec rôle assigné)
      if (!isAllowedPlatformUser(profile)) {
        localStorage.removeItem("lefermier_admin_jwt");
        setUser(null);
        throw new Error(
          "Accès refusé : Votre compte ne possède pas les habilitations d'administration de la plateforme."
        );
      }

      setUser(profile);
    } catch (err: unknown) {
      localStorage.removeItem("lefermier_admin_jwt");
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lefermier_admin_jwt");
      window.location.href = "/login";
    }
    setUser(null);
  };

  const isSuperAdmin = !!(user?.roles?.includes("ROLE_SUPER_ADMIN") || user?.adminPermissions?.includes("*"));

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.adminPermissions?.includes(permission)) return true;
    return false;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isSuperAdmin,
        hasPermission,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
