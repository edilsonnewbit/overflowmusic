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

const DECISION_TYPE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  PRIMEIRA_VEZ: { bg: "bg-emerald-950", text: "text-emerald-300", border: "border-emerald-700" },
  RECONSAGRACAO: { bg: "bg-blue-950", text: "text-blue-300", border: "border-blue-700" },
  BATISMO: { bg: "bg-violet-950", text: "text-violet-300", border: "border-violet-700" },
  OUTRO: { bg: "bg-zinc-800", text: "text-zinc-300", border: "border-zinc-600" },
};

const CHURCH_HELP_LABEL: Record<string, string> = {
  WANTS_CHURCH: "Quer indicação de igreja",
  HAS_CHURCH: "Já tem igreja",
  UNDECIDED: "Indefinido",
};

function formatWhatsApp(raw: string) {
  const digits = raw.replace(/\D/g, "");
  // Adiciona 55 se necessário para link wa.me
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return { digits, international };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${color} min-w-[80px]`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

function DecisionCard({ d }: { d: Decision }) {
  const typeColor = d.decisionType ? (DECISION_TYPE_COLOR[d.decisionType] ?? DECISION_TYPE_COLOR.OUTRO) : DECISION_TYPE_COLOR.OUTRO;
  const typeLabel = d.decisionType ? (DECISION_TYPE_LABEL[d.decisionType] ?? d.decisionType) : "—";
  const { international } = formatWhatsApp(d.whatsapp);
  const waUrl = `https://wa.me/${international}`;
  const churchHelpLabel = d.churchHelp ? (CHURCH_HELP_LABEL[d.churchHelp] ?? d.churchHelp) : null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-500 transition-colors">
      {/* Cabeçalho: nome + tipo + data */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Avatar inicial */}
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {d.name.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold text-base leading-tight">{d.name}</p>
            <p className="text-zinc-400 text-xs mt-0.5">{formatDate(d.createdAt)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
          {typeLabel}
        </span>
      </div>

      {/* Linha: WhatsApp + Cidade + Igreja */}
      <div className="flex flex-wrap gap-2 items-center">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-green-900 hover:bg-green-800 border border-green-700 text-green-300 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.1 1.509 5.824L.057 23.625a.75.75 0 00.92.92l5.8-1.452A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.86 0-3.607-.5-5.12-1.376l-.366-.217-3.44.861.861-3.44-.217-.366A9.965 9.965 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          {d.whatsapp}
        </a>
        {d.city && (
          <span className="text-zinc-300 text-sm bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">
            📍 {d.city}
          </span>
        )}
        {d.church && (
          <span className="text-zinc-300 text-sm bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">
            ⛪ {d.church}
          </span>
        )}
      </div>

      {/* Linha: infos extras */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        {/* Aceita contato */}
        <span className={`px-2.5 py-1 rounded-full font-semibold border ${d.acceptsContact ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
          {d.acceptsContact ? "✓ Aceita contato" : "✗ Sem contato"}
        </span>

        {/* Quer oração */}
        {d.wantsPrayer === true && (
          <span className="px-2.5 py-1 rounded-full font-semibold border bg-amber-950 text-amber-300 border-amber-800">
            🙏 Quer oração
          </span>
        )}

        {/* Conexão com igreja */}
        {churchHelpLabel && (
          <span className="px-2.5 py-1 rounded-full font-semibold border bg-zinc-800 text-zinc-300 border-zinc-700">
            {d.churchHelp === "WANTS_CHURCH" ? "🏠 " : d.churchHelp === "HAS_CHURCH" ? "✓ " : ""}
            {churchHelpLabel}
          </span>
        )}
      </div>

      {/* Como soube */}
      {d.howDidYouHear && (
        <div className="text-xs text-zinc-400 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
          <span className="text-zinc-500 mr-1">Como soube:</span>
          <span className="text-zinc-300">{d.howDidYouHear}</span>
        </div>
      )}

      {/* Observações */}
      {d.notes && (
        <div className="text-xs text-zinc-400 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
          <span className="text-zinc-500 mr-1">Obs:</span>
          <span className="text-zinc-300">{d.notes}</span>
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
      .then((d) => {
        setDecisions(d.decisions ?? d ?? []);
      })
      .catch(() => setError("Erro ao carregar decisões."))
      .finally(() => setLoading(false));
  }, [eventId]);

  const eventTitle = decisions[0]?.event?.title ?? (eventId ? "" : "—");
  const csvHref = eventId ? `/api/admin/decisoes/${eventId}/csv` : "#";

  // Stats por tipo
  const byType = decisions.reduce<Record<string, number>>((acc, d) => {
    const k = d.decisionType ?? "OUTRO";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const wantPrayer = decisions.filter((d) => d.wantsPrayer === true).length;
  const acceptContact = decisions.filter((d) => d.acceptsContact).length;
  const wantChurch = decisions.filter((d) => d.churchHelp === "WANTS_CHURCH").length;

  return (
    <AuthGate>
      <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Link href="/admin" className="text-zinc-400 hover:text-white text-sm flex items-center gap-1">
              ← Admin
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-emerald-400">Decisões de Fé</h1>
              {eventTitle && <p className="text-zinc-400 text-sm mt-0.5 truncate">{eventTitle}</p>}
            </div>
            {eventId && (
              <a
                href={csvHref}
                download
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                ⬇ Exportar CSV
              </a>
            )}
          </div>

          {!eventId && (
            <div className="bg-zinc-800 rounded-xl p-6 text-zinc-400 text-sm">
              Acesse esta página a partir de um evento: <code className="text-zinc-300">/admin/decisoes?eventId=…</code>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && eventId && decisions.length === 0 && !error && (
            <div className="text-zinc-500 text-sm text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
              Nenhuma decisão registrada para este evento.
            </div>
          )}

          {decisions.length > 0 && (
            <>
              {/* Stats */}
              <div className="flex flex-wrap gap-3 mb-6">
                <StatBadge label="Total" count={decisions.length} color="border-zinc-600 text-zinc-200" />
                {byType.PRIMEIRA_VEZ ? <StatBadge label="Primeira vez" count={byType.PRIMEIRA_VEZ} color="border-emerald-700 text-emerald-300" /> : null}
                {byType.RECONSAGRACAO ? <StatBadge label="Reconsagração" count={byType.RECONSAGRACAO} color="border-blue-700 text-blue-300" /> : null}
                {byType.BATISMO ? <StatBadge label="Batismo" count={byType.BATISMO} color="border-violet-700 text-violet-300" /> : null}
                {byType.OUTRO ? <StatBadge label="Outro" count={byType.OUTRO} color="border-zinc-600 text-zinc-400" /> : null}
                {wantPrayer > 0 && <StatBadge label="Quer oração" count={wantPrayer} color="border-amber-700 text-amber-300" />}
                {wantChurch > 0 && <StatBadge label="Quer Igreja" count={wantChurch} color="border-sky-700 text-sky-300" />}
                {acceptContact > 0 && <StatBadge label="Aceita contato" count={acceptContact} color="border-teal-700 text-teal-300" />}
              </div>

              {/* Cards */}
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {decisions.map((d) => (
                  <DecisionCard key={d.id} d={d} />
                ))}
              </div>

              <p className="text-zinc-600 text-xs text-right mt-4">
                {decisions.length} decisão(ões) registrada(s)
              </p>
            </>
          )}
        </div>
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
