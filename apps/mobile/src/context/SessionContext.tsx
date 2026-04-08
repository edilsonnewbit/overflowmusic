import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CACHE_EVENTS, cacheSetlistKey, getCache, setCache } from "../lib/cache";
import {
  addSetlistItem,
  authGoogle,
  createEvent,
  deleteEvent,
  fetchChecklistTemplates,
  fetchEventChecklist,
  fetchEventSetlist,
  fetchEvents,
  fetchMe,
  fetchMyInvites,
  importSongTxt,
  isTokenExpiringSoon,
  previewSongTxt,
  refreshAccessToken,
  removeSetlistItem,
  reorderSetlist,
  respondMusicianSlot,
  setTokenHandlers,
  setUnauthorizedHandler,
  updateChecklistItem,
  updateEvent,
  updateSetlistItem,
} from "../lib/api";
import type { MusicianInvite } from "../lib/api";
import { TOKEN_KEY } from "../lib/config";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import type {
  AuthUser,
  ChecklistRun,
  ChecklistTemplate,
  EventSetlist,
  LoginPayload,
  MusicEvent,
  SetlistItem,
  SongImportResult,
  SongPreview,
} from "../types";

// ─── Context shape ─────────────────────────────────────────────────────────────

export interface SessionContextValue {
  // Auth
  accessToken: string | null;
  user: AuthUser | null;
  loadingSession: boolean;
  isLoggedIn: boolean;
  statusText: string;
  login: (payload: LoginPayload) => Promise<void>;
  logout: (message?: string) => Promise<void>;
  updateUser: (updated: AuthUser) => void;
  pendingGoogleIdToken: string | null;
  completeGoogleProfile: (data: {
    instagramProfile: string;
    birthDate: string;
    church: string;
    pastorName: string;
    whatsapp: string;
    address: string;
  }) => Promise<void>;

  // Events
  events: MusicEvent[];
  loadingEvents: boolean;
  activeEventId: string | null;
  eventSetlist: EventSetlist;
  loadingSetlist: boolean;
  reorderingId: string | null;
  eventsStatus: string;
  isOffline: boolean;
  creatingEvent: boolean;
  loadEventsList: () => Promise<void>;
  selectEvent: (id: string) => Promise<void>;
  moveSetlistItem: (item: SetlistItem, direction: "up" | "down", sorted: SetlistItem[]) => Promise<void>;
  handleAddToSetlist: (songTitle: string, key?: string) => Promise<void>;
  handleRemoveSetlistItem: (itemId: string) => Promise<void>;
  handleUpdateSetlistItem: (
    itemId: string,
    input: { key?: string; leaderName?: string; zone?: string; transitionNotes?: string },
  ) => Promise<void>;
  handleCreateEvent: (input: { title: string; dateTime: string; location?: string; address?: string; eventType?: string }) => Promise<void>;
  handleUpdateEvent: (
    id: string,
    input: { title?: string; dateTime?: string; location?: string; address?: string; eventType?: string; status?: string },
  ) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;

  // Musician invite
  pendingInvite: { slotId: string; eventTitle: string; role: string } | null;
  setPendingInvite: (invite: { slotId: string; eventTitle: string; role: string } | null) => void;
  handleRespondInvite: (accept: boolean) => Promise<void>;
  pendingInvites: MusicianInvite[];
  loadMyInvites: () => Promise<void>;
  respondToInvite: (slotId: string, accept: boolean) => Promise<void>;

  // Checklist
  templates: ChecklistTemplate[];
  eventId: string;
  setEventId: (id: string) => void;
  eventChecklist: ChecklistRun;
  loadingChecklist: boolean;
  updatingChecklistItemId: string | null;
  loadChecklist: (eventId: string) => Promise<void>;
  toggleChecklistItem: (itemId: string, nextChecked: boolean) => Promise<void>;

  // Songs
  songPreview: SongPreview | null;
  songImportResult: SongImportResult | null;
  loadingSongPreview: boolean;
  loadingSongImport: boolean;
  loadSongPreview: (content: string) => Promise<void>;
  saveSongTxt: (content: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  // Auth
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [statusText, setStatusText] = useState("Inicializando...");
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<MusicEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [eventSetlist, setEventSetlist] = useState<EventSetlist>(null);
  const [loadingSetlist, setLoadingSetlist] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [eventsStatus, setEventsStatus] = useState("Carregue os eventos.");
  const [isOffline, setIsOffline] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Musician invite
  const [pendingInvite, setPendingInvite] = useState<{ slotId: string; eventTitle: string; role: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<MusicianInvite[]>([]);

  // Checklist
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [eventId, setEventId] = useState("");
  const [eventChecklist, setEventChecklist] = useState<ChecklistRun>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [updatingChecklistItemId, setUpdatingChecklistItemId] = useState<string | null>(null);

  // Songs
  const [songPreview, setSongPreview] = useState<SongPreview | null>(null);
  const [songImportResult, setSongImportResult] = useState<SongImportResult | null>(null);
  const [loadingSongPreview, setLoadingSongPreview] = useState(false);
  const [loadingSongImport, setLoadingSongImport] = useState(false);

  const isLoggedIn = Boolean(user && accessToken);

  // Token ref para closures
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // ── Bootstrap e handlers globais ────────────────────────────────────────────

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout("Sessão expirada. Faça login novamente.");
    });
    setTokenHandlers(
      () => AsyncStorage.getItem(TOKEN_KEY),
      async (token: string) => {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        setAccessToken(token);
      },
    );
    return () => {
      setUnauthorizedHandler(() => {});
    };
  }, []);

  // ── Funções de auth ─────────────────────────────────────────────────────────

  async function bootstrapSession() {
    setLoadingSession(true);
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setStatusText("Faça login para continuar.");
        return;
      }

      // Renew token silently if it expires in less than 2 days.
      let tokenToUse = savedToken;
      if (isTokenExpiringSoon(savedToken)) {
        const refreshResult = await refreshAccessToken(savedToken);
        if (refreshResult.ok && refreshResult.accessToken) {
          tokenToUse = refreshResult.accessToken;
          await AsyncStorage.setItem(TOKEN_KEY, tokenToUse);
        }
      }

      const me = await fetchMe(tokenToUse);
      setAccessToken(tokenToUse);
      setUser(me);
      setStatusText(`Sessão ativa: ${me.name}`);
      void registerForPushNotificationsAsync(tokenToUse);
      await loadTemplates();
      await loadEventsList();
      await loadMyInvites();
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setAccessToken(null);
      setUser(null);
      setStatusText("Sessão inválida. Faça login novamente.");
    } finally {
      setLoadingSession(false);
    }
  }

  async function login(payload: LoginPayload) {
    setStatusText("Autenticando...");
    try {
      const { ok, body } = await authGoogle(payload);
      if (!ok) {
        setStatusText(body.message || "Falha no login.");
        return;
      }

      // New Google user who needs to fill mandatory profile fields
      if (body.status === "PENDING_APPROVAL" && body.needsProfileCompletion && payload.idToken) {
        setPendingGoogleIdToken(payload.idToken);
        setStatusText("Complete seu cadastro para continuar.");
        return;
      }

      if (body.status === "PENDING_APPROVAL") {
        setStatusText("Conta pendente de aprovação do administrador.");
        return;
      }

      if (body.status === "REJECTED") {
        setStatusText("Conta rejeitada. Contate um administrador.");
        return;
      }

      if (body.status === "APPROVED" && typeof body.accessToken === "string") {
        await AsyncStorage.setItem(TOKEN_KEY, body.accessToken);
        const me = await fetchMe(body.accessToken);
        setAccessToken(body.accessToken);
        setUser(me);
        setStatusText(`Login aprovado: ${me.name}`);
        void registerForPushNotificationsAsync(body.accessToken);
        await loadTemplates();
        await loadEventsList();
        await loadMyInvites();
        return;
      }

      setStatusText("Resposta de login inesperada.");
    } catch {
      setStatusText("Erro de rede no login.");
    }
  }

  function updateUser(updated: AuthUser) {
    setUser(updated);
    setStatusText(`Perfil atualizado: ${updated.name}`);
  }

  async function completeGoogleProfile(data: {
    instagramProfile: string;
    birthDate: string;
    church: string;
    pastorName: string;
    whatsapp: string;
    address: string;
  }) {
    if (!pendingGoogleIdToken) return;
    setStatusText("Salvando perfil...");
    try {
      const { ok, body } = await authGoogle({
        idToken: pendingGoogleIdToken,
        volunteerTermsAccepted: true,
        ...data,
      });
      if (!ok) {
        setStatusText(body.message || "Falha ao salvar perfil.");
        return;
      }
      setPendingGoogleIdToken(null);
      if (body.status === "PENDING_APPROVAL") {
        setStatusText("Cadastro completo! Aguardando aprovação do administrador.");
        return;
      }
      if (body.status === "APPROVED" && typeof body.accessToken === "string") {
        await AsyncStorage.setItem(TOKEN_KEY, body.accessToken);
        const me = await fetchMe(body.accessToken);
        setAccessToken(body.accessToken);
        setUser(me);
        setStatusText(`Bem-vindo, ${me.name}!`);
        void registerForPushNotificationsAsync(body.accessToken);
        await loadTemplates();
        await loadEventsList();
        await loadMyInvites();
      }
    } catch {
      setStatusText("Erro ao salvar perfil. Tente novamente.");
    }
  }

  async function logout(statusMessage = "Sessão encerrada.") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setTemplates([]);
    setEventId("");
    setEventChecklist(null);
    setSongPreview(null);
    setSongImportResult(null);
    setEvents([]);
    setActiveEventId(null);
    setEventSetlist(null);
    setIsOffline(false);
    setStatusText(statusMessage);
  }

  // ── Checklist templates ─────────────────────────────────────────────────────

  async function loadTemplates() {
    try {
      const nextTemplates = await fetchChecklistTemplates();
      setTemplates(nextTemplates);
    } catch {
      setTemplates([]);
    }
  }

  // ── Eventos ─────────────────────────────────────────────────────────────────

  async function loadEventsList() {
    setLoadingEvents(true);
    setEventsStatus("Carregando eventos...");

    const cached = await getCache<MusicEvent[]>(CACHE_EVENTS);
    if (cached) {
      setEvents(cached);
    }

    try {
      const result = await fetchEvents();
      if (result.ok) {
        setEvents(result.events);
        void setCache(CACHE_EVENTS, result.events);
        setIsOffline(false);
        setEventsStatus(`${result.events.length} evento(s) encontrado(s).`);
      } else {
        if (!cached) setEvents([]);
        setEventsStatus(result.message ?? "Falha.");
      }
    } catch {
      setIsOffline(true);
      setEventsStatus(cached ? "Dados em cache (offline)." : "Sem conexão com o servidor.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function selectEvent(id: string) {
    setActiveEventId(id);
    setLoadingSetlist(true);

    const cached = await getCache<EventSetlist>(cacheSetlistKey(id));
    setEventSetlist(cached ?? null);

    try {
      const result = await fetchEventSetlist(id);
      if (result.ok) {
        setEventSetlist(result.setlist);
        void setCache(cacheSetlistKey(id), result.setlist);
        setIsOffline(false);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoadingSetlist(false);
    }
  }

  async function moveSetlistItem(
    item: SetlistItem,
    direction: "up" | "down",
    sorted: SetlistItem[],
  ) {
    if (reorderingId || !activeEventId) return;
    const idx = sorted.findIndex((s) => s.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    setReorderingId(item.id);
    const newOrder = sorted.map((s, i) => ({ id: s.id, order: i + 1 }));
    const tmp = newOrder[idx].order;
    newOrder[idx].order = newOrder[swapIdx].order;
    newOrder[swapIdx].order = tmp;

    try {
      const result = await reorderSetlist(activeEventId, newOrder, accessTokenRef.current);
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao reordenar.");
        return;
      }
      const fresh = await fetchEventSetlist(activeEventId);
      setEventSetlist(fresh.setlist);
    } catch {
      setEventsStatus("Erro de rede ao reordenar.");
    } finally {
      setReorderingId(null);
    }
  }

  async function handleAddToSetlist(songTitle: string, key?: string) {
    if (!activeEventId) return;
    setEventsStatus("Adicionando ao setlist...");
    try {
      const result = await addSetlistItem(
        activeEventId,
        { songTitle, key },
        accessTokenRef.current,
      );
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao adicionar.");
        return;
      }
      const fresh = await fetchEventSetlist(activeEventId);
      setEventSetlist(fresh.setlist);
      void setCache(cacheSetlistKey(activeEventId), fresh.setlist);
      setEventsStatus(`"${songTitle}" adicionada ao setlist.`);
    } catch {
      setEventsStatus("Erro de rede ao adicionar música.");
    }
  }

  async function handleRemoveSetlistItem(itemId: string) {
    if (!activeEventId) return;
    setReorderingId(itemId);
    try {
      const result = await removeSetlistItem(activeEventId, itemId, accessTokenRef.current);
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao remover.");
        return;
      }
      const fresh = await fetchEventSetlist(activeEventId);
      setEventSetlist(fresh.setlist);
      void setCache(cacheSetlistKey(activeEventId), fresh.setlist);
    } catch {
      setEventsStatus("Erro de rede ao remover item.");
    } finally {
      setReorderingId(null);
    }
  }

  async function handleUpdateSetlistItem(
    itemId: string,
    input: { key?: string; leaderName?: string; zone?: string; transitionNotes?: string },
  ) {
    if (!activeEventId) return;
    setEventsStatus("Salvando item...");
    try {
      const result = await updateSetlistItem(
        activeEventId,
        itemId,
        input,
        accessTokenRef.current,
      );
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao editar item.");
        return;
      }
      const fresh = await fetchEventSetlist(activeEventId);
      setEventSetlist(fresh.setlist);
      void setCache(cacheSetlistKey(activeEventId), fresh.setlist);
      setEventsStatus("Item atualizado.");
    } catch {
      setEventsStatus("Erro de rede ao editar item.");
    }
  }

  async function handleCreateEvent(input: { title: string; dateTime: string; location?: string; address?: string; eventType?: string }) {
    setCreatingEvent(true);
    setEventsStatus("Criando evento...");
    try {
      const result = await createEvent(input, accessTokenRef.current);
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao criar evento.");
        return;
      }
      setEventsStatus(`Evento "${result.event?.title ?? ""}" criado.`);
      await loadEventsList();
    } catch {
      setEventsStatus("Erro de rede ao criar evento.");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleUpdateEvent(
    id: string,
    input: { title?: string; dateTime?: string; location?: string; address?: string; eventType?: string; status?: string },
  ) {
    setEventsStatus("Salvando alterações...");
    try {
      const result = await updateEvent(id, input, accessTokenRef.current);
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao atualizar evento.");
        return;
      }
      setEventsStatus(`Evento atualizado.`);
      await loadEventsList();
    } catch {
      setEventsStatus("Erro de rede ao atualizar evento.");
    }
  }

  async function handleDeleteEvent(id: string) {
    setEventsStatus("Excluindo evento...");
    try {
      const result = await deleteEvent(id, accessTokenRef.current);
      if (!result.ok) {
        setEventsStatus(result.message ?? "Falha ao excluir evento.");
        return;
      }
      setEventsStatus("Evento excluído.");
      if (activeEventId === id) {
        setActiveEventId(null);
        setEventSetlist(null);
      }
      await loadEventsList();
    } catch {
      setEventsStatus("Erro de rede ao excluir evento.");
    }
  }

  // ── Musician invite ──────────────────────────────────────────────────────────

  async function handleRespondInvite(accept: boolean) {
    if (!pendingInvite) return;
    const { slotId } = pendingInvite;
    setPendingInvite(null);
    try {
      await respondMusicianSlot(slotId, accept, accessTokenRef.current);
    } catch {
      // silently ignore — user already dismissed the modal
    }
  }

  async function loadMyInvites() {
    try {
      const result = await fetchMyInvites(accessTokenRef.current);
      if (result.ok) setPendingInvites(result.invites);
    } catch {
      // silently ignore
    }
  }

  async function respondToInvite(slotId: string, accept: boolean) {
    setPendingInvites((prev) => prev.filter((i) => i.slotId !== slotId));
    try {
      await respondMusicianSlot(slotId, accept, accessTokenRef.current);
    } catch {
      // recarrega para restaurar estado real em caso de erro
      void loadMyInvites();
    }
  }

  // ── Checklist ───────────────────────────────────────────────────────────────

  async function loadChecklist(eId: string) {
    if (loadingChecklist) return;

    const cleanEventId = eId.trim();
    if (!cleanEventId) {
      setStatusText("Informe um Event ID para carregar checklist.");
      return;
    }

    setStatusText("Carregando checklist...");
    setLoadingChecklist(true);
    try {
      const result = await fetchEventChecklist(cleanEventId);
      if (!result.ok) {
        setStatusText(result.message || "Falha ao carregar checklist.");
        return;
      }
      setEventChecklist(result.checklist);
      setStatusText("Checklist carregado.");
    } catch {
      setStatusText("Erro de rede ao carregar checklist.");
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function toggleChecklistItem(itemId: string, nextChecked: boolean) {
    if (updatingChecklistItemId || loadingChecklist) return;

    const cleanEventId = eventId.trim();
    if (!cleanEventId) {
      setStatusText("Informe um Event ID antes de atualizar itens.");
      return;
    }

    setStatusText("Atualizando item do checklist...");
    setUpdatingChecklistItemId(itemId);
    try {
      const result = await updateChecklistItem(
        cleanEventId,
        itemId,
        { checked: nextChecked, checkedByName: user?.name },
        accessTokenRef.current,
      );
      if (!result.ok) {
        setStatusText(result.message || "Falha ao atualizar item.");
        return;
      }
      await loadChecklist(cleanEventId);
      setStatusText("Checklist atualizado.");
    } catch {
      setStatusText("Erro de rede ao atualizar item.");
    } finally {
      setUpdatingChecklistItemId(null);
    }
  }

  // ── Songs ───────────────────────────────────────────────────────────────────

  async function loadSongPreview(content: string) {
    if (loadingSongPreview || loadingSongImport) return;

    const cleanContent = content.trim();
    if (!cleanContent) {
      setStatusText("Cole o conteúdo .txt antes do preview.");
      return;
    }

    setStatusText("Gerando preview da cifra...");
    setLoadingSongPreview(true);
    try {
      const result = await previewSongTxt(cleanContent, accessTokenRef.current);
      if (!result.ok || !result.parsed) {
        setStatusText(result.message || "Falha no preview da cifra.");
        return;
      }
      setSongPreview(result.parsed);
      setSongImportResult(null);
      setStatusText("Preview gerado com sucesso.");
    } catch {
      setStatusText("Erro de rede ao gerar preview da cifra.");
    } finally {
      setLoadingSongPreview(false);
    }
  }

  async function saveSongTxt(content: string) {
    if (loadingSongImport || loadingSongPreview) return;

    const cleanContent = content.trim();
    if (!cleanContent) {
      setStatusText("Cole o conteúdo .txt antes de salvar.");
      return;
    }

    setStatusText("Salvando cifra...");
    setLoadingSongImport(true);
    try {
      const result = await importSongTxt(cleanContent, accessTokenRef.current);
      if (!result.ok || !result.imported) {
        setStatusText(result.message || "Falha ao salvar cifra.");
        return;
      }
      setSongImportResult(result.imported);
      setStatusText(
        `Cifra salva: ${result.imported.songTitle} (v${result.imported.chartVersion})`,
      );
    } catch {
      setStatusText("Erro de rede ao salvar cifra.");
    } finally {
      setLoadingSongImport(false);
    }
  }

  // ── Value ───────────────────────────────────────────────────────────────────

  const value: SessionContextValue = {
    accessToken,
    user,
    loadingSession,
    isLoggedIn,
    statusText,
    login,
    logout,
    updateUser,
    pendingGoogleIdToken,
    completeGoogleProfile,
    events,
    loadingEvents,
    activeEventId,
    eventSetlist,
    loadingSetlist,
    reorderingId,
    eventsStatus,
    isOffline,
    creatingEvent,
    loadEventsList,
    selectEvent,
    moveSetlistItem,
    handleAddToSetlist,
    handleRemoveSetlistItem,
    handleUpdateSetlistItem,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    pendingInvite,
    setPendingInvite,
    handleRespondInvite,
    pendingInvites,
    loadMyInvites,
    respondToInvite,
    templates,
    eventId,
    setEventId,
    eventChecklist,
    loadingChecklist,
    updatingChecklistItemId,
    loadChecklist,
    toggleChecklistItem,
    songPreview,
    songImportResult,
    loadingSongPreview,
    loadingSongImport,
    loadSongPreview,
    saveSongTxt,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
