"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Farm, FarmRole, FarmSubscription, User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  activeFarm: Farm | null;
  activePlan: FarmSubscription | null;
  farms: Farm[];
  role: FarmRole | null;
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    farmName?: string;
  }) => Promise<void>;
  logout: () => void;
  switchFarm: (farmId: string) => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  hasModule: (moduleKey: string) => boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [role, setRole] = useState<FarmRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on client-side
  useEffect(() => {
    const storedToken = localStorage.getItem("lefermier_token");
    if (storedToken) {
      setToken(storedToken);
      loadCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadCurrentUser() {
    try {
      setIsLoading(true);
      const res = await api.auth.me();
      
      const mappedUser: User = {
        id: res.id,
        email: res.email,
        fullName: res.fullName || `${res.firstName} ${res.lastName}`,
        roles: res.roles || [],
      };
      setUser(mappedUser);

      const mappedFarms: any[] = (res.farms || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        code: f.code,
        productionType: f.productionType,
        location: f.locationCity,
        locationCity: f.locationCity,
        locationCountry: f.locationCountry || "BJ",
        currency: f.currency || "XOF",
        phone: f.phone || null,
        email: f.email || null,
        address: f.address || null,
        ifu: f.ifu || null,
        rccm: f.rccm || null,
        description: f.description || null,
        surfaceAreaM2: f.surfaceAreaM2,
        status: "ACTIVE",
        createdAt: f.createdAt || new Date().toISOString(),
        userRole: f.role,
        roleName: f.roleName,
        permissions: f.permissions || [],
        subscription: f.subscription || null,
      }));
      setFarms(mappedFarms);

      const storedFarmId = localStorage.getItem("lefermier_active_farm_id");
      const currentFarm =
        mappedFarms.find((f) => f.id === storedFarmId) || mappedFarms[0] || null;
      setActiveFarm(currentFarm);

      if (currentFarm) {
        setRole({
          id: currentFarm.id,
          name: currentFarm.roleName || currentFarm.userRole || "Collaborateur",
          isSystem: true,
          permissions: currentFarm.permissions || [],
          createdAt: new Date().toISOString(),
        });
      }

      const allPermissions = [
        "farm:read", "farm:create", "farm:update", "farm:delete", "farm:view", "farm:edit",
        "flock:read", "flock:create", "flock:update", "flock:delete", "flock:view", "flock:movement",
        "egg:read", "egg:create", "egg:delete", "egg:view",
        "inventory:read", "inventory:create", "inventory:update", "inventory:delete", "inventory:view", "inventory:movement", "inventory:valuation",
        "finance:read", "finance:create", "finance:delete", "finance:view", "finance:margin",
        "contact:read", "contact:create", "contact:update", "contact:delete", "contact:view",
        "role:read", "role:create", "role:update", "role:manage",
        "member:manage", "member:read", "member:create", "member:update", "member:delete",
        "dashboard:view", "dashboard:financials",
        "api_key:manage",
      ];

      // Les permissions retournées par l'API intègrent déjà la formule souscrite pour la ferme active
      if (Array.isArray(currentFarm?.permissions)) {
        const rawPerms: string[] = currentFarm.permissions;
        const permsSet = new Set<string>(rawPerms);
        rawPerms.forEach((p) => {
          if (p.endsWith(":view")) permsSet.add(p.replace(":view", ":read"));
          if (p.endsWith(":read")) permsSet.add(p.replace(":read", ":view"));
          if (p.endsWith(":manage")) {
            const prefix = p.replace(":manage", "");
            permsSet.add(`${prefix}:create`);
            permsSet.add(`${prefix}:update`);
            permsSet.add(`${prefix}:read`);
            permsSet.add(`${prefix}:view`);
          }
        });
        setPermissions(Array.from(permsSet));
      } else {
        setPermissions([]);
      }
    } catch {
      // Invalid or expired token
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(credentials: { email: string; password: string }) {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      localStorage.setItem("lefermier_token", res.token);
      setToken(res.token);
      await loadCurrentUser();
    } finally {
      setIsLoading(false);
    }
  }

  async function register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    farmName?: string;
  }) {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      localStorage.setItem("lefermier_token", res.token);
      setToken(res.token);
      await loadCurrentUser();
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("lefermier_token");
    localStorage.removeItem("lefermier_active_farm_id");
    setToken(null);
    setUser(null);
    setActiveFarm(null);
    setFarms([]);
    setRole(null);
    setPermissions([]);
    setIsLoading(false);
  }

  async function switchFarm(farmId: string) {
    localStorage.setItem("lefermier_active_farm_id", farmId);
    const target = farms.find((f) => f.id === farmId);
    if (target) {
      setActiveFarm(target);
    }
    await loadCurrentUser();
  }

  function hasModule(moduleKey: string): boolean {
    if (!activeFarm) return false;
    const modules = activeFarm.subscription?.modules;
    if (!Array.isArray(modules)) return false;
    return modules.includes(moduleKey);
  }

  function hasPermission(permissionKey: string): boolean {
    if (!activeFarm) return false;

    if (permissions.includes("*")) return true;
    if (permissions.includes(permissionKey)) return true;

    // Normalisation croisée view/read
    if (permissionKey.endsWith(":read") && permissions.includes(permissionKey.replace(":read", ":view"))) return true;
    if (permissionKey.endsWith(":view") && permissions.includes(permissionKey.replace(":view", ":read"))) return true;

    return false;
  }

  async function refreshMe() {
    await loadCurrentUser();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        activeFarm,
        activePlan: activeFarm?.subscription || null,
        farms,
        role,
        permissions,
        token,
        isLoading,
        login,
        register,
        logout,
        switchFarm,
        hasPermission,
        hasModule,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
