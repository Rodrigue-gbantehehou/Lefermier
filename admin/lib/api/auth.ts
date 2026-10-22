import { apiRequest } from "./client";

export interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles: string[];
  adminRole?: {
    id: string;
    name: string;
    code: string;
  } | null;
  adminPermissions?: string[];
}

export const authApi = {
  /**
   * Authentification auprès du firewall Lexik JWT Symfony
   */
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string }> => {
    return apiRequest<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Récupération du profil connecté et validation des rôles
   */
  me: async (): Promise<SuperAdminUser> => {
    const res = await apiRequest<{ data: SuperAdminUser }>("/api/auth/me");
    return res.data;
  },
};
