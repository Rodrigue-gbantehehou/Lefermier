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

    if (response.status === 401) {
      errorMsg = "Votre session a expiré. Veuillez vous reconnecter.";
      if (typeof window !== "undefined") {
        localStorage.removeItem("lefermier_token");
        if (
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register")
        ) {
          // Redirection douce après un court délai pour laisser le toast s'afficher
          setTimeout(() => {
            window.location.href = "/login?expired=1";
          }, 1200);
        }
      }
    } else if (response.status === 403) {
      errorMsg = "Action non autorisée avec vos permissions actuelles.";
    } else if (Array.isArray(body?.violations) && body.violations.length > 0) {
      errorMsg = body.violations
        .map((v: any) => v.title || v.message)
        .filter(Boolean)
        .join(". ");
    } else if (body?.detail) {
      errorMsg = body.detail;
    } else if (body?.message) {
      errorMsg = body.message;
    } else if (body?.error) {
      errorMsg = body.error;
    }

    throw new ApiError(errorMsg, response.status, body);
  }

  // If backend wraps payload in {"data": ...}, extract it, while keeping root if needed
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }

  return body as T;
}

/**
 * Télécharge un fichier binaire (ex: PDF généré par le backend)
 */
export async function downloadApiFile(
  endpoint: string,
  defaultFilename: string = "document.pdf"
): Promise<void> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: "application/pdf, application/octet-stream, */*",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lefermier_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    let errorMsg = "Impossible de générer le document PDF.";
    try {
      const errJson = await response.json();
      if (errJson?.message) errorMsg = errJson.message;
    } catch {
      // Ignorer si pas du JSON
    }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;

  // Si le header Content-Disposition contient un filename, l'extraire
  const disposition = response.headers.get("Content-Disposition");
  let filename = defaultFilename;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

