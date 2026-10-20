export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

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
 * Universal fetch wrapper with JWT injection & error handling
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

  // Inject token if available on client-side
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lefermier_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content
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
    let errorMsg = "Une erreur est survenue lors de la communication avec l'API.";
    if (body?.message) {
      errorMsg = body.message;
    } else if (body?.detail) {
      errorMsg = body.detail;
    } else if (body?.error) {
      errorMsg = body.error;
    } else if (response.status === 401) {
      errorMsg = "Session expirée ou identifiants incorrects.";
      if (typeof window !== "undefined") {
        localStorage.removeItem("lefermier_token");
      }
    } else if (response.status === 403) {
      errorMsg = "Action non autorisée avec vos permissions actuelles.";
    }

    throw new ApiError(errorMsg, response.status, body);
  }

  // If backend wraps payload in {"data": ...}, extract it, while keeping root if needed
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
}
