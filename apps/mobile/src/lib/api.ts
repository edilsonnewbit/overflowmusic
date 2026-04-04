import { API_BASE } from "./config";
import type {
  AuthUser,
  ChecklistRun,
  ChecklistTemplate,
  EventSetlist,
  LoginPayload,
  LoginResponse,
  MusicEvent,
  Song,
  SongImportResult,
  SongPreview,
} from "../types";

type JsonRecord = Record<string, unknown>;

// ── Token handlers (injectados pelo SessionContext) ───────────────────────────

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

let getStoredToken: (() => Promise<string | null>) | null = null;
let persistToken: ((token: string) => Promise<void>) | null = null;

export function setTokenHandlers(
  getter: () => Promise<string | null>,
  setter: (token: string) => Promise<void>,
): void {
  getStoredToken = getter;
  persistToken = setter;
}

// Reads the `exp` claim from a JWT without verifying signature (client-side only).
function getTokenExpSeconds(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

// Returns true if the token is valid and expires within `withinSeconds`.
export function isTokenExpiringSoon(token: string, withinSeconds = 172800): boolean {
  const exp = getTokenExpSeconds(token);
  if (exp === null) return false;
  return exp - Math.floor(Date.now() / 1000) < withinSeconds;
}

async function authFetch(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== 401) return response;

  // On 401 — attempt silent token refresh before giving up.
  if (getStoredToken && persistToken) {
    const currentToken = await getStoredToken();
    if (currentToken) {
      try {
        const refreshResp = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (refreshResp.ok) {
          const refreshBody = (await refreshResp.json()) as { accessToken?: string };
          if (typeof refreshBody.accessToken === "string") {
            await persistToken(refreshBody.accessToken);
            // Retry original request with fresh token.
            const retryInit: RequestInit = {
              ...init,
              headers: {
                ...(init.headers as Record<string, string>),
                Authorization: `Bearer ${refreshBody.accessToken}`,
              },
            };
            return fetch(url, retryInit);
          }
        }
      } catch {
        // Refresh failed — fall through to onUnauthorized
      }
    }
  }

  onUnauthorized?.();
  return response;
}

async function parseJson(response: Response): Promise<JsonRecord> {
  try {
    return (await response.json()) as JsonRecord;
  } catch {
    return {};
  }
}

// ── Explicit refresh call (used by SessionContext on bootstrap) ───────────────

export async function refreshAccessToken(
  currentToken: string,
): Promise<{ ok: boolean; accessToken?: string; user?: AuthUser }> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const body = await parseJson(response);
    if (!response.ok) return { ok: false };
    return {
      ok: true,
      accessToken: typeof body.accessToken === "string" ? body.accessToken : undefined,
      user: (body.user as AuthUser | undefined),
    };
  } catch {
    return { ok: false };
  }
}

export async function authGoogle(payload: LoginPayload): Promise<{ ok: boolean; body: LoginResponse }> {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await parseJson(response)) as unknown as LoginResponse;
  return { ok: response.ok, body };
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await parseJson(response);
  if (!response.ok || !body.user) {
    throw new Error("unauthorized");
  }

  return body.user as AuthUser;
}

export async function fetchChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const response = await fetch(`${API_BASE}/checklists/templates`, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok || !Array.isArray(body.templates)) {
    return [];
  }
  return body.templates as ChecklistTemplate[];
}

export async function fetchEventChecklist(eventId: string): Promise<{ ok: boolean; checklist: ChecklistRun; message?: string }> {
  const response = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/checklist`, { method: "GET" });
  const body = await parseJson(response);

  if (!response.ok) {
    return {
      ok: false,
      checklist: null,
      message: typeof body.message === "string" ? body.message : "Falha ao carregar checklist.",
    };
  }

  return {
    ok: true,
    checklist: (body.setlist || body.checklist || null) as ChecklistRun,
  };
}

export async function updateChecklistItem(
  eventId: string,
  itemId: string,
  input: { checked?: boolean; checkedByName?: string },
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) {
    return {
      ok: false,
      message: "Faça login com perfil autorizado para executar esta ação.",
    };
  }

  const response = await authFetch(
    `${API_BASE}/events/${encodeURIComponent(eventId)}/checklist/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(input),
    },
  );
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao atualizar item.",
    };
  }

  return { ok: true };
}

export async function previewSongTxt(
  content: string,
  accessToken?: string | null,
): Promise<{ ok: boolean; parsed: SongPreview | null; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) {
    return {
      ok: false,
      parsed: null,
      message: "Faça login com perfil autorizado para executar esta ação.",
    };
  }

  const response = await authFetch(`${API_BASE}/songs/import/txt/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ content }),
  });

  const body = await parseJson(response);
  if (!response.ok || !body.parsed) {
    return {
      ok: false,
      parsed: null,
      message: typeof body.message === "string" ? body.message : "Falha no preview da cifra.",
    };
  }

  return { ok: true, parsed: body.parsed as SongPreview };
}

export async function importSongTxt(
  content: string,
  accessToken?: string | null,
): Promise<{ ok: boolean; imported: SongImportResult | null; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) {
    return {
      ok: false,
      imported: null,
      message: "Faça login com perfil autorizado para executar esta ação.",
    };
  }

  const response = await authFetch(`${API_BASE}/songs/import/txt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ content }),
  });

  const body = await parseJson(response);
  const song = body.song as JsonRecord | undefined;
  const chordChart = body.chordChart as JsonRecord | undefined;
  if (!response.ok || !song || !chordChart) {
    return {
      ok: false,
      imported: null,
      message: typeof body.message === "string" ? body.message : "Falha ao importar cifra.",
    };
  }

  return {
    ok: true,
    imported: {
      songId: typeof song.id === "string" ? song.id : "",
      songTitle: typeof song.title === "string" ? song.title : "",
      chartVersion: typeof chordChart.version === "number" ? chordChart.version : 0,
    },
  };
}

export async function fetchEvents(): Promise<{ ok: boolean; events: MusicEvent[]; message?: string }> {
  const response = await fetch(`${API_BASE}/events`, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok || !Array.isArray(body.events)) {
    return {
      ok: false,
      events: [],
      message: typeof body.message === "string" ? body.message : "Falha ao carregar eventos.",
    };
  }
  return { ok: true, events: body.events as MusicEvent[] };
}

export async function createEvent(
  input: { title: string; dateTime: string; location?: string; description?: string },
  accessToken?: string | null,
): Promise<{ ok: boolean; event?: MusicEvent; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) {
    return { ok: false, message: "Token de autenticação ausente." };
  }
  const response = await authFetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao criar evento.",
    };
  }
  return { ok: true, event: body.event as MusicEvent };
}

export async function updateEvent(
  id: string,
  input: { title?: string; dateTime?: string; location?: string },
  accessToken?: string | null,
): Promise<{ ok: boolean; event?: MusicEvent; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) return { ok: false, message: "Token de autenticação ausente." };
  const response = await authFetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao atualizar evento.",
    };
  }
  return { ok: true, event: body.event as MusicEvent };
}

export async function deleteEvent(
  id: string,
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) return { ok: false, message: "Token de autenticação ausente." };
  const response = await authFetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!response.ok) {
    const body = await parseJson(response);
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao excluir evento.",
    };
  }
  return { ok: true };
}

export async function addSetlistItem(
  eventId: string,
  input: { songTitle: string; key?: string },
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) return { ok: false, message: "Token de autenticação ausente." };
  const response = await authFetch(
    `${API_BASE}/events/${encodeURIComponent(eventId)}/setlist/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify(input),
    },
  );
  const body = await parseJson(response);
  if (!response.ok) {
    return { ok: false, message: typeof body.message === "string" ? body.message : "Falha ao adicionar música." };
  }
  return { ok: true };
}

export async function removeSetlistItem(
  eventId: string,
  itemId: string,
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) return { ok: false, message: "Token de autenticação ausente." };
  const response = await authFetch(
    `${API_BASE}/events/${encodeURIComponent(eventId)}/setlist/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bearerToken}` },
    },
  );
  if (!response.ok) {
    const body = await parseJson(response);
    return { ok: false, message: typeof body.message === "string" ? body.message : "Falha ao remover música." };
  }
  return { ok: true };
}

export async function updateSetlistItem(
  eventId: string,
  itemId: string,
  input: { key?: string; leaderName?: string; zone?: string; transitionNotes?: string },
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) return { ok: false, message: "Token de autenticação ausente." };
  const response = await authFetch(
    `${API_BASE}/events/${encodeURIComponent(eventId)}/setlist/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify(input),
    },
  );
  const body = await parseJson(response);
  if (!response.ok) {
    return { ok: false, message: typeof body.message === "string" ? body.message : "Falha ao editar item." };
  }
  return { ok: true };
}

export async function fetchEventSetlist(eventId: string): Promise<{ ok: boolean; setlist: EventSetlist; message?: string }> {
  const response = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/setlist`, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      setlist: null,
      message: typeof body.message === "string" ? body.message : "Falha ao carregar setlist.",
    };
  }
  return {
    ok: true,
    setlist: (body.setlist ?? null) as EventSetlist,
  };
}

export async function reorderSetlist(
  eventId: string,
  items: { id: string; order: number }[],
  accessToken?: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const bearerToken = (accessToken || "").trim();
  if (!bearerToken) {
    return { ok: false, message: "Token de autenticação ausente." };
  }

  const response = await authFetch(
    `${API_BASE}/events/${encodeURIComponent(eventId)}/setlist/reorder`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ items }),
    },
  );
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao reordenar setlist.",
    };
  }
  return { ok: true };
}

export async function fetchSongs(): Promise<{ ok: boolean; songs: Song[]; message?: string }> {
  const response = await fetch(`${API_BASE}/songs`, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok) {
    return { ok: false, songs: [], message: typeof body.message === "string" ? body.message : "Falha ao carregar músicas." };
  }
  return { ok: true, songs: (body.songs ?? []) as Song[] };
}

export async function fetchSongById(id: string): Promise<{ ok: boolean; song?: Song; message?: string }> {
  const response = await fetch(`${API_BASE}/songs/${encodeURIComponent(id)}`, { method: "GET" });
  const body = await parseJson(response);
  if (!response.ok) {
    return { ok: false, message: typeof body.message === "string" ? body.message : "Música não encontrada." };
  }
  return { ok: true, song: body.song as Song };
}

export async function updateProfile(
  accessToken: string,
  data: { name: string },
): Promise<{ ok: boolean; user?: AuthUser; message?: string }> {
  const response = await authFetch(`${API_BASE}/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      message: typeof body.message === "string" ? body.message : "Falha ao atualizar perfil.",
    };
  }
  return { ok: true, user: body.user as AuthUser };
}
