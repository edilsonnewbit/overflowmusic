"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SongTrack } from "@/lib/types";

// ── FX state ──────────────────────────────────────────────────────────────────
export type TrackFx = {
  hpfEnabled:  boolean;   // low-cut  80 Hz
  lpfEnabled:  boolean;   // high-cut  8 kHz
  compEnabled: boolean;   // gentle compressor preset
  reverbWet:   number;    // 0-1
};

const DEFAULT_FX: TrackFx = {
  hpfEnabled: false, lpfEnabled: false, compEnabled: false, reverbWet: 0,
};

// ── Track state ───────────────────────────────────────────────────────────────
export type TrackState = {
  id: string;
  label: string;
  trackType: string;
  driveFileId: string;
  loop: boolean;        // true for pad tracks — loops continuously
  buffer:       AudioBuffer | null;
  gainNode:     GainNode | null;
  panNode:      StereoPannerNode | null;
  hpfNode:      BiquadFilterNode | null;
  lpfNode:      BiquadFilterNode | null;
  compNode:     DynamicsCompressorNode | null;
  convolver:    ConvolverNode | null;
  dryGain:      GainNode | null;
  reverbWetGain: GainNode | null;
  analyserNode: AnalyserNode | null;
  volume:  number;
  pan:     number;
  muted:   boolean;
  fx:      TrackFx;
  loadState: "idle" | "loading" | "ready" | "error";
};

// ── Engine API ────────────────────────────────────────────────────────────────
export type MultitrackEngine = {
  tracks:    TrackState[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration:    number;
  // metronome
  metronomeActive: boolean;
  metronomeBpm:    number;
  toggleMetronome:  () => void;
  setMetronomeBpm:  (bpm: number) => void;
  // transport
  loadSong:    (songTracks: SongTrack[]) => Promise<void>;
  play:        () => void;
  pause:       () => void;
  seek:        (seconds: number) => void;
  setVolume:   (trackId: string, value: number) => void;
  setPan:      (trackId: string, value: number) => void;
  toggleMute:  (trackId: string) => void;
  setFx:        (trackId: string, fx: Partial<TrackFx>) => void;
  addPadTrack:  (pad: { id: string; name: string; driveFileId: string }) => Promise<void>;
  removePadTrack: (trackId: string) => void;
};

// ── Algorithmic reverb IR ─────────────────────────────────────────────────────
function buildRoomIR(ctx: AudioContext): AudioBuffer {
  const sr     = ctx.sampleRate;
  const dur    = 2.0;   // seconds
  const decay  = 3;
  const length = Math.floor(sr * dur);
  const ir     = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
}

// ── Apply FX values to nodes (no state update) ────────────────────────────────
function applyFxToNodes(ts: TrackState, fx: TrackFx) {
  if (ts.hpfNode)       ts.hpfNode.frequency.value  = fx.hpfEnabled  ? 80    : 20;
  if (ts.lpfNode)       ts.lpfNode.frequency.value   = fx.lpfEnabled  ? 8000  : 20000;
  if (ts.compNode) {
    ts.compNode.threshold.value = fx.compEnabled ? -24 : 0;
    ts.compNode.ratio.value     = fx.compEnabled ? 4   : 1;
    ts.compNode.attack.value    = 0.01;
    ts.compNode.release.value   = 0.25;
    ts.compNode.knee.value      = 6;
  }
  if (ts.dryGain)      ts.dryGain.gain.value      = 1 - fx.reverbWet;
  if (ts.reverbWetGain) ts.reverbWetGain.gain.value = fx.reverbWet;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useMultitrackEngine(): MultitrackEngine {
  const ctxRef         = useRef<AudioContext | null>(null);
  const sourcesRef     = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const startTimeRef   = useRef<number>(0);
  const offsetRef      = useRef<number>(0);
  const rafRef         = useRef<number>(0);
  const isPlayingRef   = useRef<boolean>(false);
  const tracksRef      = useRef<TrackState[]>([]);
  const durationRef    = useRef<number>(0);
  const generationRef  = useRef<number>(0);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const irBufferRef    = useRef<AudioBuffer | null>(null);

  // Metronome
  const metronomeActiveRef = useRef<boolean>(false);
  const metronomeBpmRef    = useRef<number>(120);
  const nextClickTimeRef   = useRef<number>(0);
  const metronomeTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // State
  const [tracks,          setTracks]          = useState<TrackState[]>([]);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [metronomeBpm,    setMetronomeBpmState] = useState(120);

  function syncTracks(t: TrackState[])  { tracksRef.current = t; setTracks(t); }
  function syncPlaying(v: boolean)      { isPlayingRef.current = v; setIsPlaying(v); }
  function syncDuration(v: number)      { durationRef.current = v; setDuration(v); }

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }

  async function ensureCtxRunning(): Promise<AudioContext> {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  function getOrCreateIR(ctx: AudioContext): AudioBuffer {
    if (!irBufferRef.current) irBufferRef.current = buildRoomIR(ctx);
    return irBufferRef.current;
  }

  function disconnectTrackNodes() {
    for (const ts of tracksRef.current) {
      ts.gainNode?.disconnect();
      ts.panNode?.disconnect();
      ts.hpfNode?.disconnect();
      ts.lpfNode?.disconnect();
      ts.compNode?.disconnect();
      ts.convolver?.disconnect();
      ts.dryGain?.disconnect();
      ts.reverbWetGain?.disconnect();
      ts.analyserNode?.disconnect();
    }
  }

  // ── Metronome ───────────────────────────────────────────────────────────────
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
    const beatDur = 60 / metronomeBpmRef.current;
    const ahead   = 0.12;
    while (nextClickTimeRef.current < ctx.currentTime + ahead) {
      const beatIdx = Math.round(
        (nextClickTimeRef.current - startTimeRef.current + offsetRef.current) / beatDur,
      );
      scheduleClick(ctx, nextClickTimeRef.current, beatIdx % 4 === 0);
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

  function syncNextClickTime(ctx: AudioContext, startAt: number, fromOffset: number) {
    const beatDur = 60 / metronomeBpmRef.current;
    const beatsElapsed    = Math.floor(fromOffset / beatDur);
    const nextBeatOffset  = (beatsElapsed + 1) * beatDur;
    const secsUntilBeat   = nextBeatOffset - fromOffset;
    nextClickTimeRef.current = startAt + secsUntilBeat;
  }

  // ── Sources ─────────────────────────────────────────────────────────────────
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

    // Count only non-loop tracks for natural-end detection
    let nonLoopCount = 0;
    for (const ts of tracksRef.current) {
      if (!ts.buffer || !ts.gainNode || ts.loadState !== "ready") continue;
      if (!ts.loop && fromOffset < ts.buffer.duration) nonLoopCount++;
    }
    let nonLoopEnded = 0;

    for (const ts of tracksRef.current) {
      if (!ts.buffer || !ts.gainNode || ts.loadState !== "ready") continue;
      const source = ctx.createBufferSource();
      source.buffer = ts.buffer;
      if (ts.loop) {
        source.loop = true;
      } else {
        if (fromOffset >= ts.buffer.duration) continue;
      }
      source.connect(ts.gainNode);
      source.start(startAt, ts.loop ? (fromOffset % ts.buffer.duration) : fromOffset);
      sourcesRef.current.set(ts.id, source);
      if (!ts.loop) {
        source.onended = () => {
          if (generationRef.current !== gen) return;
          sourcesRef.current.delete(ts.id);
          nonLoopEnded++;
          if (nonLoopEnded >= nonLoopCount && isPlayingRef.current) handleNaturalEnd(dur);
        };
      }
    }

    if (metronomeActiveRef.current) syncNextClickTime(ctx, startAt, fromOffset);
  }

  function handleNaturalEnd(dur: number) {
    cancelAnimationFrame(rafRef.current);
    stopMetronomeScheduler();
    offsetRef.current = 0;
    setCurrentTime(dur);
    syncPlaying(false);
  }

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

  // ── loadSong ────────────────────────────────────────────────────────────────
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
      loop: false,
      buffer: null, gainNode: null, panNode: null,
      hpfNode: null, lpfNode: null, compNode: null,
      convolver: null, dryGain: null, reverbWetGain: null,
      analyserNode: null,
      volume: t.trackType === "CLICK" ? 0.5 : 1,
      pan: 0, muted: false, fx: { ...DEFAULT_FX },
      loadState: "loading",
    }));
    syncTracks(initStates);
    setIsLoading(true);

    const ctx = await ensureCtxRunning();
    const ir  = getOrCreateIR(ctx);

    const results = await Promise.allSettled(
      songTracks.map(async (t) => {
        let audioBuffer = bufferCacheRef.current.get(t.driveFileId) ?? null;
        if (!audioBuffer) {
          const res = await fetch(`/api/audio-proxy?fileId=${encodeURIComponent(t.driveFileId)}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          audioBuffer = await ctx.decodeAudioData(await res.arrayBuffer());
          bufferCacheRef.current.set(t.driveFileId, audioBuffer);
        }

        // Build audio graph:
        // source → gain → pan → hpf → lpf → comp → dryGain  ─────────────────→ analyser → dest
        //                                         └→ convolver → reverbWetGain ──→ analyser
        const gainNode      = ctx.createGain();
        const panNode       = ctx.createStereoPanner();
        const hpfNode       = ctx.createBiquadFilter();
        const lpfNode       = ctx.createBiquadFilter();
        const compNode      = ctx.createDynamicsCompressor();
        const convolver     = ctx.createConvolver();
        const dryGain       = ctx.createGain();
        const reverbWetGain = ctx.createGain();
        const analyserNode  = ctx.createAnalyser();
        analyserNode.fftSize = 256;

        // HPF (low-cut) — bypassed by default (20 Hz ≈ no filtering)
        hpfNode.type            = "highpass";
        hpfNode.frequency.value = 20;
        hpfNode.Q.value         = 0.7;

        // LPF (high-cut) — bypassed by default (20 kHz ≈ no filtering)
        lpfNode.type            = "lowpass";
        lpfNode.frequency.value = 20000;
        lpfNode.Q.value         = 0.7;

        // Compressor — bypass default (ratio 1 = no compression)
        compNode.threshold.value = 0;
        compNode.ratio.value     = 1;
        compNode.attack.value    = 0.01;
        compNode.release.value   = 0.25;
        compNode.knee.value      = 6;

        // Reverb — wet 0 by default
        convolver.buffer = ir;
        dryGain.gain.value      = 1;
        reverbWetGain.gain.value = 0;

        // Wire it up
        gainNode.connect(panNode);
        panNode.connect(hpfNode);
        hpfNode.connect(lpfNode);
        lpfNode.connect(compNode);
        compNode.connect(dryGain);
        compNode.connect(convolver);
        convolver.connect(reverbWetGain);
        dryGain.connect(analyserNode);
        reverbWetGain.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        return { id: t.id, audioBuffer, gainNode, panNode, hpfNode, lpfNode, compNode, convolver, dryGain, reverbWetGain, analyserNode };
      }),
    );

    let maxDuration = 0;
    const updatedTracks = initStates.map((ts, i) => {
      const result = results[i];
      if (result?.status === "fulfilled") {
        const { audioBuffer, gainNode, panNode, hpfNode, lpfNode, compNode, convolver, dryGain, reverbWetGain, analyserNode } = result.value;
        gainNode.gain.value = ts.volume;
        panNode.pan.value   = 0;
        if (audioBuffer.duration > maxDuration) maxDuration = audioBuffer.duration;
        return { ...ts, buffer: audioBuffer, gainNode, panNode, hpfNode, lpfNode, compNode, convolver, dryGain, reverbWetGain, analyserNode, loadState: "ready" as const };
      }
      return { ...ts, loadState: "error" as const };
    });

    syncTracks(updatedTracks);
    syncDuration(maxDuration);
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Transport ───────────────────────────────────────────────────────────────
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

  // ── Mix controls ────────────────────────────────────────────────────────────
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

  const setFx = useCallback((trackId: string, patch: Partial<TrackFx>) => {
    const updated = tracksRef.current.map((ts) => {
      if (ts.id !== trackId) return ts;
      const fx = { ...ts.fx, ...patch };
      applyFxToNodes(ts, fx);
      return { ...ts, fx };
    });
    syncTracks(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Metronome controls ──────────────────────────────────────────────────────
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
  }, []);

  // ── Pad tracks ──────────────────────────────────────────────────────────────
  const addPadTrack = useCallback(async (pad: { id: string; name: string; driveFileId: string }) => {
    // Don't add duplicate
    if (tracksRef.current.some((t) => t.id === `pad-${pad.id}`)) return;

    const padTrackId = `pad-${pad.id}`;
    const padState: TrackState = {
      id: padTrackId, label: pad.name, trackType: "PAD", driveFileId: pad.driveFileId,
      loop: true,
      buffer: null, gainNode: null, panNode: null,
      hpfNode: null, lpfNode: null, compNode: null,
      convolver: null, dryGain: null, reverbWetGain: null,
      analyserNode: null,
      volume: 0.7, pan: 0, muted: false, fx: { ...DEFAULT_FX },
      loadState: "loading",
    };

    // Append to existing tracks
    const withPad = [...tracksRef.current, padState];
    syncTracks(withPad);

    try {
      const ctx = await ensureCtxRunning();
      const ir  = getOrCreateIR(ctx);

      let audioBuffer = bufferCacheRef.current.get(pad.driveFileId) ?? null;
      if (!audioBuffer) {
        const res = await fetch(`/api/audio-proxy?fileId=${encodeURIComponent(pad.driveFileId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        audioBuffer = await ctx.decodeAudioData(await res.arrayBuffer());
        bufferCacheRef.current.set(pad.driveFileId, audioBuffer);
      }

      // Build audio graph (same chain as loadSong)
      const gainNode      = ctx.createGain();
      const panNode       = ctx.createStereoPanner();
      const hpfNode       = ctx.createBiquadFilter();
      const lpfNode       = ctx.createBiquadFilter();
      const compNode      = ctx.createDynamicsCompressor();
      const convolver     = ctx.createConvolver();
      const dryGain       = ctx.createGain();
      const reverbWetGain = ctx.createGain();
      const analyserNode  = ctx.createAnalyser();
      analyserNode.fftSize = 256;

      hpfNode.type = "highpass"; hpfNode.frequency.value = 20; hpfNode.Q.value = 0.7;
      lpfNode.type = "lowpass";  lpfNode.frequency.value = 20000; lpfNode.Q.value = 0.7;
      compNode.threshold.value = 0; compNode.ratio.value = 1;
      compNode.attack.value = 0.01; compNode.release.value = 0.25; compNode.knee.value = 6;
      convolver.buffer = ir;
      dryGain.gain.value = 1; reverbWetGain.gain.value = 0;
      gainNode.gain.value = 0.7;

      gainNode.connect(panNode);
      panNode.connect(hpfNode); hpfNode.connect(lpfNode); lpfNode.connect(compNode);
      compNode.connect(dryGain); compNode.connect(convolver);
      convolver.connect(reverbWetGain);
      dryGain.connect(analyserNode); reverbWetGain.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      const readyPad: TrackState = {
        ...padState,
        buffer: audioBuffer, gainNode, panNode, hpfNode, lpfNode,
        compNode, convolver, dryGain, reverbWetGain, analyserNode,
        loadState: "ready",
      };

      const updated = tracksRef.current.map((t) => t.id === padTrackId ? readyPad : t);
      syncTracks(updated);

      // If currently playing, start the pad source immediately
      if (isPlayingRef.current) {
        const startAt = ctx.currentTime + 0.01;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(gainNode);
        const offset = (ctx.currentTime - startTimeRef.current + offsetRef.current);
        source.start(startAt, offset % audioBuffer.duration);
        sourcesRef.current.set(padTrackId, source);
      }
    } catch {
      const errTracks = tracksRef.current.map((t) =>
        t.id === padTrackId ? { ...t, loadState: "error" as const } : t,
      );
      syncTracks(errTracks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePadTrack = useCallback((trackId: string) => {
    // Stop and disconnect the source if playing
    const source = sourcesRef.current.get(trackId);
    if (source) {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
      sourcesRef.current.delete(trackId);
    }
    // Disconnect nodes
    const ts = tracksRef.current.find((t) => t.id === trackId);
    if (ts) {
      ts.gainNode?.disconnect(); ts.panNode?.disconnect();
      ts.hpfNode?.disconnect(); ts.lpfNode?.disconnect();
      ts.compNode?.disconnect(); ts.convolver?.disconnect();
      ts.dryGain?.disconnect(); ts.reverbWetGain?.disconnect();
      ts.analyserNode?.disconnect();
    }
    const updated = tracksRef.current.filter((t) => t.id !== trackId);
    syncTracks(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
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
    setVolume, setPan, toggleMute, setFx,
    addPadTrack, removePadTrack,
  };
}
