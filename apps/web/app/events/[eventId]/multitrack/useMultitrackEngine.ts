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
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [tracks, setTracks] = useState<TrackState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Lazy-init AudioContext on first user interaction
  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  // Stop all source nodes without resetting offset
  function stopSources() {
    for (const [, node] of sourceNodesRef.current) {
      try { node.stop(); } catch { /* already stopped */ }
      node.disconnect();
    }
    sourceNodesRef.current.clear();
  }

  // Ticker to update currentTime while playing
  function startTicker() {
    cancelAnimationFrame(rafRef.current);
    function tick() {
      if (!ctxRef.current) return;
      const elapsed = ctxRef.current.currentTime - startTimeRef.current + offsetRef.current;
      setCurrentTime(Math.min(elapsed, duration));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  // Load all tracks for a song
  const loadSong = useCallback(async (songTracks: SongTrack[]) => {
    // Stop current playback and reset
    stopSources();
    cancelAnimationFrame(rafRef.current);
    offsetRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (songTracks.length === 0) {
      setTracks([]);
      return;
    }

    // Init track states as loading
    const initStates: TrackState[] = songTracks.map((t) => ({
      id: t.id,
      label: t.label,
      trackType: t.trackType,
      driveFileId: t.driveFileId,
      buffer: null,
      gainNode: null,
      analyserNode: null,
      volume: t.trackType === "CLICK" ? 0.5 : 1,
      muted: false,
      loadState: "loading",
    }));
    setTracks(initStates);
    setIsLoading(true);

    const ctx = getCtx();

    // Load each track in parallel
    const results = await Promise.allSettled(
      songTracks.map(async (t) => {
        const res = await fetch(`/api/audio-proxy?fileId=${encodeURIComponent(t.driveFileId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const gainNode = ctx.createGain();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        gainNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        return { id: t.id, audioBuffer, gainNode, analyserNode };
      })
    );

    // Calculate outside setTracks so setDuration gets the correct value immediately
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

    setTracks(updatedTracks);
    setDuration(maxDuration);
    setIsLoading(false);
  }, []);

  const play = useCallback(() => {
    const ctx = getCtx();
    setTracks((prev) => {
      const startAt = ctx.currentTime;
      startTimeRef.current = startAt;

      for (const ts of prev) {
        if (!ts.buffer || !ts.gainNode) continue;
        const source = ctx.createBufferSource();
        source.buffer = ts.buffer;
        source.connect(ts.gainNode);
        source.start(startAt, offsetRef.current);
        sourceNodesRef.current.set(ts.id, source);

        source.onended = () => {
          sourceNodesRef.current.delete(ts.id);
        };
      }

      startTicker();
      setIsPlaying(true);
      return prev;
    });
  }, []);

  const pause = useCallback(() => {
    if (!ctxRef.current) return;
    offsetRef.current += ctxRef.current.currentTime - startTimeRef.current;
    stopSources();
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  const seek = useCallback((seconds: number) => {
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      if (ctxRef.current) {
        offsetRef.current += ctxRef.current.currentTime - startTimeRef.current;
      }
      stopSources();
      cancelAnimationFrame(rafRef.current);
    }
    offsetRef.current = seconds;
    setCurrentTime(seconds);
    if (wasPlaying) {
      // Re-trigger play from new offset
      setTimeout(() => play(), 0);
    }
  }, [isPlaying, play]);

  const setVolume = useCallback((trackId: string, value: number) => {
    setTracks((prev) =>
      prev.map((ts) => {
        if (ts.id !== trackId) return ts;
        if (ts.gainNode) ts.gainNode.gain.value = ts.muted ? 0 : value;
        return { ...ts, volume: value };
      })
    );
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((ts) => {
        if (ts.id !== trackId) return ts;
        const nextMuted = !ts.muted;
        if (ts.gainNode) ts.gainNode.gain.value = nextMuted ? 0 : ts.volume;
        return { ...ts, muted: nextMuted };
      })
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopSources();
      void ctxRef.current?.close();
    };
  }, []);

  return { tracks, isPlaying, isLoading, currentTime, duration, loadSong, play, pause, seek, setVolume, toggleMute };
}
