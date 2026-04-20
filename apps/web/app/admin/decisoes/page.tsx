"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";

type Decision = {
  id: string;
  name: string;
  whatsapp: string;
  city: string | null;
  church: string | null;
  decisionType: string | null;
  howDidYouHear: string | null;
  acceptsContact: boolean;
  churchHelp: string | null;
  wantsPrayer: boolean | null;
  notes: string | null;
  createdAt: string;
  event?: { id: string; title: string; slug?: string | null };
};

const DECISION_TYPE_LABEL: Record<string, string> = {
  PRIMEIRA_VEZ: "Primeira vez",
  RECONSAGRACAO: "Reconsagração",
  BATISMO: "Batismo",
  OUTRO: "Outro",
};

const DECISION_TYPE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  PRIMEIRA_VEZ: { bg: "#052e16", color: "#86efac", border: "#166534" },
  RECONSAGRACAO: { bg: "#172554", color: "#93c5fd", border: "#1e40af" },
  BATISMO: { bg: "#2e1065", color: "#c4b5fd", border: "#6d28d9" },
  OUTRO: { bg: "#27272a", color: "#a1a1aa", border: "#52525b" },
};

const CHURCH_HELP_LABEL: Record<string, string> = {
  WANTS_CHURCH: "Quer indicação de igreja",
  HAS_CHURCH: "Já tem igreja",
  UNDECIDED: "Indefinido",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatWhatsApp(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
}

function DecisionCard({ d }: { d: Decision }) {
  const typeStyle = d.decisionType
    ? (DECISION_TYPE_STYLE[d.decisionType] ?? DECISION_TYPE_STYLE.OUTRO)
    : DECISION_TYPE_STYLE.OUTRO;
  const typeLabel = d.decisionType ? (DECISION_TYPE_LABEL[d.decisionType] ?? d.decisionType) : null;
  const waUrl = formatWhatsApp(d.whatsapp);
  const churchHelpLabel = d.churchHelp ? (CHURCH_HELP_LABEL[d.churchHelp] ?? d.churchHelp) : null;

  return (
    <div style={{
      background: "#18181b",
      border: "1px solid #3f3f46",
      borderRadius: 16,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#3f3f46", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#fff", fontWeight: 700,
            fontSize: 16, flexShrink: 0,
          }}>
            {d.name.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>{d.name}</p>
            <p style={{ color: "#71717a", fontSize: 12, margin: "2px 0 0" }}>{formatDate(d.createdAt)}</p>
          </div>
        </div>
        {typeLabel && (
          <span style={{
            padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: typeStyle.bg, color: typeStyle.color,
            border: `1px solid ${typeStyle.border}`, whiteSpace: "nowrap",
          }}>
            {typeLabel}
          </span>
        )}
      </div>

      {/* WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#052e16", border: "1px solid #166534",
          borderRadius: 10, padding: "8px 12px", textDecoration: "none",
          color: "#4ade80", fontWeight: 600, fontSize: 14,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0 }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.523 3.66 1.438 5.168L2.05 21.95a.75.75 0 00.916.916l4.782-1.388A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.073-1.117l-.292-.173-3.032.879.879-3.032-.173-.292A7.95 7.95 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
        </svg>
        {d.whatsapp}
      </a>

      {/* Cidade + Igreja */}
      {(d.city || d.church) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {d.city && (
            <span style={{ fontSize: 12, color: "#a1a1aa", background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "3px 8px" }}>
              📍 {d.city}
            </span>
          )}
          {d.church && (
            <span style={{ fontSize: 12, color: "#a1a1aa", background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "3px 8px" }}>
              ⛪ {d.church}
            </span>
          )}
        </div>
      )}

      {/* Badges de status */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
          background: d.acceptsContact ? "#052e16" : "#27272a",
          color: d.acceptsContact ? "#86efac" : "#71717a",
          border: `1px solid ${d.acceptsContact ? "#166534" : "#52525b"}`,
        }}>
          {d.acceptsContact ? "✓ Aceita contato" : "Sem contato"}
        </span>

        {d.wantsPrayer === true && (
          <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px", background: "#451a03", color: "#fcd34d", border: "1px solid #92400e" }}>
            🙏 Quer oração
          </span>
        )}

        {churchHelpLabel && (
          <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "3px 10px", background: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46" }}>
            {d.churchHelp === "WANTS_CHURCH" ? "🏠 " : ""}{churchHelpLabel}
          </span>
        )}
      </div>

      {/* Como soube */}
      {d.howDidYouHear && (
        <div style={{ fontSize: 12, background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ color: "#71717a" }}>Como soube: </span>
          <span style={{ color: "#d4d4d8" }}>{d.howDidYouHear}</span>
        </div>
      )}

      {/* Observações */}
      {d.notes && (
        <div style={{ fontSize: 12, background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ color: "#71717a" }}>Obs: </span>
          <span style={{ color: "#d4d4d8" }}>{d.notes}</span>
        </div>
      )}
    </div>
  );
}

function AdminDecisoesContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin/decisoes/${eventId}`)
      .then((r) => r.json())
      .then((d) => setDecisions(d.decisions ?? d ?? []))
      .catch(() => setError("Erro ao carregar decisões."))
      .finally(() => setLoading(false));
  }, [eventId]);

  const eventTitle = decisions[0]?.event?.title ?? "";
  const csvHref = eventId ? `/api/admin/decisoes/${eventId}/csv` : "#";

  const byType = decisions.reduce<Record<string, number>>((acc, d) => {
    const k = d.decisionType ?? "OUTRO";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const wantPrayer = decisions.filter((d) => d.wantsPrayer === true).length;
  const acceptContact = decisions.filter((d) => d.acceptsContact).length;
  const wantChurch = decisions.filter((d) => d.churchHelp === "WANTS_CHURCH").length;

  const stats = [
    { label: "Total", count: decisions.length, bg: "#18181b", color: "#fff", border: "#3f3f46" },
    ...(byType.PRIMEIRA_VEZ ? [{ label: "Primeira vez", count: byType.PRIMEIRA_VEZ, bg: "#052e16", color: "#86efac", border: "#166534" }] : []),
    ...(byType.RECONSAGRACAO ? [{ label: "Reconsagração", count: byType.RECONSAGRACAO, bg: "#172554", color: "#93c5fd", border: "#1e40af" }] : []),
    ...(byType.BATISMO ? [{ label: "Batismo", count: byType.BATISMO, bg: "#2e1065", color: "#c4b5fd", border: "#6d28d9" }] : []),
    ...(byType.OUTRO ? [{ label: "Outro", count: byType.OUTRO, bg: "#27272a", color: "#a1a1aa", border: "#52525b" }] : []),
    ...(wantPrayer ? [{ label: "Quer oração", count: wantPrayer, bg: "#451a03", color: "#fcd34d", border: "#92400e" }] : []),
    ...(wantChurch ? [{ label: "Quer Igreja", count: wantChurch, bg: "#0c1a2e", color: "#7dd3fc", border: "#0369a1" }] : []),
    ...(acceptContact ? [{ label: "Aceita contato", count: acceptContact, bg: "#052e16", color: "#4ade80", border: "#15803d" }] : []),
  ];

  return (
    <AuthGate>
      <main style={{ minHeight: "100vh", background: "#09090b", color: "#fff", padding: "24px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <Link href="/admin" style={{ color: "#71717a", fontSize: 13, textDecoration: "none" }}>
              ← Admin
            </Link>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", margin: 0 }}>Decisões de Fé</h1>
              {eventTitle && <p style={{ color: "#71717a", fontSize: 13, margin: "2px 0 0" }}>{eventTitle}</p>}
            </div>
            {eventId && (
              <a
                href={csvHref}
                download
                style={{
                  background: "#27272a", border: "1px solid #3f3f46", color: "#fff",
                  fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10,
                  textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                ⬇ Exportar CSV
              </a>
            )}
          </div>

          {!eventId && (
            <div style={{ background: "#27272a", borderRadius: 12, padding: 24, color: "#71717a", fontSize: 13 }}>
              Acesse esta página a partir de um evento:{" "}
              <code style={{ color: "#d4d4d8" }}>/admin/decisoes?eventId=…</code>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <div style={{
                width: 32, height: 32, border: "3px solid #4ade80",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          )}

          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

          {!loading && eventId && decisions.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: 60, color: "#52525b", background: "#18181b", borderRadius: 16, border: "1px solid #27272a" }}>
              Nenhuma decisão registrada para este evento.
            </div>
          )}

          {decisions.length > 0 && (
            <>
              {/* Stats */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                {stats.map((s) => (
                  <div key={s.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "10px 16px", borderRadius: 12, minWidth: 72,
                    background: s.bg, border: `1px solid ${s.border}`,
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
                    <span style={{ fontSize: 11, color: s.color, opacity: 0.85, textAlign: "center", marginTop: 2, lineHeight: 1.3 }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Cards grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: 16,
              }}>
                {decisions.map((d) => <DecisionCard key={d.id} d={d} />)}
              </div>

              <p style={{ color: "#52525b", fontSize: 12, textAlign: "right", marginTop: 16 }}>
                {decisions.length} decisão(ões) registrada(s)
              </p>
            </>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </AuthGate>
  );
}

export default function AdminDecisoesPage() {
  return (
    <Suspense fallback={null}>
      <AdminDecisoesContent />
    </Suspense>
  );
}
