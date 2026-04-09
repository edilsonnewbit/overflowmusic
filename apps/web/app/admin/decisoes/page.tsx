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

  const eventTitle = decisions[0]?.event?.title ?? (eventId ? `Evento ${eventId}` : "—");
  const csvHref = eventId ? `/api/admin/decisoes/${eventId}/csv` : "#";

  return (
    <AuthGate>
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <Link href="/admin" className="text-zinc-400 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-bold text-emerald-400">📋 Decisões de Fé</h1>
            {eventTitle !== "—" && (
              <span className="text-zinc-400 text-sm">{eventTitle}</span>
            )}
            {eventId && (
              <a
                href={csvHref}
                download
                className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
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

          {loading && <p className="text-zinc-400 text-sm">Carregando...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && eventId && decisions.length === 0 && !error && (
            <p className="text-zinc-500 text-sm text-center py-10">Nenhuma decisão registrada para este evento.</p>
          )}

          {decisions.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-700">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-800 text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cidade</th>
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/60"}>
                      <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/${d.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          {d.whatsapp}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {d.decisionType ? (DECISION_TYPE_LABEL[d.decisionType] ?? d.decisionType) : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{d.city ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{d.church ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.acceptsContact ? "bg-emerald-900 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}>
                          {d.acceptsContact ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-[160px] truncate" title={d.notes ?? ""}>
                        {d.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-zinc-800 px-4 py-2 text-xs text-zinc-400 text-right">
                {decisions.length} decisão(ões) registrada(s)
              </div>
            </div>
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
