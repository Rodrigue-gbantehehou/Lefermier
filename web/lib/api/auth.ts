import { apiRequest } from "./client";
import { Farm, User } from "../types";

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    farmName?: string;
  }) => {
    const parts = userData.fullName.trim().split(" ");
    const firstName = parts[0] || "Éleveur";
    const lastName = parts.slice(1).join(" ") || "Aviculteur";
    return apiRequest<{ token: string; user: User; farm?: Farm | null }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName,
          lastName,
          phone: userData.phone || undefined,
          farmName: userData.farmName || undefined,
        }),
      }
    );
  },

  me: () =>
    apiRequest<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      fullName: string;
      roles: string[];
      farms: any[];
    }>("/auth/me"),

  forgotPassword: (data: { identifier: string; channel?: "email" | "sms" }) =>
    apiRequest<{ message: string; devCode?: string; channel?: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  resetPassword: (data: { identifier: string; code: string; newPassword: string }) =>
    apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
