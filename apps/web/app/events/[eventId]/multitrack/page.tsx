"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import Link from "next/link";
import type { SetlistSongTracks } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { SongCard } from "./SongCard";
import { TrackStrip } from "./TrackStrip";
import { TransportBar } from "./TransportBar";
import { useMultitrackEngine } from "./useMultitrackEngine";

type Props = { params: Promise<{ eventId: string }> };

export default function MultitrackPage({ params }: Props) {
  const { eventId } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [songTracks,        setSongTracks]        = useState<SetlistSongTracks[]>([]);
  const [currentSongIndex,  setCurrentSongIndex]  = useState(0);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const songCardRowRef = useRef<HTMLDivElement>(null);

  const engine = useMultitrackEngine();

  // Fetch setlist tracks
  useEffect(() => {
    if (!eventId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/setlist/tracks`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { ok: boolean; songTracks?: SetlistSongTracks[] };
        setSongTracks(body.songTracks ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar setlist");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // Load tracks when song changes
  useEffect(() => {
    const song = songTracks[currentSongIndex];
    if (!song) return;
    void engine.loadSong(song.tracks);
  }, [currentSongIndex, songTracks]);

  // Scroll active card into view
  useEffect(() => {
    const row = songCardRowRef.current;
    if (!row) return;
    const card = row.children[currentSongIndex] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentSongIndex]);

  const currentSong = songTracks[currentSongIndex] ?? null;

  // Check if current song has a CLICK track uploaded
  const hasClickTrack = currentSong?.tracks.some((t) => t.trackType === "CLICK") ?? false;

  if (authLoading || loading) {
    return (
      <div className="mt-loading-screen">
        <span className="mt-spinner-lg" />
        <p>Carregando player...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mt-loading-screen">
        <p>Acesso restrito. <Link href="/login">Entrar</Link></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-loading-screen">
        <p style={{ color: "#ef4444" }}>Erro: {error}</p>
        <Link href={`/events/${eventId}`} className="mt-back-link">← Voltar ao evento</Link>
      </div>
    );
  }

  return (
    <div className="mt-root">
      {/* Header */}
      <div className="mt-header">
        <Link href={`/events/${eventId}`} className="mt-back-link">← Evento</Link>
        <span className="mt-header-title">VS ao Vivo</span>
        <Link href={`/events/${eventId}/present`} className="mt-header-link">Apresentar →</Link>
      </div>

      {/* Song cards row */}
      <div className="mt-cards-row" ref={songCardRowRef}>
        {songTracks.length === 0 ? (
          <p className="mt-empty">Nenhuma música no setlist com faixas cadastradas.</p>
        ) : (
          songTracks.map((song, i) => (
            <SongCard
              key={song.setlistItemId}
              song={song}
              isActive={i === currentSongIndex}
              onSelect={() => {
                if (engine.isPlaying) engine.pause();
                setCurrentSongIndex(i);
              }}
            />
          ))
        )}
      </div>

      {/* Track strips */}
      <div className="mt-tracks-area">
        {engine.isLoading && (
          <div className="mt-tracks-loading">
            <span className="mt-spinner" /> Carregando faixas de áudio...
          </div>
        )}

        {/* Metronome strip — aparece quando não há trilha CLICK carregada */}
        {!engine.isLoading && !hasClickTrack && currentSong && (
          <div className="mt-metronome-strip">
            <div className="mt-metronome-left">
              <button
                type="button"
                className={`mt-metronome-btn${engine.metronomeActive ? " active" : ""}`}
                onClick={engine.toggleMetronome}
                title={engine.metronomeActive ? "Desativar click" : "Ativar click interno"}
              >
                🥁
              </button>
              <span className="mt-metronome-label" style={{ color: engine.metronomeActive ? "#ef4444" : "#475569" }}>
                CLICK
              </span>
            </div>
            <div className="mt-metronome-center">
              {engine.metronomeActive ? (
                <span className="mt-metronome-hint">Click ativo · acento no 1º tempo de cada 4</span>
              ) : (
                <span className="mt-metronome-hint">Sem trilha CLICK — ative o metrônomo interno</span>
              )}
            </div>
            <div className="mt-metronome-right">
              <span className="mt-bpm-label">BPM</span>
              <button
                type="button"
                className="mt-bpm-btn"
                onClick={() => engine.setMetronomeBpm(engine.metronomeBpm - 1)}
                disabled={engine.metronomeBpm <= 20}
              >−</button>
              <input
                type="number"
                className="mt-bpm-input"
                min={20} max={300}
                value={engine.metronomeBpm}
                onChange={(e) => engine.setMetronomeBpm(parseInt(e.target.value, 10) || 120)}
              />
              <button
                type="button"
                className="mt-bpm-btn"
                onClick={() => engine.setMetronomeBpm(engine.metronomeBpm + 1)}
                disabled={engine.metronomeBpm >= 300}
              >+</button>
            </div>
          </div>
        )}

        {!engine.isLoading && engine.tracks.length === 0 && currentSong && (
          <div className="mt-tracks-empty">
            <p>Esta música não tem faixas cadastradas.</p>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              Adicione faixas na página da música para usar o player.
            </p>
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

      {/* Transport bar */}
      <TransportBar
        isPlaying={engine.isPlaying}
        isLoading={engine.isLoading}
        currentTime={engine.currentTime}
        duration={engine.duration}
        songTitle={currentSong?.songTitle ?? "—"}
        songKey={currentSong?.key ?? null}
        onPlay={engine.play}
        onPause={engine.pause}
        onSeek={engine.seek}
        onPrev={() => {
          if (engine.isPlaying) engine.pause();
          setCurrentSongIndex((i) => Math.max(0, i - 1));
        }}
        onNext={() => {
          if (engine.isPlaying) engine.pause();
          setCurrentSongIndex((i) => Math.min(songTracks.length - 1, i + 1));
        }}
        hasPrev={currentSongIndex > 0}
        hasNext={currentSongIndex < songTracks.length - 1}
      />
    </div>
  );
}
