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

export default function EventChat({ eventId, currentUserId, currentUserName, isAdmin, members = [] }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 mt-6">
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
        <span className="text-lg font-semibold text-white">💬 Chat do Evento</span>
        <span className="text-xs text-zinc-400 ml-auto">atualiza a cada 10s</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-80 p-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-6">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.userId === currentUserId;
          const canDelete = isMine || isAdmin;
          return (
            <div key={msg.id} className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div
                className={`relative max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  msg.isPrivate
                    ? "bg-amber-900 text-amber-100 border border-amber-700"
                    : isMine
                    ? "bg-blue-700 text-white"
                    : "bg-zinc-700 text-zinc-100"
                }`}
              >
                {!isMine && (
                  <span className="block text-xs font-semibold text-zinc-300 mb-1">{msg.userName}</span>
                )}
                {msg.isPrivate && (
                  <span className="block text-xs text-amber-300 mb-0.5">
                    🔒 Privado {msg.toUserName ? `→ ${msg.toUserName}` : ""}
                  </span>
                )}
                {msg.text}
                {canDelete && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-5 h-5 bg-red-600 text-white rounded-full text-xs leading-none"
                    aria-label="Excluir mensagem"
                  >
                    ×
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-500 mt-0.5 px-1">
                {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-zinc-700 p-3 flex flex-col gap-2">
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="accent-amber-500"
            />
            Privado
          </label>
          {isPrivate && otherMembers.length > 0 && (
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-200"
            >
              <option value="">— Para quem? —</option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Mensagem como ${currentUserName}…`}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {sending ? "…" : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
