/**
 * Moteur HTTP unifié pour le client API d'administration Lefermier.
 * Inspiré de l'architecture de web/lib/api/client.ts.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper fetch universel avec injection du jeton JWT Super-Admin et gestion des erreurs
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Injection du jeton JWT Super-Admin côté client
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("lefermier_admin_jwt") ||
      localStorage.getItem("lefermier_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Gestion du 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("lefermier_admin_jwt");
    }
    const errorMsg =
      body?.message ||
      body?.error ||
      `Erreur serveur (${response.status} ${response.statusText})`;
    throw new ApiError(errorMsg, response.status, body);
  }

  return body as T;
}
