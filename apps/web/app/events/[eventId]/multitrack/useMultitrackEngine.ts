"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SongTrack } from "@/lib/types";

export type TrackState = {
  id: string;
  label: string;
  trackType: string;
  driveFileId: string;
  buffer: AudioBuffer | null;
  gainNode: GainNode | null;
  panNode: StereoPannerNode | null;
  analyserNode: AnalyserNode | null;
  volume: number;
  pan: number;       // -1 (L) … 0 (C) … +1 (R)
  muted: boolean;
  loadState: "idle" | "loading" | "ready" | "error";
};

export type MultitrackEngine = {
  tracks: TrackState[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  // metronome
  metronomeActive: boolean;
  metronomeBpm: number;
  toggleMetronome: () => void;
  setMetronomeBpm: (bpm: number) => void;
  // transport
  loadSong: (songTracks: SongTrack[]) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (trackId: string, value: number) => void;
  setPan: (trackId: string, value: number) => void;
  toggleMute: (trackId: string) => void;
};

export function useMultitrackEngine(): MultitrackEngine {
  // ── Refs (never cause re-renders) ─────────────────────────────────────────
  const ctxRef          = useRef<AudioContext | null>(null);
  const sourcesRef      = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef    = useRef<number>(0);
  const offsetRef       = useRef<number>(0);
  const rafRef          = useRef<number>(0);
  const isPlayingRef    = useRef<boolean>(false);
  const tracksRef       = useRef<TrackState[]>([]);
  const durationRef     = useRef<number>(0);
  const generationRef   = useRef<number>(0);
  const bufferCacheRef  = useRef<Map<string, AudioBuffer>>(new Map());

  // ── Metronome refs ────────────────────────────────────────────────────────
  const metronomeActiveRef  = useRef<boolean>(false);
  const metronomeBpmRef     = useRef<number>(120);
  const nextClickTimeRef    = useRef<number>(0);
  const metronomeTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [tracks,           setTracks]           = useState<TrackState[]>([]);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [isLoading,        setIsLoading]        = useState(false);
  const [currentTime,      setCurrentTime]      = useState(0);
  const [duration,         setDuration]         = useState(0);
  const [metronomeActive,  setMetronomeActive]  = useState(false);
  const [metronomeBpm,     setMetronomeBpmState] = useState(120);

  // ── Sync helpers ──────────────────────────────────────────────────────────
  function syncTracks(t: TrackState[])  { tracksRef.current = t; setTracks(t); }
  function syncPlaying(v: boolean)      { isPlayingRef.current = v; setIsPlaying(v); }
  function syncDuration(v: number)      { durationRef.current = v; setDuration(v); }

  // ── AudioContext ───────────────────────────────────────────────────────────
  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }

  async function ensureCtxRunning(): Promise<AudioContext> {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  // ── Disconnect old audio-graph nodes ───────────────────────────────────────
  function disconnectTrackNodes() {
    for (const ts of tracksRef.current) {
      ts.gainNode?.disconnect();
      ts.panNode?.disconnect();
      ts.analyserNode?.disconnect();
    }
  }

  // ── Metronome click sound (Web Audio API scheduling) ─────────────────────
  function scheduleClick(ctx: AudioContext, time: number, accent: boolean) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = accent ? 1200 : 880;
    gain.gain.setValueAtTime(accent ? 0.35 : 0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.045);
  }

  function scheduleMetronomeClicks() {
    const ctx = ctxRef.current;
    if (!ctx || !metronomeActiveRef.current || !isPlayingRef.current) return;
    const beatDur      = 60 / metronomeBpmRef.current;
    const scheduleAhead = 0.12; // seconds ahead to schedule
    while (nextClickTimeRef.current < ctx.currentTime + scheduleAhead) {
      // Compute beat number relative to offset to know if it's beat 1
      const beatIndex = Math.round(
        (nextClickTimeRef.current - startTimeRef.current + offsetRef.current) / beatDur
      );
      scheduleClick(ctx, nextClickTimeRef.current, beatIndex % 4 === 0);
      nextClickTimeRef.current += beatDur;
    }
  }

  function startMetronomeScheduler() {
    stopMetronomeScheduler();
    metronomeTimerRef.current = setInterval(scheduleMetronomeClicks, 25);
  }

  function stopMetronomeScheduler() {
    if (metronomeTimerRef.current !== null) {
      clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
    }
  }

  // Sync nextClickTime with current playback position
  function syncNextClickTime(ctx: AudioContext, startAt: number, fromOffset: number) {
    const beatDur = 60 / metronomeBpmRef.current;
    // Find how many beats have passed at fromOffset, then schedule the next beat
    const beatsElapsed = Math.floor(fromOffset / beatDur);
    const nextBeatOffset = (beatsElapsed + 1) * beatDur;
    const secondsUntilNextBeat = nextBeatOffset - fromOffset;
    nextClickTimeRef.current = startAt + secondsUntilNextBeat;
  }

  // ── Source-node management ─────────────────────────────────────────────────
  function stopAllSources() {
    generationRef.current++;
    for (const [, node] of sourcesRef.current) {
      try { node.stop(); } catch { /* already stopped */ }
      node.disconnect();
    }
    sourcesRef.current.clear();
  }

  function startAllSources(ctx: AudioContext, fromOffset: number) {
    stopAllSources();
    const gen     = generationRef.current;
    const startAt = ctx.currentTime + 0.01;
    startTimeRef.current = startAt;
    const dur = durationRef.current;

    for (const ts of tracksRef.current) {
      if (!ts.buffer || !ts.gainNode || ts.loadState !== "ready") continue;
      if (fromOffset >= ts.buffer.duration) continue;
      const source = ctx.createBufferSource();
      source.buffer = ts.buffer;
      source.connect(ts.gainNode);
      source.start(startAt, fromOffset);
      sourcesRef.current.set(ts.id, source);
      source.onended = () => {
        if (generationRef.current !== gen) return;
        sourcesRef.current.delete(ts.id);
        if (sourcesRef.current.size === 0 && isPlayingRef.current) {
          handleNaturalEnd(dur);
        }
      };
    }

    // Sync metronome to this playback start
    if (metronomeActiveRef.current) {
      syncNextClickTime(ctx, startAt, fromOffset);
    }
  }

  function handleNaturalEnd(dur: number) {
    cancelAnimationFrame(rafRef.current);
    stopMetronomeScheduler();
    offsetRef.current = 0;
    setCurrentTime(dur);
    syncPlaying(false);
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  function startTicker() {
    cancelAnimationFrame(rafRef.current);
    function tick() {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const elapsed = ctx.currentTime - startTimeRef.current + offsetRef.current;
      const dur = durationRef.current;
      if (dur > 0 && elapsed >= dur) {
        cancelAnimationFrame(rafRef.current);
        stopAllSources();
        stopMetronomeScheduler();
        offsetRef.current = 0;
        setCurrentTime(dur);
        syncPlaying(false);
        return;
      }
      setCurrentTime(Math.max(0, elapsed));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── loadSong ───────────────────────────────────────────────────────────────
  const loadSong = useCallback(async (songTracks: SongTrack[]) => {
    stopAllSources();
    stopMetronomeScheduler();
    cancelAnimationFrame(rafRef.current);
    disconnectTrackNodes();
    offsetRef.current = 0;
    syncPlaying(false);
    setCurrentTime(0);
    syncDuration(0);

    if (songTracks.length === 0) { syncTracks([]); return; }

    const initStates: TrackState[] = songTracks.map((t) => ({
      id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
      buffer: null, gainNode: null, panNode: null, analyserNode: null,
      volume: t.trackType === "CLICK" ? 0.5 : 1,
      pan: 0,
      muted: false, loadState: "loading",
    }));
    syncTracks(initStates);
    setIsLoading(true);

    const ctx = await ensureCtxRunning();

    const results = await Promise.allSettled(
      songTracks.map(async (t) => {
        let audioBuffer = bufferCacheRef.current.get(t.driveFileId) ?? null;
        if (!audioBuffer) {
          const res = await fetch(`/api/audio-proxy?fileId=${encodeURIComponent(t.driveFileId)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          bufferCacheRef.current.set(t.driveFileId, audioBuffer);
        }
        const gainNode    = ctx.createGain();
        const panNode     = ctx.createStereoPanner();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        // chain: source → gain → pan → analyser → destination
        gainNode.connect(panNode);
        panNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        return { id: t.id, audioBuffer, gainNode, panNode, analyserNode };
      })
    );

    let maxDuration = 0;
    const updatedTracks = initStates.map((ts, i) => {
      const result = results[i];
      if (result?.status === "fulfilled") {
        const { audioBuffer, gainNode, panNode, analyserNode } = result.value;
        gainNode.gain.value = ts.volume;
        panNode.pan.value   = ts.pan;
        if (audioBuffer.duration > maxDuration) maxDuration = audioBuffer.duration;
        return { ...ts, buffer: audioBuffer, gainNode, panNode, analyserNode, loadState: "ready" as const };
      }
      return { ...ts, loadState: "error" as const };
    });

    syncTracks(updatedTracks);
    syncDuration(maxDuration);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Transport ──────────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    const ctx = await ensureCtxRunning();
    startAllSources(ctx, offsetRef.current);
    startTicker();
    if (metronomeActiveRef.current) startMetronomeScheduler();
    syncPlaying(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const elapsed = ctx.currentTime - startTimeRef.current + offsetRef.current;
    offsetRef.current = Math.min(Math.max(0, elapsed), durationRef.current);
    stopAllSources();
    stopMetronomeScheduler();
    cancelAnimationFrame(rafRef.current);
    syncPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((seconds: number) => {
    const clamped = Math.min(Math.max(0, seconds), durationRef.current);
    stopAllSources();
    stopMetronomeScheduler();
    cancelAnimationFrame(rafRef.current);
    offsetRef.current = clamped;
    setCurrentTime(clamped);

    if (isPlayingRef.current) {
      const ctx = ctxRef.current ?? getCtx();
      startAllSources(ctx, clamped);
      startTicker();
      if (metronomeActiveRef.current) startMetronomeScheduler();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Volume / Pan / Mute ───────────────────────────────────────────────────
  const setVolume = useCallback((trackId: string, value: number) => {
    const updated = tracksRef.current.map((ts) => {
      if (ts.id !== trackId) return ts;
      if (ts.gainNode) ts.gainNode.gain.value = ts.muted ? 0 : value;
      return { ...ts, volume: value };
    });
    syncTracks(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPan = useCallback((trackId: string, value: number) => {
    const clamped = Math.min(1, Math.max(-1, value));
    const updated = tracksRef.current.map((ts) => {
      if (ts.id !== trackId) return ts;
      if (ts.panNode) ts.panNode.pan.value = clamped;
      return { ...ts, pan: clamped };
    });
    syncTracks(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    const updated = tracksRef.current.map((ts) => {
      if (ts.id !== trackId) return ts;
      const nextMuted = !ts.muted;
      if (ts.gainNode) ts.gainNode.gain.value = nextMuted ? 0 : ts.volume;
      return { ...ts, muted: nextMuted };
    });
    syncTracks(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Metronome controls ────────────────────────────────────────────────────
  const toggleMetronome = useCallback(() => {
    const next = !metronomeActiveRef.current;
    metronomeActiveRef.current = next;
    setMetronomeActive(next);
    if (next && isPlayingRef.current) {
      const ctx = ctxRef.current;
      if (ctx) {
        syncNextClickTime(ctx, ctx.currentTime, offsetRef.current + (ctx.currentTime - startTimeRef.current));
        startMetronomeScheduler();
      }
    } else {
      stopMetronomeScheduler();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMetronomeBpm = useCallback((bpm: number) => {
    const clamped = Math.min(300, Math.max(20, bpm));
    metronomeBpmRef.current = clamped;
    setMetronomeBpmState(clamped);
    // If scheduler is running, it will pick up the new BPM on next tick
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopAllSources();
      stopMetronomeScheduler();
      disconnectTrackNodes();
      void ctxRef.current?.close();
      bufferCacheRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tracks, isPlaying, isLoading, currentTime, duration,
    metronomeActive, metronomeBpm,
    toggleMetronome, setMetronomeBpm,
    loadSong, play, pause, seek,
    setVolume, setPan, toggleMute,
  };
}
