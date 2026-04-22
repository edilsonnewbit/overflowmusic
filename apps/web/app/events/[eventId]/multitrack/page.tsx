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

// 4 beats per measure — dots represent beats 1-4
const BEAT_COUNT = 4;

export default function MultitrackPage({ params }: Props) {
  const { eventId } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [songTracks,       setSongTracks]       = useState<SetlistSongTracks[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const songCardRowRef = useRef<HTMLDivElement>(null);

  const engine = useMultitrackEngine();

  // ── Tap tempo ─────────────────────────────────────────────────────────────
  const tapTimesRef   = useRef<number[]>([]);
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTap() {
    const now = Date.now();
    // Clear taps older than 3 seconds
    const recent = tapTimesRef.current.filter((t) => now - t < 3000);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) intervals.push(recent[i] - recent[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      engine.setMetronomeBpm(Math.round(60000 / avg));
    }

    // Reset tap history after 3s of inactivity
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
    tapResetTimer.current = setTimeout(() => { tapTimesRef.current = []; }, 3000);
  }

  // ── Beat indicator (visual) ───────────────────────────────────────────────
  const beatDotsRef   = useRef<(HTMLDivElement | null)[]>([]);
  const currentBeat   = useRef<number>(0);
  const lastBeatTime  = useRef<number>(0);

  useEffect(() => {
    if (!engine.metronomeActive || !engine.isPlaying) {
      // Reset all dots when metronome is off
      beatDotsRef.current.forEach((d) => d?.classList.remove("lit"));
      currentBeat.current = 0;
      return;
    }

    const beatMs = (60 / engine.metronomeBpm) * 1000;
    let rafId: number;

    function tick() {
      const now = performance.now();
      if (now - lastBeatTime.current >= beatMs) {
        lastBeatTime.current = now;
        // Remove lit from previous dot
        const prev = currentBeat.current;
        beatDotsRef.current[prev]?.classList.remove("lit");
        // Advance beat
        currentBeat.current = (prev + 1) % BEAT_COUNT;
        beatDotsRef.current[currentBeat.current]?.classList.add("lit");
      }
      rafId = requestAnimationFrame(tick);
    }

    // Align lastBeatTime so tick starts from beat 1
    lastBeatTime.current = performance.now() - beatMs;
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      beatDotsRef.current.forEach((d) => d?.classList.remove("lit"));
    };
  }, [engine.metronomeActive, engine.isPlaying, engine.metronomeBpm]);

  // ── Fetch setlist tracks ──────────────────────────────────────────────────
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

  const currentSong   = songTracks[currentSongIndex] ?? null;
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

        {/* Metronome strip — visível quando não há trilha CLICK na música */}
        {!engine.isLoading && !hasClickTrack && currentSong && (
          <div className="mt-metronome-strip">
            {/* Left: toggle */}
            <div className="mt-metronome-left">
              <button
                type="button"
                className={`mt-metronome-btn${engine.metronomeActive ? " active" : ""}`}
                onClick={engine.toggleMetronome}
                title={engine.metronomeActive ? "Desativar click" : "Ativar click interno"}
              >
                🥁
              </button>
              <span
                className="mt-metronome-label"
                style={{ color: engine.metronomeActive ? "#ef4444" : "#475569" }}
              >
                CLICK
              </span>
            </div>

            {/* Center: beat indicator + hint */}
            <div className="mt-metronome-center">
              {engine.metronomeActive ? (
                <div className="mt-metronome-beats">
                  {Array.from({ length: BEAT_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      ref={(el) => { beatDotsRef.current[i] = el; }}
                      className={`mt-beat-dot${i === 0 ? " accent" : ""}`}
                      style={{ background: i === 0 ? "#ef4444" : "#8fa9c8" }}
                    />
                  ))}
                  <span className="mt-metronome-hint" style={{ marginLeft: 8 }}>
                    {engine.metronomeBpm} BPM
                  </span>
                </div>
              ) : (
                <span className="mt-metronome-hint">
                  Sem trilha CLICK — ative o metrônomo interno
                </span>
              )}
            </div>

            {/* Right: BPM control + tap tempo */}
            <div className="mt-metronome-right">
              <div className="mt-bpm-row">
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
              <button
                type="button"
                className="mt-tap-btn"
                onClick={handleTap}
                title="Toque no ritmo para definir o BPM"
              >
                TAP
              </button>
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
