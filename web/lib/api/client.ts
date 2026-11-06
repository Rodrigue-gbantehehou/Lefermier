export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Client-side detection for mobile devices on LAN (ex: smartphone on Wi-Fi hotspot)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "/api";
    }
  }
  return "http://127.0.0.1:8000/api";
}

export const API_BASE_URL = getApiBaseUrl();

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
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;


  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Inject token if available on client-side
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("Poulvia_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Inject idempotency key for mutating requests (POST, PUT, PATCH) if not already provided
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH"].includes(method)) {
    if (!headers["Idempotency-Key"] && !headers["X-Idempotency-Key"]) {
      const generatedKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      headers["Idempotency-Key"] = generatedKey;
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
        localStorage.removeItem("Poulvia_token");
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
 * Variante de apiRequest qui retourne l'enveloppe complète de la réponse API
 * sans extraire automatiquement le champ "data".
 *
 * Utiliser quand la réponse contient des métadonnées supplémentaires (pagination,
 * compteurs, etc.) en dehors du champ "data", par exemple :
 * { data: HealthTreatment[], meta: { totalItems, overdueCount, upcomingCount } }
 *
 * @example
 * const { data, meta } = await apiRequestFull<{ data: HealthTreatment[], meta: HealthMeta }>(
 *   '/api/health-treatments'
 * );
 */
export async function apiRequestFull<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("Poulvia_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH"].includes(method)) {
    if (!headers["Idempotency-Key"] && !headers["X-Idempotency-Key"]) {
      headers["Idempotency-Key"] =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  const response = await fetch(url, { ...options, headers });

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
        localStorage.removeItem("Poulvia_token");
        if (
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register")
        ) {
          setTimeout(() => { window.location.href = "/login?expired=1"; }, 1200);
        }
      }
    } else if (response.status === 403) {
      errorMsg = "Action non autorisée avec vos permissions actuelles.";
    } else if (Array.isArray(body?.violations) && body.violations.length > 0) {
      errorMsg = body.violations.map((v: any) => v.title || v.message).filter(Boolean).join(". ");
    } else if (body?.detail) {
      errorMsg = body.detail;
    } else if (body?.message) {
      errorMsg = body.message;
    }
    throw new ApiError(errorMsg, response.status, body);
  }

  // Retourne l'enveloppe complète sans extraction — le service appelant extrait data/meta
  return body as T;
}

/**
 * Télécharge un fichier binaire (ex: PDF généré par le backend)
 */
export async function downloadApiFile(
  endpoint: string,
  defaultFilename: string = "document.pdf"
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;


  const headers: Record<string, string> = {
    Accept: "application/pdf, application/octet-stream, */*",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("Poulvia_token");
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

/**
 * Génère une clé d'idempotence unique.
 * À appeler UNE SEULE FOIS par action métier (au clic initial, au montage du formulaire),
 * puis réutiliser la même clé pour toutes les reprises réseau de cette même opération.
 *
 * Contrairement à la génération automatique dans apiRequest() (clé différente à chaque
 * appel HTTP), cette clé stable permet au backend de détecter les doublons issus de
 * doubles-clics ou de reprises après erreur réseau.
 */
export function generateIdempotencyKey(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Effectue un appel API mutatif avec une clé d'idempotence fournie explicitement.
 * Utiliser cette fonction depuis les handlers de formulaire lorsqu'une clé stable
 * a été générée au niveau de l'action métier.
 *
 * @example
 * const key = generateIdempotencyKey(); // généré au montage ou au clic initial
 * // Sur reprise réseau, réutiliser le même `key`
 * await apiRequestWithKey('/api/transactions', { method: 'POST', body: JSON.stringify(data) }, key);
 */
export async function apiRequestWithKey<T = any>(
  endpoint: string,
  options: RequestInit = {},
  idempotencyKey: string
): Promise<T> {
  const explicitHeaders: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
    "Idempotency-Key": idempotencyKey,
  };
  return apiRequest<T>(endpoint, { ...options, headers: explicitHeaders });
}
