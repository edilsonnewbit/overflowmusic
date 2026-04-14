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
  analyserNode: AnalyserNode | null;
  volume: number;
  muted: boolean;
  loadState: "idle" | "loading" | "ready" | "error";
};

export type MultitrackEngine = {
  tracks: TrackState[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  loadSong: (songTracks: SongTrack[]) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (trackId: string, value: number) => void;
  toggleMute: (trackId: string) => void;
};

export function useMultitrackEngine(): MultitrackEngine {
  // ── Refs (never cause re-renders) ─────────────────────────────────────────
  const ctxRef          = useRef<AudioContext | null>(null);
  const sourcesRef      = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef    = useRef<number>(0);   // AudioContext.currentTime at last play/seek
  const offsetRef       = useRef<number>(0);   // absolute position in seconds at last play/seek
  const rafRef          = useRef<number>(0);
  const isPlayingRef    = useRef<boolean>(false);
  const tracksRef       = useRef<TrackState[]>([]);
  const durationRef     = useRef<number>(0);
  // Generation counter: incremented every time sources are stopped.
  // Prevents stale onended handlers from corrupting state.
  const generationRef   = useRef<number>(0);
  // Cache: driveFileId → decoded AudioBuffer (persists across song changes)
  const bufferCacheRef  = useRef<Map<string, AudioBuffer>>(new Map());

  // ── State ─────────────────────────────────────────────────────────────────
  const [tracks,      setTracks]      = useState<TrackState[]>([]);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);

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
      ts.analyserNode?.disconnect();
    }
  }

  // ── Source-node management ─────────────────────────────────────────────────
  function stopAllSources() {
    // Increment generation so any pending onended from these sources is ignored
    generationRef.current++;
    for (const [, node] of sourcesRef.current) {
      try { node.stop(); } catch { /* already stopped */ }
      node.disconnect();
    }
    sourcesRef.current.clear();
  }

  function startAllSources(ctx: AudioContext, fromOffset: number) {
    stopAllSources();
    const gen = generationRef.current; // capture generation for onended check
    const startAt = ctx.currentTime + 0.01; // tiny future time for sync
    startTimeRef.current = startAt;
    const dur = durationRef.current;

    for (const ts of tracksRef.current) {
      if (!ts.buffer || !ts.gainNode || ts.loadState !== "ready") continue;
      // Don't start if offset is already past this buffer's duration
      if (fromOffset >= ts.buffer.duration) continue;
      const source = ctx.createBufferSource();
      source.buffer = ts.buffer;
      source.connect(ts.gainNode);
      source.start(startAt, fromOffset);
      sourcesRef.current.set(ts.id, source);
      source.onended = () => {
        // Ignore stale onended from a previous generation (seek, pause, song switch)
        if (generationRef.current !== gen) return;
        sourcesRef.current.delete(ts.id);
        // If all sources ended and we're still "playing", auto-stop
        if (sourcesRef.current.size === 0 && isPlayingRef.current) {
          handleNaturalEnd(dur);
        }
      };
    }
  }

  // Called when all source nodes have fired onended
  function handleNaturalEnd(dur: number) {
    cancelAnimationFrame(rafRef.current);
    offsetRef.current = 0;
    setCurrentTime(dur); // show full duration
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
        // Reached end — auto-stop
        cancelAnimationFrame(rafRef.current);
        stopAllSources();
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
    cancelAnimationFrame(rafRef.current);
    // Disconnect old GainNode/AnalyserNode chains from ctx.destination
    disconnectTrackNodes();
    offsetRef.current = 0;
    syncPlaying(false);
    setCurrentTime(0);
    syncDuration(0);

    if (songTracks.length === 0) { syncTracks([]); return; }

    const initStates: TrackState[] = songTracks.map((t) => ({
      id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
      buffer: null, gainNode: null, analyserNode: null,
      volume: t.trackType === "CLICK" ? 0.5 : 1,
      muted: false, loadState: "loading",
    }));
    syncTracks(initStates);
    setIsLoading(true);

    const ctx = await ensureCtxRunning();

    const results = await Promise.allSettled(
      songTracks.map(async (t) => {
        // Use cached buffer if available (no network request needed)
        let audioBuffer = bufferCacheRef.current.get(t.driveFileId) ?? null;
        if (!audioBuffer) {
          const res = await fetch(`/api/audio-proxy?fileId=${encodeURIComponent(t.driveFileId)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          bufferCacheRef.current.set(t.driveFileId, audioBuffer);
        }
        // GainNode and AnalyserNode must always be recreated (they're part of the audio graph)
        const gainNode = ctx.createGain();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        gainNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        return { id: t.id, audioBuffer, gainNode, analyserNode };
      })
    );

    let maxDuration = 0;
    const updatedTracks = initStates.map((ts, i) => {
      const result = results[i];
      if (result?.status === "fulfilled") {
        const { audioBuffer, gainNode, analyserNode } = result.value;
        gainNode.gain.value = ts.volume;
        if (audioBuffer.duration > maxDuration) maxDuration = audioBuffer.duration;
        return { ...ts, buffer: audioBuffer, gainNode, analyserNode, loadState: "ready" as const };
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
    syncPlaying(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Save absolute position before stopping
    const elapsed = ctx.currentTime - startTimeRef.current + offsetRef.current;
    offsetRef.current = Math.min(Math.max(0, elapsed), durationRef.current);
    stopAllSources();
    cancelAnimationFrame(rafRef.current);
    syncPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((seconds: number) => {
    const clamped = Math.min(Math.max(0, seconds), durationRef.current);
    stopAllSources();
    cancelAnimationFrame(rafRef.current);
    offsetRef.current = clamped;
    setCurrentTime(clamped);

    if (isPlayingRef.current) {
      const ctx = ctxRef.current ?? getCtx();
      startAllSources(ctx, clamped);
      startTicker();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Volume / Mute ─────────────────────────────────────────────────────────
  const setVolume = useCallback((trackId: string, value: number) => {
    const updated = tracksRef.current.map((ts) => {
      if (ts.id !== trackId) return ts;
      if (ts.gainNode) ts.gainNode.gain.value = ts.muted ? 0 : value;
      return { ...ts, volume: value };
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

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopAllSources();
      disconnectTrackNodes();
      void ctxRef.current?.close();
      bufferCacheRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tracks, isPlaying, isLoading, currentTime, duration, loadSong, play, pause, seek, setVolume, toggleMute };
}
