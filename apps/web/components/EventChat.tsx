"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  text: string;
  isPrivate: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  toUserId: string | null;
  toUserName: string | null;
};

type EventMember = {
  id: string;
  name: string;
};

type Props = {
  eventId: string;
  currentUserId: string;
  currentUserName: string;
  isAdmin?: boolean;
  members?: EventMember[];
};

const AVATAR_COLORS = [
  "#e57373","#f06292","#ba68c8","#7986cb",
  "#64b5f6","#4dd0e1","#81c784","aed581",
  "#ffb74d","#ff8a65",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#fff" />
    </svg>
  );
}

export default function EventChat({ eventId, currentUserId, currentUserName, isAdmin, members = [] }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [hoveringId, setHoveringId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/chat`);
      if (res.ok) {
        const data = await res.json();
        const msgs = Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : []);
        setMessages(msgs);
      }
    } catch {
      // silente — sem interrupção de UX para polling
    }
  }, [eventId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const body: Record<string, unknown> = { text: text.trim(), isPrivate };
      if (isPrivate && toUserId) body.toUserId = toUserId;
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d?.message ?? "Erro ao enviar.");
      } else {
        setText("");
        setIsPrivate(false);
        setToUserId("");
        await fetchMessages();
        inputRef.current?.focus();
      }
    } catch {
      setError("Falha na conexão.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(msgId: string) {
    if (!confirm("Excluir esta mensagem?")) return;
    await fetch(`/api/events/${eventId}/chat/${msgId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  const otherMembers = members.filter((m) => m.id !== currentUserId);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      borderRadius: 12,
      overflow: "hidden",
      height: 520,
      boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
    }}>
      {/* Header estilo WhatsApp */}
      <div style={{
        background: "#202c33",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid #2a3942",
        flexShrink: 0,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "#00a884",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          💬
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e9edef", fontSize: 15, fontWeight: 600 }}>Chat do Evento</div>
          <div style={{ color: "#8696a0", fontSize: 12 }}>atualiza a cada 10s</div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: "#0b141a",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182229' fill-opacity='0.5'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10C10 20 5.523 15.523 5.523 10H10z'/%3E%3C/g%3E%3C/svg%3E")`,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", margin: "auto", color: "#8696a0" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14 }}>Nenhuma mensagem ainda.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Seja o primeiro a escrever!</div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.userId === currentUserId;
          const canDelete = isMine || isAdmin;
          const prevMsg = messages[i - 1];
          const sameAsPrev = prevMsg?.userId === msg.userId;

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isMine ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 6,
                marginTop: sameAsPrev ? 2 : 10,
                paddingLeft: isMine ? 40 : 0,
                paddingRight: isMine ? 0 : 40,
              }}
            >
              {/* Avatar (apenas para outros, apenas quando muda de remetente) */}
              {!isMine && (
                <div style={{ width: 30, flexShrink: 0, alignSelf: "flex-end" }}>
                  {!sameAsPrev ? (
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: getAvatarColor(msg.userName),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#fff", userSelect: "none",
                    }}>
                      {getInitials(msg.userName)}
                    </div>
                  ) : <div style={{ width: 30 }} />}
                </div>
              )}

              {/* Balão */}
              <div
                style={{ maxWidth: "72%", position: "relative" }}
                onMouseEnter={() => setHoveringId(msg.id)}
                onMouseLeave={() => setHoveringId(null)}
              >
                <div style={{
                  background: msg.isPrivate
                    ? "#2d1e00"
                    : isMine
                    ? "#005c4b"
                    : "#202c33",
                  borderRadius: isMine ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
                  padding: "6px 10px 22px 10px",
                  position: "relative",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  border: msg.isPrivate ? "1px solid #5c3600" : "none",
                  minWidth: 80,
                }}>
                  {/* Nome do remetente (apenas outros, primeira da sequência) */}
                  {!isMine && !sameAsPrev && (
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: getAvatarColor(msg.userName),
                      marginBottom: 3,
                    }}>
                      {msg.userName}
                    </div>
                  )}

                  {/* Badge privado */}
                  {msg.isPrivate && (
                    <div style={{ fontSize: 11, color: "#d4a000", marginBottom: 3 }}>
                      🔒 Privado{msg.toUserName ? ` → ${msg.toUserName}` : ""}
                    </div>
                  )}

                  {/* Texto */}
                  <div style={{
                    fontSize: 14, color: "#e9edef",
                    lineHeight: 1.45, wordBreak: "break-word",
                  }}>
                    {msg.text}
                  </div>

                  {/* Hora dentro do balão */}
                  <div style={{
                    position: "absolute", bottom: 5, right: 8,
                    fontSize: 11, color: "#8696a0",
                    whiteSpace: "nowrap",
                  }}>
                    {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Botão excluir (hover) */}
                {canDelete && hoveringId === msg.id && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    style={{
                      position: "absolute", top: -8,
                      right: isMine ? -8 : undefined,
                      left: isMine ? undefined : -8,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#ef4444", border: "none",
                      color: "#fff", fontSize: 14, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1, padding: 0, zIndex: 1,
                    }}
                    aria-label="Excluir mensagem"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Barra de entrada */}
      <div style={{
        background: "#202c33",
        padding: "8px 12px",
        borderTop: "1px solid #2a3942",
        flexShrink: 0,
      }}>
        {error && (
          <div style={{ color: "#f87171", fontSize: 12, marginBottom: 4 }}>{error}</div>
        )}

        {/* Linha privado + destinatário */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "#8696a0", cursor: "pointer", userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ accentColor: "#d4a000", width: 14, height: 14 }}
            />
            🔒 Privado
          </label>
          {isPrivate && otherMembers.length > 0 && (
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              style={{
                background: "#2a3942", border: "1px solid #374045",
                borderRadius: 6, padding: "2px 8px",
                fontSize: 12, color: "#e9edef", outline: "none",
              }}
            >
              <option value="">— Para quem? —</option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Input + botão enviar */}
        <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem"
            maxLength={1000}
            style={{
              flex: 1,
              background: "#2a3942",
              border: "none",
              borderRadius: 20,
              padding: "10px 16px",
              fontSize: 14,
              color: "#e9edef",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Enviar"
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: (sending || !text.trim()) ? "#2a3942" : "#00a884",
              border: "none",
              cursor: (sending || !text.trim()) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
              opacity: (sending || !text.trim()) ? 0.5 : 1,
            }}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
}
