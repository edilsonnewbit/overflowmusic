"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useMultitrackEngine } from "@/app/events/[eventId]/multitrack/useMultitrackEngine";
import { TrackStrip } from "@/app/events/[eventId]/multitrack/TrackStrip";
import { TransportBar } from "@/app/events/[eventId]/multitrack/TransportBar";
import { AuthRequired } from "@/components/AuthRequired";
import { useAuth } from "@/components/AuthProvider";
import { canSeeSongsPage, canSeeFullSongDetail, canManageSongs } from "@/lib/permissions";
import type { Song, SongSectionLine, SongTrack, TrackType } from "@/lib/types";

// ── Tabernáculo de Moisés — 5 zonas de louvor ───────────────────────────────
const TABERNACLE_ZONES = [
  { value: "Z1", label: "Z1 — Átrios", description: "Graças, abertura • Reconhecimento de Jesus, gratidão pelo que Ele fez" },
  { value: "Z2", label: "Z2 — Altar", description: "Entrega, rendição, clamor • 'Vem Espírito Santo', 'Toma tudo', 'Me rendo'" },
  { value: "Z3", label: "Z3 — Santo Lugar", description: "Exaltação, resposta • 'Tu és tudo', honra, 'Eu bendirei ao Senhor'" },
  { value: "Z4", label: "Z4 — Santuário (Intimidade)", description: "Intimidade, suave • Susurro perante Deus, contemplação" },
  { value: "Z5", label: "Z5 — Santuário (Alegria)", description: "Alegria, dança, liberdade • Celebração na presença de Deus" },
];

// ── Helpers: converter URL do usuário para URL de embed ─────────────────────

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1).split("?")[0] ?? null;
    } else if (u.hostname.includes("youtube.com")) {
      id = u.searchParams.get("v") ?? u.pathname.split("/embed/")[1]?.split("?")[0] ?? null;
    }
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
  } catch { return null; }
}

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    const path = u.pathname.replace("/intl-pt/", "/");
    return `https://open.spotify.com/embed${path}?utm_source=generator`;
  } catch { return null; }
}

function getDriveEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("drive.google.com")) return null;
    const match = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = match?.[1];
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  } catch { return null; }
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function SongDetailPage({ params }: { params: Promise<{ songId: string }> }) {
  return (
    <AuthRequired>
      <SongDetailContent params={params} />
    </AuthRequired>
  );
}

function SongDetailContent({ params }: { params: Promise<{ songId: string }> }) {
  const { user } = useAuth();
  const canManage = user ? canManageSongs(user) : false;
  const fullDetail = user ? canSeeFullSongDetail(user) : false;
  // MIDIA/DANCA: veem apenas players (Spotify/YouTube/Drive)
  const simplified = user ? (!fullDetail && canSeeSongsPage(user)) : false;

  const [songId, setSongId] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [zoneEdit, setZoneEdit] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [zoneSaveMsg, setZoneSaveMsg] = useState("");
  const [urlsEditOpen, setUrlsEditOpen] = useState(false);
  const [urlYoutube, setUrlYoutube] = useState("");
  const [urlSpotify, setUrlSpotify] = useState("");
  const [urlDrive, setUrlDrive] = useState("");
  const [savingUrls, setSavingUrls] = useState(false);
  const [urlsSaveMsg, setUrlsSaveMsg] = useState("");

  // multitrack tracks
  const [tracks, setTracks] = useState<SongTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [newTrackType, setNewTrackType] = useState<TrackType>("CLICK");
  const [newTrackLabel, setNewTrackLabel] = useState("");
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackMsg, setTrackMsg] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [importingFolder, setImportingFolder] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [multiLinks, setMultiLinks] = useState("");
  const [importingLinks, setImportingLinks] = useState(false);
  const [linksMsg, setLinksMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"cifra" | "vs" | "players" | "faixas">("cifra");
  const vsLoadedRef = useRef(false);
  const engine = useMultitrackEngine();

  useEffect(() => {
    void params.then((p) => setSongId(p.songId));
  }, [params]);

  useEffect(() => {
    if (!songId) return;
    void loadSong(songId);
    void loadTracks(songId);
  }, [songId]);

  useEffect(() => {
    if (!song) return;
    setUrlYoutube(song.youtubeUrl ?? "");
    setUrlSpotify(song.spotifyUrl ?? "");
    setUrlDrive(song.driveUrl ?? "");
  }, [song]);

  // Carrega o engine VS quando a aba VS é ativada e as faixas estão prontas
  useEffect(() => {
    if (activeTab !== "vs" || tracks.length === 0) return;
    if (vsLoadedRef.current) return;
    vsLoadedRef.current = true;
    void engine.loadSong(tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tracks.length]);

  // Reseta o flag ao trocar de aba para recarregar se as faixas mudarem
  useEffect(() => {
    if (activeTab !== "vs") vsLoadedRef.current = false;
  }, [activeTab]);

  async function loadSong(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${id}`);
      const body = (await res.json()) as { ok: boolean; song?: Song; message?: string };
      if (!body.ok || !body.song) throw new Error(body.message || "Música não encontrada.");
      setSong(body.song);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar música.");
    } finally {
      setLoading(false);
    }
  }

  async function saveZone() {
    if (!songId || zoneEdit === null) return;
    setSavingZone(true);
    setZoneSaveMsg("");
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone: zoneEdit || null }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao salvar.");
      setZoneSaveMsg("Zona salva.");
      setZoneEdit(null);
      await loadSong(songId);
    } catch (e) {
      setZoneSaveMsg(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSavingZone(false);
    }
  }

  async function saveUrls() {
    if (!songId) return;
    setSavingUrls(true);
    setUrlsSaveMsg("");
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: urlYoutube.trim() || null,
          spotifyUrl: urlSpotify.trim() || null,
          driveUrl: urlDrive.trim() || null,
        }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao salvar.");
      setUrlsSaveMsg("Links salvos.");
      setUrlsEditOpen(false);
      await loadSong(songId);
    } catch (e) {
      setUrlsSaveMsg(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSavingUrls(false);
    }
  }

  async function loadTracks(id: string) {
    setTracksLoading(true);
    try {
      const res = await fetch(`/api/songs/${id}/tracks`);
      const body = (await res.json()) as { ok: boolean; tracks?: SongTrack[] };
      setTracks(body.tracks ?? []);
    } finally {
      setTracksLoading(false);
    }
  }

  function extractDriveFileId(url: string): string | null {
    try {
      const match = url.match(/\/file\/d\/([^/]+)/);
      return match?.[1] ?? null;
    } catch { return null; }
  }

  async function addTrack() {
    if (!songId || !newTrackUrl.trim()) return;
    const driveFileId = extractDriveFileId(newTrackUrl.trim());
    if (!driveFileId) {
      setTrackMsg("URL inválida. Use um link do Google Drive no formato: drive.google.com/file/d/.../view");
      return;
    }
    setAddingTrack(true);
    setTrackMsg("");
    try {
      const res = await fetch(`/api/songs/${songId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newTrackLabel.trim() || newTrackType,
          trackType: newTrackType,
          driveFileId,
          driveUrl: newTrackUrl.trim(),
          order: tracks.length + 1,
        }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao adicionar faixa.");
      setNewTrackLabel("");
      setNewTrackUrl("");
      setTrackMsg("Faixa adicionada.");
      await loadTracks(songId);
    } catch (e) {
      setTrackMsg(e instanceof Error ? e.message : "Erro ao adicionar.");
    } finally {
      setAddingTrack(false);
    }
  }

  async function deleteTrack(trackId: string) {
    if (!songId) return;
    try {
      await fetch(`/api/songs/${songId}/tracks?trackId=${trackId}`, { method: "DELETE" });
      await loadTracks(songId);
    } catch {
      setTrackMsg("Erro ao remover faixa.");
    }
  }

  async function importFolder() {
    if (!songId || !folderUrl.trim()) return;
    setImportingFolder(true);
    setImportMsg("");
    try {
      const res = await fetch(`/api/songs/${songId}/tracks/import-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: folderUrl.trim() }),
      });
      const body = (await res.json()) as { ok: boolean; imported?: number; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao importar.");
      setImportMsg(`${body.imported ?? 0} faixa(s) importada(s) com sucesso.`);
      setFolderUrl("");
      await loadTracks(songId);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setImportingFolder(false);
    }
  }

  async function importMultiLinks() {
    if (!songId || !multiLinks.trim()) return;
    setImportingLinks(true);
    setLinksMsg("");
    try {
      // Accept links separated by newlines, commas, or spaces
      const lines = multiLinks.split(/[\n,\s]+/).map((l) => l.trim()).filter(Boolean);
      const files: Array<{ fileId: string; name: string }> = [];
      for (const line of lines) {
        const match = line.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          // Use the URL path after the last / as a provisional name; user can rename later
          files.push({ fileId: match[1], name: match[1] });
        }
      }
      if (files.length === 0) {
        setLinksMsg("Nenhum link válido do Drive encontrado. Use links no formato drive.google.com/file/d/.../view");
        return;
      }
      const res = await fetch(`/api/songs/${songId}/tracks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const body = (await res.json()) as { ok: boolean; imported?: number; message?: string };
      if (!body.ok) throw new Error(body.message || "Erro ao salvar.");
      setLinksMsg(`${body.imported ?? 0} faixa(s) importada(s). Renomeie os labels conforme necessário.`);
      setMultiLinks("");
      await loadTracks(songId);
    } catch (e) {
      setLinksMsg(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setImportingLinks(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <p style={{ color: "#b3c6e0" }}>Carregando...</p>
      </main>
    );
  }

  if (error || !song) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>
        <p style={{ color: "#f87171", marginTop: 16 }}>{error || "Música não encontrada."}</p>
      </main>
    );
  }

  const chart = song.chordCharts[activeChartIndex] ?? null;
  const parsed = chart?.parsedJson ?? null;
  const meta = parsed?.metadata;

  return (
    <main style={{ minHeight: "100vh", padding: "24px 24px 48px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* nav */}
        <Link href="/songs" style={backLinkStyle}>← Músicas</Link>

        {/* song header */}
        <div style={headerBoxStyle}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28 }}>{song.title}</h1>
          {song.artist && <p style={{ margin: 0, color: "#b3c6e0", fontSize: 15 }}>{song.artist}</p>}

          {/* meta pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            {song.defaultKey && <MetaPill label="Tom" value={song.defaultKey} />}
            {meta?.suggestedKey && meta.suggestedKey !== song.defaultKey && (
              <MetaPill label="Tom cifra" value={meta.suggestedKey} />
            )}
            {meta?.bpm && <MetaPill label="BPM" value={String(meta.bpm)} />}
            {meta?.capo && <MetaPill label="Capo" value={String(meta.capo)} />}
            {song.zone && (
              <MetaPill label="Zona" value={TABERNACLE_ZONES.find((z) => z.value === song.zone)?.label ?? song.zone} />
            )}
          </div>

          {/* zone editor — apenas para quem gerencia */}
          {canManage && (
            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {zoneEdit === null ? (
                <button onClick={() => setZoneEdit(song.zone ?? "")} style={zoneEditBtnStyle}>
                  {song.zone ? "✏ Alterar zona" : "+ Definir zona (Tabernaculo)"}
                </button>
              ) : (
                <>
                  <select
                    value={zoneEdit}
                    onChange={(e) => setZoneEdit(e.target.value)}
                    disabled={savingZone}
                    style={zoneSelectStyle}
                    title={TABERNACLE_ZONES.find((z) => z.value === zoneEdit)?.description ?? ""}
                  >
                    <option value="">Sem zona</option>
                    {TABERNACLE_ZONES.map((z) => (
                      <option key={z.value} value={z.value} title={z.description}>{z.label}</option>
                    ))}
                  </select>
                  <button onClick={() => void saveZone()} disabled={savingZone} style={zoneSaveBtnStyle}>
                    {savingZone ? "..." : "Salvar"}
                  </button>
                  <button onClick={() => { setZoneEdit(null); setZoneSaveMsg(""); }} disabled={savingZone} style={zoneCancelBtnStyle}>
                    Cancelar
                  </button>
                </>
              )}
              {zoneSaveMsg && <span style={{ fontSize: 12, color: "#7cf2a2" }}>{zoneSaveMsg}</span>}
            </div>
          )}
        </div>

        {/* ── Abas ──────────────────────────────────────────────────────── */}
        {simplified ? (
          /* View simplificada: apenas Players */
          <div style={tabBarStyle}>
            <TabButton id="players" label="Players" active={activeTab} onClick={setActiveTab} />
          </div>
        ) : (
          <div style={tabBarStyle}>
            <TabButton id="cifra"   label="Cifra"       active={activeTab} onClick={setActiveTab} />
            <TabButton id="vs"      label="VS ao Vivo"  active={activeTab} onClick={setActiveTab} badge={tracks.length > 0 ? String(tracks.length) : undefined} />
            <TabButton id="players" label="Players"     active={activeTab} onClick={setActiveTab} />
            <TabButton id="faixas"  label="Faixas"      active={activeTab} onClick={setActiveTab} />
          </div>
        )}

        {/* ── Conteúdo: Cifra ───────────────────────────────────────────── */}
        {activeTab === "cifra" && (
          <div>
            {/* chart version selector */}
            {song.chordCharts.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {song.chordCharts.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChartIndex(i)}
                    style={versionBtnStyle(i === activeChartIndex)}
                  >
                    v{c.version}
                  </button>
                ))}
              </div>
            )}

            {!chart && (
              <p style={{ color: "#b3c6e0" }}>Nenhuma cifra disponível para esta música.</p>
            )}

            {chart && parsed && (
              <div style={chartContainerStyle}>
                {parsed.sections.map((section, si) => (
                  <div key={si} style={{ marginBottom: 28 }}>
                    <p style={sectionNameStyle}>[{section.name}]</p>
                    {section.lines.map((line, li) => (
                      <pre key={li} style={lineStyle(line.type)}>
                        {line.content || " "}
                      </pre>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {chart && !parsed && chart.rawText && (
              <pre style={{ ...chartContainerStyle, whiteSpace: "pre-wrap", color: "#d6e5f8", fontSize: 14 }}>
                {chart.rawText}
              </pre>
            )}

            {parsed && Object.keys(parsed.chordDictionary).length > 0 && (
              <div style={dictBoxStyle}>
                <p style={sectionNameStyle}>Dicionário de Acordes</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {Object.entries(parsed.chordDictionary).map(([chord, fingering]) => (
                    <div key={chord} style={chordDictItemStyle}>
                      <span style={{ color: "#7cf2a2", fontWeight: 700 }}>{chord}</span>
                      <span style={{ color: "#b3c6e0", marginLeft: 6, fontSize: 12 }}>{fingering}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canManage && (
              <div style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <Link href="/songs/import" style={importLinkStyle}>
                  + Importar nova versão
                </Link>
                {chart && song && (
                  <Link
                    href={`/songs/${song.id}/charts/${chart.id}/edit`}
                    style={{ ...importLinkStyle, borderColor: "#fbbf24", color: "#fbbf24" }}
                  >
                    ✏ Editar cifra v{chart.version}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Conteúdo: VS ao Vivo — apenas para acesso completo ───────── */}
        {activeTab === "vs" && fullDetail && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#0b1623", border: "1px solid #1e2d3d", borderRadius: 14, overflow: "hidden" }}>
            {tracksLoading && (
              <div style={{ padding: 32, textAlign: "center", color: "#7a94b0" }}>Carregando faixas...</div>
            )}
            {!tracksLoading && tracks.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <p style={{ color: "#475569", marginBottom: 8 }}>Nenhuma faixa cadastrada para esta música.</p>
                <button onClick={() => setActiveTab("faixas")} style={zoneEditBtnStyle}>
                  + Adicionar faixas na aba Faixas
                </button>
              </div>
            )}
            {!tracksLoading && tracks.length > 0 && (
              <>
                {/* Track strips */}
                <div style={{ padding: "8px 0" }}>
                  {engine.isLoading && (
                    <div style={{ padding: "16px 20px", color: "#7a94b0", fontSize: 13 }}>
                      <span style={{ marginRight: 8 }}>⏳</span>Carregando áudio...
                    </div>
                  )}
                  {engine.tracks.map((track) => (
                    <TrackStrip
                      key={track.id}
                      track={track}
                      isPlaying={engine.isPlaying}
                      onVolumeChange={(v) => engine.setVolume(track.id, v)}
                      onPanChange={(v) => engine.setPan(track.id, v)}
                      onMuteToggle={() => engine.toggleMute(track.id)}
                    />
                  ))}
                </div>
                {/* Transport */}
                <TransportBar
                  isPlaying={engine.isPlaying}
                  isLoading={engine.isLoading}
                  currentTime={engine.currentTime}
                  duration={engine.duration}
                  songTitle={song.title}
                  songKey={song.defaultKey ?? null}
                  onPlay={engine.play}
                  onPause={engine.pause}
                  onSeek={engine.seek}
                  onPrev={() => {}}
                  onNext={() => {}}
                  hasPrev={false}
                  hasNext={false}
                />
              </>
            )}
          </div>
        )}

        {/* ── Conteúdo: Players ─────────────────────────────────────────── */}
        {activeTab === "players" && (
          <div>
            {(song.youtubeUrl || song.spotifyUrl || song.driveUrl) ? (
              <div style={mediaContainerStyle}>
                <p style={mediaTitleStyle}>Players de Áudio</p>
                <div style={mediaGridStyle}>
                  {song.youtubeUrl && (() => {
                    const embed = getYoutubeEmbedUrl(song.youtubeUrl!);
                    return embed ? (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>YouTube</p>
                        <iframe
                          src={embed}
                          style={iframeStyle}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube player"
                        />
                      </div>
                    ) : (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>YouTube</p>
                        <a href={song.youtubeUrl!} target="_blank" rel="noopener noreferrer" style={externalLinkStyle}>▶ Abrir no YouTube</a>
                      </div>
                    );
                  })()}
                  {song.spotifyUrl && (() => {
                    const embed = getSpotifyEmbedUrl(song.spotifyUrl!);
                    return embed ? (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>Spotify</p>
                        <iframe
                          src={embed}
                          style={{ ...iframeStyle, height: 152, borderRadius: 12 }}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          title="Spotify player"
                        />
                      </div>
                    ) : (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>Spotify</p>
                        <a href={song.spotifyUrl!} target="_blank" rel="noopener noreferrer" style={externalLinkStyle}>▶ Abrir no Spotify</a>
                      </div>
                    );
                  })()}
                  {song.driveUrl && (() => {
                    const embed = getDriveEmbedUrl(song.driveUrl!);
                    return embed ? (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>Google Drive (MP3)</p>
                        <iframe src={embed} style={{ ...iframeStyle, height: 80 }} allow="autoplay" title="Drive audio player" />
                      </div>
                    ) : (
                      <div style={mediaCardStyle}>
                        <p style={mediaLabelStyle}>Google Drive</p>
                        <a href={song.driveUrl!} target="_blank" rel="noopener noreferrer" style={externalLinkStyle}>▶ Abrir no Drive</a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <p style={{ color: "#475569", marginBottom: 12 }}>Nenhum player configurado.</p>
            )}

            {/* Editar links — apenas para quem gerencia */}
            {canManage && (
              <div style={{ marginTop: 16 }}>
                {!urlsEditOpen ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => setUrlsEditOpen(true)} style={zoneEditBtnStyle}>
                      {song.youtubeUrl || song.spotifyUrl || song.driveUrl ? "✏ Editar links de áudio" : "+ Adicionar links de áudio"}
                    </button>
                    {urlsSaveMsg && <span style={{ fontSize: 12, color: "#7cf2a2" }}>{urlsSaveMsg}</span>}
                  </div>
                ) : (
                  <div style={urlsEditBoxStyle}>
                    <p style={mediaTitleStyle}>Links de áudio / vídeo</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <UrlField label="YouTube" value={urlYoutube} onChange={setUrlYoutube} placeholder="https://www.youtube.com/watch?v=..." disabled={savingUrls} />
                      <UrlField label="Spotify" value={urlSpotify} onChange={setUrlSpotify} placeholder="https://open.spotify.com/track/..." disabled={savingUrls} />
                      <UrlField label="Google Drive (MP3)" value={urlDrive} onChange={setUrlDrive} placeholder="https://drive.google.com/file/d/.../view" disabled={savingUrls} />
                    </div>
                    {urlsSaveMsg && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{urlsSaveMsg}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button onClick={() => void saveUrls()} disabled={savingUrls} style={zoneSaveBtnStyle}>
                        {savingUrls ? "..." : "Salvar"}
                      </button>
                      <button onClick={() => { setUrlsEditOpen(false); setUrlsSaveMsg(""); }} disabled={savingUrls} style={zoneCancelBtnStyle}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Conteúdo: Faixas — apenas para acesso completo ───────────── */}
        {activeTab === "faixas" && fullDetail && (
          <div style={urlsEditBoxStyle}>
            <p style={mediaTitleStyle}>Faixas Multitrack (VS ao Vivo)</p>

            {tracksLoading ? (
              <p style={{ color: "#7a94b0", fontSize: 13 }}>Carregando faixas...</p>
            ) : tracks.length === 0 ? (
              <p style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>Nenhuma faixa cadastrada.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {tracks.map((t) => (
                  <div key={t.id} style={trackRowStyle}>
                    <span style={{ color: "#7cf2a2", fontSize: 12, fontWeight: 700, minWidth: 90 }}>{t.trackType}</span>
                    <span style={{ color: "#e8f2ff", fontSize: 13, flex: 1 }}>{t.label}</span>
                    <a href={t.driveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontSize: 12 }}>Drive</a>
                    <button onClick={() => void deleteTrack(t.id)} style={trackDeleteBtnStyle} title="Remover faixa">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* importar múltiplos links */}
            <div style={{ background: "#081420", border: "1px dashed #2d4b6d", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", color: "#7a94b0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                Importar múltiplos arquivos do Drive
              </p>
              <p style={{ margin: "0 0 8px", color: "#475569", fontSize: 12 }}>
                No Google Drive: selecione os arquivos → clique direito → "Copiar links" → cole aqui (um por linha).
              </p>
              <textarea
                rows={4}
                placeholder={"https://drive.google.com/file/d/AAA.../view\nhttps://drive.google.com/file/d/BBB.../view\n..."}
                value={multiLinks}
                onChange={(e) => setMultiLinks(e.target.value)}
                disabled={importingLinks}
                style={{ ...urlInputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => void importMultiLinks()}
                  disabled={importingLinks || !multiLinks.trim()}
                  style={{ ...zoneSaveBtnStyle, background: "#818cf8" }}
                >
                  {importingLinks ? "Importando..." : "Importar links"}
                </button>
                {linksMsg && (
                  <span style={{ fontSize: 12, color: linksMsg.includes("sucesso") || linksMsg.includes("importada") ? "#7cf2a2" : "#f87171" }}>
                    {linksMsg}
                  </span>
                )}
              </div>
            </div>

            <p style={{ margin: "0 0 8px", color: "#7a94b0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
              Adicionar faixa individualmente
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={newTrackType}
                  onChange={(e) => setNewTrackType(e.target.value as TrackType)}
                  style={{ ...zoneSelectStyle, minWidth: 130 }}
                  disabled={addingTrack}
                >
                  {(["CLICK","GUIDE_VOCAL","FULL_BAND","PAD","BASS","STEM_KEYS","STEM_GUITAR","STEM_DRUMS","STEM_BACKING"] as TrackType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nome da faixa (ex: Click, Vocal Guia)"
                  value={newTrackLabel}
                  onChange={(e) => setNewTrackLabel(e.target.value)}
                  disabled={addingTrack}
                  style={{ ...urlInputStyle, flex: 1, minWidth: 160 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  placeholder="Link do Google Drive (drive.google.com/file/d/.../view)"
                  value={newTrackUrl}
                  onChange={(e) => setNewTrackUrl(e.target.value)}
                  disabled={addingTrack}
                  style={{ ...urlInputStyle, flex: 1 }}
                />
                <button onClick={() => void addTrack()} disabled={addingTrack || !newTrackUrl.trim()} style={zoneSaveBtnStyle}>
                  {addingTrack ? "..." : "+ Adicionar"}
                </button>
              </div>
              {trackMsg && (
                <p style={{ margin: 0, fontSize: 12, color: trackMsg.startsWith("Faixa") ? "#7cf2a2" : "#f87171" }}>
                  {trackMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────────────────────

type TabId = "cifra" | "vs" | "players" | "faixas";

function TabButton({
  id,
  label,
  active,
  onClick,
  badge,
}: {
  id: TabId;
  label: string;
  active: TabId;
  onClick: (id: TabId) => void;
  badge?: string;
}) {
  const isActive = id === active;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        background: isActive ? "#0f2a1e" : "transparent",
        color: isActive ? "#7cf2a2" : "#7a94b0",
        border: "none",
        borderBottom: isActive ? "2px solid #7cf2a2" : "2px solid transparent",
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: isActive ? 700 : 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {badge && (
        <span style={{
          background: "#1b3756",
          color: "#7cf2a2",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          padding: "1px 7px",
          minWidth: 18,
          textAlign: "center",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span style={metaPillStyle}>
      <span style={{ color: "#7a94b0", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label} </span>
      <span style={{ fontWeight: 700, color: "#7cf2a2" }}>{value}</span>
    </span>
  );
}

function UrlField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ color: "#7a94b0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={urlInputStyle}
      />
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const backLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
  display: "inline-block",
  marginBottom: 16,
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #1e2d3d",
  marginBottom: 24,
  overflowX: "auto",
};

const headerBoxStyle: CSSProperties = {
  background: "linear-gradient(135deg, #1b3756 0%, #122840 100%)",
  border: "1px solid #31557c",
  borderRadius: 18,
  padding: "20px 22px",
  marginBottom: 20,
};

const metaPillStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 13,
};

const chartContainerStyle: CSSProperties = {
  background: "#071623",
  border: "1px solid #1e3650",
  borderRadius: 14,
  padding: "20px 24px",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 14,
  lineHeight: 1.6,
  overflowX: "auto",
};

const sectionNameStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "#fbbf24",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 1,
  textTransform: "uppercase",
  fontFamily: "inherit",
};

function lineStyle(type: SongSectionLine["type"]): CSSProperties {
  const base: CSSProperties = {
    margin: "0 0 2px",
    whiteSpace: "pre",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 14,
    lineHeight: 1.6,
  };
  if (type === "chords") return { ...base, color: "#7cf2a2", fontWeight: 700 };
  if (type === "tab") return { ...base, color: "#93c5fd" };
  if (type === "text") return { ...base, color: "#7a94b0", fontStyle: "italic" };
  return { ...base, color: "#d6e5f8" }; // lyrics
}

function versionBtnStyle(active: boolean): CSSProperties {
  return {
    background: active ? "#7cf2a2" : "#0d2035",
    color: active ? "#0a1929" : "#b3c6e0",
    border: `1px solid ${active ? "#7cf2a2" : "#2d4b6d"}`,
    borderRadius: 8,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
  };
}

const dictBoxStyle: CSSProperties = {
  background: "#071623",
  border: "1px solid #1e3650",
  borderRadius: 12,
  padding: "16px 20px",
  marginTop: 20,
};

const chordDictItemStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "4px 12px",
  fontSize: 13,
};

const importLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  textDecoration: "none",
  fontSize: 14,
  border: "1px solid #7cf2a2",
  borderRadius: 8,
  padding: "6px 14px",
};

const zoneEditBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#8fa9c8",
  border: "1px dashed #2d4b6d",
  borderRadius: 8,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const zoneSelectStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  color: "#e8f2ff",
  padding: "5px 10px",
  fontSize: 13,
};

const zoneSaveBtnStyle: CSSProperties = {
  background: "#7cf2a2",
  color: "#0f2137",
  border: "none",
  borderRadius: 8,
  padding: "5px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const zoneCancelBtnStyle: CSSProperties = {
  background: "transparent",
  color: "#8fa9c8",
  border: "1px solid #2d4b6d",
  borderRadius: 8,
  padding: "5px 12px",
  fontSize: 13,
  cursor: "pointer",
};

// ── Media player styles ──────────────────────────────────────────────────────

const mediaContainerStyle: CSSProperties = {
  marginTop: 24,
  background: "#0a1929",
  border: "1px solid #1e3a55",
  borderRadius: 12,
  padding: "16px 20px",
};

const mediaTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  color: "#7a94b0",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  fontWeight: 700,
};

const mediaGridStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const mediaCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const mediaLabelStyle: CSSProperties = {
  margin: 0,
  color: "#7a94b0",
  fontSize: 12,
  fontWeight: 600,
};

const iframeStyle: CSSProperties = {
  width: "100%",
  height: 200,
  border: "none",
  borderRadius: 8,
};

const externalLinkStyle: CSSProperties = {
  color: "#7cf2a2",
  fontSize: 14,
  textDecoration: "none",
};

const urlsEditBoxStyle: CSSProperties = {
  marginTop: 16,
  background: "#0a1929",
  border: "1px solid #1e3a55",
  borderRadius: 12,
  padding: "16px 20px",
};

const urlInputStyle: CSSProperties = {
  background: "#0d2035",
  border: "1px solid #2d4b6d",
  borderRadius: 6,
  color: "#e8f2ff",
  fontSize: 13,
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const trackRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#0d2035",
  border: "1px solid #1e3650",
  borderRadius: 8,
  padding: "6px 12px",
};

const trackDeleteBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#f87171",
  cursor: "pointer",
  fontSize: 13,
  padding: "0 4px",
};
