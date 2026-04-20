import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import type { WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { useSession } from "../src/context/SessionContext";
import { API_BASE } from "../src/lib/config";

// ── Types ──────────────────────────────────────────────────────────────────────

type SongTrack = {
  id: string;
  label: string;
  trackType: string;
  driveFileId: string;
  order: number;
};

type SetlistSongTracks = {
  setlistItemId: string;
  order: number;
  songTitle: string;
  key: string | null;
  leaderName: string | null;
  tracks: SongTrack[];
};

type TrackState = {
  id: string;
  label: string;
  trackType: string;
  driveFileId: string;
  volume: number;
  muted: boolean;
  loadState: "idle" | "downloading" | "loading" | "ready" | "error";
  level: Animated.Value;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const TRACK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  CLICK: "disc-outline",
  GUIDE_VOCAL: "mic-outline",
  FULL_BAND: "musical-notes-outline",
  PAD: "keypad-outline",
  BASS: "radio-outline",
  STEM_KEYS: "keypad-outline",
  STEM_GUITAR: "musical-note-outline",
  STEM_DRUMS: "disc-outline",
  STEM_BACKING: "musical-notes-outline",
};

const TRACK_COLORS: Record<string, string> = {
  CLICK: "#ef4444", GUIDE_VOCAL: "#f59e0b", FULL_BAND: "#7cf2a2", PAD: "#818cf8",
  BASS: "#06b6d4", STEM_KEYS: "#a78bfa", STEM_GUITAR: "#fb923c",
  STEM_DRUMS: "#f87171", STEM_BACKING: "#94a3b8",
};

const TRACK_LABELS: Record<string, string> = {
  CLICK: "Clique", GUIDE_VOCAL: "Guia Vocal", FULL_BAND: "Banda Completa", PAD: "Pad",
  BASS: "Baixo", STEM_KEYS: "Teclado", STEM_GUITAR: "Guitarra",
  STEM_DRUMS: "Bateria", STEM_BACKING: "Backing",
};

// ── Audio Engine HTML ─────────────────────────────────────────────────────────
// Hidden WebView with Chromium's native Web Audio API.
// React Native downloads files and passes base64 → this engine decodes + plays.
// Transport (play/pause/seek) uses the SAME algorithm as the web version.
const AUDIO_ENGINE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body><script>
(function() {
  var ctx = null;
  var sources = new Map();
  var startTimeRef = 0;
  var offsetRef = 0;
  var generationRef = 0;
  var durationRef = 0;
  var isPlayingRef = false;
  var tracksRef = [];
  var expectedTracks = [];
  var decodedBuffers = new Map(); // trackId → AudioBuffer | null(error)
  var rafId = null;
  var lastPostMs = 0;

  function post(data) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch(e) {}
  }

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function ensureCtxRunning() {
    var c = getCtx();
    if (c.state === 'suspended') return c.resume().then(function() { return c; });
    return Promise.resolve(c);
  }

  function stopAllSources() {
    generationRef++;
    sources.forEach(function(node) {
      try { node.stop(); } catch(e) {}
      node.disconnect();
    });
    sources.clear();
  }

  // Exact same as web: source.start(ctx.currentTime + 0.01, fromOffset)
  function startAllSources(c, fromOffset) {
    stopAllSources();
    var gen = generationRef;
    var startAt = c.currentTime + 0.01;
    startTimeRef = startAt;
    tracksRef.forEach(function(ts) {
      if (!ts.buffer || !ts.gainNode || ts.loadState !== 'ready') return;
      if (fromOffset >= ts.buffer.duration) return;
      var source = c.createBufferSource();
      source.buffer = ts.buffer;
      source.connect(ts.gainNode);
      source.start(startAt, fromOffset);
      sources.set(ts.id, source);
      source.onended = function() {
        if (generationRef !== gen) return;
        sources.delete(ts.id);
        if (sources.size === 0 && isPlayingRef) handleNaturalEnd();
      };
    });
  }

  function handleNaturalEnd() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    offsetRef = 0; isPlayingRef = false;
    post({ type: 'ended' });
  }

  function startTicker() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    function tick() {
      var c = ctx; if (!c) return;
      var elapsed = c.currentTime - startTimeRef + offsetRef;
      var dur = durationRef;
      if (dur > 0 && elapsed >= dur) {
        cancelAnimationFrame(rafId); rafId = null;
        stopAllSources(); offsetRef = 0; isPlayingRef = false;
        post({ type: 'ended' }); return;
      }
      var now = performance.now();
      if (now - lastPostMs >= 32) { // ~30fps bridge limit
        post({ type: 'position', pos: Math.max(0, elapsed), dur: dur });
        lastPostMs = now;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  // Called by React Native before sending buffers for a new song
  window.prepareSong = function(tracks) {
    stopAllSources();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    tracksRef.forEach(function(ts) { if (ts.gainNode) ts.gainNode.disconnect(); });
    tracksRef = []; decodedBuffers.clear();
    expectedTracks = tracks;
    offsetRef = 0; isPlayingRef = false; durationRef = 0;
    post({ type: 'loading', value: true });
  };

  // Called by React Native with the base64-encoded MP3 for each track.
  // base64 may be null if the download failed on the RN side.
  window.receiveBuffer = function(trackId, base64) {
    if (!base64) {
      decodedBuffers.set(trackId, null);
      post({ type: 'bufferError', trackId: trackId, msg: 'Download failed' });
      checkAllDecoded();
      return;
    }
    ensureCtxRunning().then(function(c) {
      // Decode base64 → ArrayBuffer (same logic as old RN approach, now in Chromium)
      var raw = atob(base64);
      var ab = new ArrayBuffer(raw.length);
      var u8 = new Uint8Array(ab);
      for (var i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
      return c.decodeAudioData(ab);
    }).then(function(audioBuffer) {
      decodedBuffers.set(trackId, audioBuffer);
      post({ type: 'bufferReady', trackId: trackId });
      checkAllDecoded();
    }).catch(function(err) {
      decodedBuffers.set(trackId, null); // null = error marker
      post({ type: 'bufferError', trackId: trackId, msg: String(err) });
      checkAllDecoded();
    });
  };

  function checkAllDecoded() {
    var allDone = expectedTracks.length > 0 &&
      expectedTracks.every(function(t) { return decodedBuffers.has(t.id); });
    if (allDone) finalizeSong();
  }

  function finalizeSong() {
    var c = getCtx();
    var maxDuration = 0;
    tracksRef = expectedTracks.map(function(t) {
      var buf = decodedBuffers.get(t.id);
      if (!buf) return Object.assign({}, t, { buffer: null, gainNode: null, loadState: 'error' });
      var gn = c.createGain();
      gn.connect(c.destination);
      gn.gain.value = t.muted ? 0 : t.volume;
      if (buf.duration > maxDuration) maxDuration = buf.duration;
      return Object.assign({}, t, { buffer: buf, gainNode: gn, loadState: 'ready' });
    });
    durationRef = maxDuration;
    post({ type: 'loading', value: false });
    post({
      type: 'songLoaded', duration: maxDuration,
      tracks: tracksRef.map(function(t) {
        return { id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
          volume: t.volume, muted: t.muted, loadState: t.loadState };
      })
    });
  }

  // Transport commands
  function handleCommand(cmd) {
    switch (cmd.cmd) {
      case 'play':
        ensureCtxRunning().then(function(c) {
          startAllSources(c, offsetRef); startTicker();
          isPlayingRef = true;
          post({ type: 'playing', value: true });
        }); break;
      case 'pause':
        if (!isPlayingRef) break;
        if (ctx) offsetRef = Math.min(Math.max(0, ctx.currentTime - startTimeRef + offsetRef), durationRef);
        stopAllSources();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        isPlayingRef = false;
        post({ type: 'playing', value: false });
        post({ type: 'position', pos: offsetRef, dur: durationRef }); break;
      case 'seek':
        var clamped = Math.min(Math.max(0, cmd.seconds), durationRef);
        stopAllSources();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        offsetRef = clamped;
        post({ type: 'position', pos: clamped, dur: durationRef });
        if (isPlayingRef) {
          ensureCtxRunning().then(function(c) { startAllSources(c, clamped); startTicker(); });
        } break;
      case 'setVolume':
        tracksRef.forEach(function(ts) {
          if (ts.id === cmd.trackId && ts.gainNode) {
            ts.volume = cmd.value;
            ts.gainNode.gain.value = ts.muted ? 0 : cmd.value;
          }
        }); break;
      case 'toggleMute':
        tracksRef.forEach(function(ts) {
          if (ts.id === cmd.trackId && ts.gainNode) {
            ts.muted = !ts.muted;
            ts.gainNode.gain.value = ts.muted ? 0 : ts.volume;
          }
        }); break;
    }
  }

  window.addEventListener('message', function(e) {
    try { handleCommand(JSON.parse(e.data)); } catch(err) {}
  });
  document.addEventListener('message', function(e) {
    try { handleCommand(JSON.parse(e.data)); } catch(err) {}
  });

  try { getCtx(); } catch(e) {} // pre-create context
  post({ type: 'ready' });
})();
</script></body></html>`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ── VU (8 bars) ───────────────────────────────────────────────────────────────

function VU({ level, color, muted }: { level: Animated.Value; color: string; muted: boolean }) {
  const bars = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => {
      const t = (i + 0.5) / 8;
      const c = muted ? "#1a2c44" : i >= 7 ? "#ef4444" : i >= 6 ? "#fbbf24" : color;
      return { i, c, op: level.interpolate({ inputRange: [Math.max(0, t - 0.14), t], outputRange: [0.08, 1], extrapolate: "clamp" }) };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, muted],
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 10, gap: 2, width: 72 }}>
      {bars.map(({ i, c, op }) => (
        <Animated.View key={i} style={{ flex: 1, height: 10, backgroundColor: c, borderRadius: 1, opacity: op }} />
      ))}
    </View>
  );
}

// ── Volume Slider ──────────────────────────────────────────────────────────────

function VolSlider({ value, onChange, color, disabled }: {
  value: number; onChange: (v: number) => void; color: string; disabled?: boolean;
}) {
  const wRef = useRef(0);
  const c = disabled ? "#1a2c44" : color;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (e) => onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)))),
    onPanResponderMove: (e) => onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)))),
  }), [onChange, disabled]);
  return (
    <View {...pan.panHandlers} onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; }}
      style={{ flex: 1, paddingVertical: 10, justifyContent: "center" }}>
      <View style={{ height: 1.5, backgroundColor: "#0e2033", borderRadius: 1 }}>
        <View style={{ height: 1.5, width: `${value * 100}%`, backgroundColor: c, borderRadius: 1 }} />
      </View>
      <View style={{ position: "absolute", left: `${value * 100}%`, width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginLeft: -4, top: "50%", marginTop: -4, elevation: 2 }} />
    </View>
  );
}

// ── SeekBar ────────────────────────────────────────────────────────────────────

function SeekBar({ posAnim, duration, onSeekStart, onSeekEnd }: {
  posAnim: Animated.Value;
  duration: number;
  onSeekStart: () => void;
  onSeekEnd: (s: number) => void;
}) {
  const wRef = useRef(0);
  const dragging = useRef(false);
  const dragPct = useRef(0);
  const fillWidth = posAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  const [displayTime, setDisplayTime] = useState("0:00");
  const [totalTime, setTotalTime] = useState("0:00");

  useEffect(() => { setTotalTime(fmt(duration)); }, [duration]);
  useEffect(() => {
    const id = posAnim.addListener(({ value }) => {
      if (!dragging.current) setDisplayTime(fmt(value * duration));
    });
    return () => posAnim.removeListener(id);
  }, [duration]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => duration > 0,
    onMoveShouldSetPanResponder: () => duration > 0,
    onPanResponderGrant: (e) => {
      dragging.current = true; onSeekStart();
      const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)));
      dragPct.current = pct; posAnim.setValue(pct); setDisplayTime(fmt(pct * duration));
    },
    onPanResponderMove: (e) => {
      const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, wRef.current)));
      dragPct.current = pct; posAnim.setValue(pct); setDisplayTime(fmt(pct * duration));
    },
    onPanResponderRelease: () => { dragging.current = false; onSeekEnd(dragPct.current * duration); },
  }), [duration, onSeekStart, onSeekEnd]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
      <Text style={{ color: "#4a7a9b", fontSize: 11, minWidth: 32, textAlign: "right" }}>{displayTime}</Text>
      <View {...pan.panHandlers} onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; }}
        style={{ flex: 1, paddingVertical: 12, justifyContent: "center" }}>
        <View style={{ height: 3, backgroundColor: "#0e2033", borderRadius: 2 }}>
          <Animated.View style={{ height: 3, width: fillWidth, backgroundColor: "#1ecad3", borderRadius: 2 }} />
        </View>
        <Animated.View style={{
          position: "absolute", left: fillWidth, width: 13, height: 13, borderRadius: 7,
          backgroundColor: "#1ecad3", borderWidth: 2, borderColor: "#060e1a",
          marginLeft: -7, top: "50%", marginTop: -7, elevation: 3,
        }} />
      </View>
      <Text style={{ color: "#4a7a9b", fontSize: 11, minWidth: 32 }}>{totalTime}</Text>
    </View>
  );
}

// ── Track Row ─────────────────────────────────────────────────────────────────

function TrackRow({ track, onVolumeChange, onMuteToggle }: {
  track: TrackState; onVolumeChange: (v: number) => void; onMuteToggle: () => void;
}) {
  const ac = TRACK_COLORS[track.trackType] ?? "#94a3b8";
  const c = track.muted ? "#2a3f58" : ac;
  const icon = TRACK_ICONS[track.trackType] ?? "musical-notes-outline";
  const label = TRACK_LABELS[track.trackType] ?? track.label;
  const ready = track.loadState === "ready";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#091525", opacity: track.loadState === "error" ? 0.4 : 1, gap: 8 }}>
      <Pressable onPress={onMuteToggle} style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: track.muted ? "#1a2c44" : ac + "70", backgroundColor: track.muted ? "#091525" : ac + "15", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
        <Ionicons name={track.muted ? "volume-mute-outline" : icon} size={16} color={track.muted ? "#2a3f58" : ac} />
      </Pressable>
      <Text style={{ color: c, fontSize: 12, fontWeight: "700", width: 68 }} numberOfLines={1}>{label}</Text>
      {track.loadState === "downloading" && (
        <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
          <ActivityIndicator size="small" color={ac} />
          <Text style={{ color: "#4a7a9b", fontSize: 9 }}>Baixando...</Text>
        </View>
      )}
      {track.loadState === "loading" && <View style={{ flex: 1, alignItems: "center" }}><ActivityIndicator size="small" color={ac} /></View>}
      {track.loadState === "error" && <Text style={{ color: "#ef4444", fontSize: 10, flex: 1 }}>ERRO</Text>}
      {ready && (
        <>
          <VU level={track.level} color={c} muted={track.muted} />
          <VolSlider value={track.volume} onChange={onVolumeChange} color={c} disabled={track.muted} />
          <Text style={{ color: c, fontSize: 10, fontWeight: "700", width: 24, textAlign: "right" }}>{Math.round(track.volume * 100)}</Text>
        </>
      )}
    </View>
  );
}

// ── Song Card ─────────────────────────────────────────────────────────────────

function SongCard({ song, isActive, isLoading, onPress }: {
  song: SetlistSongTracks; isActive: boolean; isLoading: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(isActive ? 1.04 : 1)).current;
  const op = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: isActive ? 1.04 : 1, useNativeDriver: true, friction: 7, tension: 140 }),
      Animated.timing(op, { toValue: isActive ? 1 : 0.45, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [isActive]);
  return (
    <Pressable onPress={onPress} disabled={isLoading && isActive} style={{ marginRight: 8 }}>
      <Animated.View style={{ transform: [{ scale }], opacity: op, width: 108, borderRadius: 10, borderWidth: 1.5, borderColor: isActive ? "#1ecad3" : "#10253a", backgroundColor: isActive ? "#071a28" : "#0a1825", padding: 9 }}>
        <Text style={{ color: isActive ? "#1ecad3" : "#2a4060", fontSize: 9, fontWeight: "700", marginBottom: 3 }}>#{song.order}</Text>
        <Text style={{ color: isActive ? "#dde8f5" : "#5a7a9b", fontSize: 11, fontWeight: "700", marginBottom: 2 }} numberOfLines={2}>{song.songTitle}</Text>
        {song.key ? <Text style={{ color: isActive ? "#1ecad3" : "#1e3a54", fontSize: 10 }}>{song.key}</Text> : null}
        <Text style={{ color: "#132035", fontSize: 9, marginTop: 3 }}>{song.tracks.length} faixas</Text>
        {isActive && isLoading && <ActivityIndicator size="small" color="#1ecad3" style={{ marginTop: 4, alignSelf: "flex-start" }} />}
      </Animated.View>
    </Pressable>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MultitrackScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { accessToken } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Setlist
  const [songTracks, setSongTracks] = useState<SetlistSongTracks[]>([]);
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const cardScrollRef = useRef<ScrollView>(null);

  // ── WebView engine ────────────────────────────────────────────────────────
  const webViewRef = useRef<WebView>(null);
  const engineReadyRef = useRef(false);
  const pendingCmdRef = useRef<object | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tracksState, setTracksState] = useState<TrackState[]>([]);
  const tracksRef = useRef<TrackState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [duration, setDuration] = useState(0);
  const posAnim = useRef(new Animated.Value(0)).current;
  const durationRef = useRef(0);
  const draggingRef = useRef(false);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function syncTracks(t: TrackState[]) { tracksRef.current = t; setTracksState(t); }
  function syncPlaying(v: boolean) { isPlayingRef.current = v; setIsPlaying(v); }

  // ── Send command to WebView ───────────────────────────────────────────────
  const sendCmd = useCallback((cmd: object) => {
    if (!engineReadyRef.current) { pendingCmdRef.current = cmd; return; }
    const js = `(function(){try{var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(cmd))}});window.dispatchEvent(e);}catch(err){}})();true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  // ── Call a global function in the WebView ─────────────────────────────────
  const callEngine = useCallback((js: string) => {
    if (engineReadyRef.current) {
      webViewRef.current?.injectJavaScript(js);
    }
  }, []);

  // ── Handle messages from WebView ──────────────────────────────────────────
  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>; } catch { return; }

    switch (msg.type) {
      case "ready":
        engineReadyRef.current = true;
        if (pendingCmdRef.current) { const cmd = pendingCmdRef.current; pendingCmdRef.current = null; sendCmd(cmd); }
        break;

      case "loading":
        setIsLoadingSong(Boolean(msg.value));
        break;

      case "bufferReady":
        // Update individual track UI to show it finished decoding
        setTracksState((prev) => {
          const next = prev.map((ts) => ts.id === msg.trackId ? { ...ts, loadState: "loading" as const } : ts);
          tracksRef.current = next;
          return next;
        });
        break;

      case "bufferError":
        setTracksState((prev) => {
          const next = prev.map((ts) => ts.id === msg.trackId ? { ...ts, loadState: "error" as const } : ts);
          tracksRef.current = next;
          return next;
        });
        break;

      case "songLoaded": {
        const dur = typeof msg.duration === "number" ? msg.duration : 0;
        durationRef.current = dur;
        setDuration(dur);
        posAnim.setValue(0);
        const raw = (msg.tracks ?? []) as Array<{
          id: string; label: string; trackType: string; driveFileId: string;
          volume: number; muted: boolean; loadState: string;
        }>;
        const newTracks: TrackState[] = raw.map((t) => {
          const existing = tracksRef.current.find((ts) => ts.id === t.id);
          return {
            id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
            volume: t.volume, muted: t.muted,
            loadState: t.loadState as TrackState["loadState"],
            level: existing?.level ?? new Animated.Value(0),
          };
        });
        syncTracks(newTracks);
        break;
      }

      case "position": {
        if (draggingRef.current) break;
        const pos = typeof msg.pos === "number" ? msg.pos : 0;
        const dur = typeof msg.dur === "number" ? msg.dur : 0;
        if (dur > 0) posAnim.setValue(pos / dur);
        break;
      }

      case "playing":
        syncPlaying(Boolean(msg.value));
        if (msg.value) startLevel(); else stopLevel();
        break;

      case "ended":
        syncPlaying(false);
        posAnim.setValue(0);
        stopLevel();
        break;
    }
  }, [sendCmd]);

  // ── Level animations ──────────────────────────────────────────────────────
  function startLevel() {
    stopLevel();
    levelTimerRef.current = setInterval(() => {
      tracksRef.current.forEach((t) => {
        if (t.loadState !== "ready") return;
        Animated.timing(t.level, { toValue: t.muted ? 0 : Math.random() * 0.75 + 0.12, duration: 100, useNativeDriver: false }).start();
      });
    }, 120);
  }

  function stopLevel() {
    if (levelTimerRef.current !== null) { clearInterval(levelTimerRef.current); levelTimerRef.current = null; }
    tracksRef.current.forEach((t) => Animated.timing(t.level, { toValue: 0, duration: 280, useNativeDriver: false }).start());
  }

  useEffect(() => {
    return () => { stopLevel(); sendCmd({ cmd: "pause" }); };
  }, []);

  // Fetch setlist
  useEffect(() => {
    if (!eventId) { setLoadingSetlist(false); return; }
    setLoadingSetlist(true);
    const h: Record<string, string> = {};
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/setlist/tracks`, { headers: h })
      .then((r) => r.json() as Promise<{ ok: boolean; songTracks?: SetlistSongTracks[]; message?: string }>)
      .then((b) => {
        if (!b.ok) throw new Error(b.message ?? "Erro ao carregar faixas");
        setSongTracks(b.songTracks ?? []);
      })
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : "Erro desconhecido"))
      .finally(() => setLoadingSetlist(false));
  }, [eventId, accessToken]);

  // ── Load song: RN downloads → WebView decodes ─────────────────────────────
  const loadSong = useCallback(async (song: SetlistSongTracks) => {
    syncPlaying(false);
    stopLevel();
    posAnim.setValue(0);
    setDuration(0);
    durationRef.current = 0;

    const sorted = [...song.tracks].sort((a, b) => a.order - b.order);
    if (sorted.length === 0) { syncTracks([]); return; }

    // Init track states
    const initStates: TrackState[] = sorted.map((t) => ({
      id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
      volume: t.trackType === "CLICK" ? 0.5 : 1,
      muted: false, loadState: "downloading" as const,
      level: new Animated.Value(0),
    }));
    syncTracks(initStates);
    setIsLoadingSong(true);

    // Tell WebView to prepare for this song
    const trackMeta = sorted.map((t) => ({
      id: t.id, label: t.label, trackType: t.trackType, driveFileId: t.driveFileId,
      volume: t.trackType === "CLICK" ? 0.5 : 1, muted: false,
    }));
    callEngine(`window.prepareSong(${JSON.stringify(trackMeta)}); true;`);

    // Download each file then pass base64 to WebView
    await Promise.allSettled(sorted.map(async (t) => {
      try {
        const key = t.driveFileId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
        const localUri = `${FileSystem.cacheDirectory ?? ""}mt_${key}.mp3`;

        // Download if not cached
        const info = await FileSystem.getInfoAsync(localUri);
        if (!info.exists) {
          const h: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
          await FileSystem.downloadAsync(
            `${API_BASE}/audio-proxy?fileId=${encodeURIComponent(t.driveFileId)}`,
            localUri, { headers: h },
          );
        }

        // Update UI: downloading → decoding
        setTracksState((prev) => {
          const next = prev.map((ts) => ts.id === t.id ? { ...ts, loadState: "loading" as const } : ts);
          tracksRef.current = next;
          return next;
        });

        // Read as base64 and pass to WebView for decoding
        const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
        // Use injectJavaScript to call window.receiveBuffer directly (avoids JSON message overhead)
        webViewRef.current?.injectJavaScript(
          `window.receiveBuffer(${JSON.stringify(t.id)}, ${JSON.stringify(base64)}); true;`,
        );
      } catch (err) {
        setTracksState((prev) => {
          const next = prev.map((ts) => ts.id === t.id ? { ...ts, loadState: "error" as const } : ts);
          tracksRef.current = next;
          return next;
        });
        // Tell WebView this track errored so it doesn't wait forever
        callEngine(`window.receiveBuffer(${JSON.stringify(t.id)}, null); true;`);
      }
    }));
  }, [accessToken, callEngine]);

  useEffect(() => {
    const song = songTracks[currentSongIndex];
    if (!song) return;
    void loadSong(song);
    setTimeout(() => cardScrollRef.current?.scrollTo({ x: currentSongIndex * 120, animated: true }), 80);
  }, [currentSongIndex, songTracks]);

  // ── Transport ─────────────────────────────────────────────────────────────

  const play = useCallback(() => { sendCmd({ cmd: "play" }); }, [sendCmd]);
  const pause = useCallback(() => { sendCmd({ cmd: "pause" }); }, [sendCmd]);
  const seek = useCallback((seconds: number) => { sendCmd({ cmd: "seek", seconds }); }, [sendCmd]);

  const setVolume = useCallback((trackId: string, value: number) => {
    sendCmd({ cmd: "setVolume", trackId, value });
    syncTracks(tracksRef.current.map((ts) => ts.id === trackId ? { ...ts, volume: value } : ts));
  }, [sendCmd]);

  const toggleMute = useCallback((trackId: string) => {
    const ts = tracksRef.current.find((t) => t.id === trackId);
    if (!ts) return;
    const nextMuted = !ts.muted;
    sendCmd({ cmd: "toggleMute", trackId });
    if (nextMuted) Animated.timing(ts.level, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    syncTracks(tracksRef.current.map((t) => t.id === trackId ? { ...t, muted: nextMuted } : t));
  }, [sendCmd]);

  async function switchSong(idx: number) {
    if (idx < 0 || idx >= songTracks.length || isLoadingSong) return;
    if (isPlayingRef.current) pause();
    setCurrentSongIndex(idx);
  }

  const handleSeekStart = useCallback(() => {
    draggingRef.current = true;
    stopLevel();
  }, []);

  const handleSeekEnd = useCallback((s: number) => {
    draggingRef.current = false;
    seek(s);
    if (isPlayingRef.current) startLevel();
  }, [seek]);

  const currentSong = songTracks[currentSongIndex] ?? null;
  const canPlay = tracksState.some((t) => t.loadState === "ready") && !isLoadingSong;
  const readyCount = tracksState.filter((t) => t.loadState === "ready").length;

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadingSetlist) return (
    <View style={{ flex: 1, backgroundColor: "#060e1a", justifyContent: "center", alignItems: "center", paddingTop: insets.top }}>
      <ActivityIndicator color="#1ecad3" size="large" />
      <Text style={{ color: "#4a7a9b", marginTop: 14, fontSize: 13 }}>Carregando setlist...</Text>
    </View>
  );
  if (fetchError) return (
    <View style={{ flex: 1, backgroundColor: "#060e1a", justifyContent: "center", alignItems: "center", padding: 24, paddingTop: insets.top }}>
      <Text style={{ color: "#ef4444", fontSize: 13, textAlign: "center", marginBottom: 20 }}>{fetchError}</Text>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: "#1ecad3", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ color: "#1ecad3", fontWeight: "700" }}>← Voltar</Text>
      </Pressable>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#060e1a", paddingTop: insets.top }}>

      {/* Hidden WebView — Chromium Web Audio API engine */}
      <WebView
        ref={webViewRef}
        source={{ html: AUDIO_ENGINE_HTML }}
        style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
      />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#07101d", borderBottomWidth: 1, borderBottomColor: "#0e2033" }}>
        <Pressable onPress={() => { pause(); router.back(); }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: "#4a7a9b", fontSize: 13, fontWeight: "600" }}>← Voltar</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#1ecad3", fontSize: 13, fontWeight: "800", letterSpacing: 1.5 }}>VS AO VIVO</Text>
          {isLoadingSong && tracksState.length > 0 && (
            <Text style={{ color: "#4a7a9b", fontSize: 9, marginTop: 1 }}>{readyCount}/{tracksState.length} prontas</Text>
          )}
        </View>
        <Pressable onPress={() => { pause(); router.push("/present"); }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: "#4a7a9b", fontSize: 13, fontWeight: "600" }}>Apresentar →</Text>
        </Pressable>
      </View>

      {/* Song carousel */}
      <ScrollView ref={cardScrollRef} horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        style={{ backgroundColor: "#07101d", borderBottomWidth: 1, borderBottomColor: "#0e2033", maxHeight: 112 }}>
        {songTracks.length === 0
          ? <View style={{ justifyContent: "center" }}><Text style={{ color: "#2a4060", fontSize: 13 }}>Nenhuma faixa no setlist.</Text></View>
          : songTracks.map((song, i) => (
            <SongCard key={song.setlistItemId} song={song} isActive={i === currentSongIndex} isLoading={isLoadingSong && i === currentSongIndex} onPress={() => void switchSong(i)} />
          ))
        }
      </ScrollView>

      {/* Track list */}
      <ScrollView style={{ flex: 1 }}>
        {isLoadingSong && tracksState.length === 0 && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color="#1ecad3" />
            <Text style={{ color: "#4a7a9b", marginTop: 12, fontSize: 12 }}>Preparando faixas...</Text>
          </View>
        )}
        {!isLoadingSong && tracksState.length === 0 && currentSong && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Text style={{ color: "#2a4060", fontSize: 13 }}>Esta música não tem faixas.</Text>
          </View>
        )}
        {tracksState.map((t) => (
          <TrackRow key={t.id} track={t} onVolumeChange={(v) => setVolume(t.id, v)} onMuteToggle={() => toggleMute(t.id)} />
        ))}
      </ScrollView>

      {/* Transport */}
      <View style={{ backgroundColor: "#07101d", borderTopWidth: 1, borderTopColor: "#0e2033", paddingBottom: Math.max(insets.bottom, 8) }}>
        {currentSong && (
          <View style={{ paddingHorizontal: 16, paddingTop: 10, alignItems: "center" }}>
            <Text style={{ color: "#dde8f5", fontSize: 14, fontWeight: "800" }} numberOfLines={1}>{currentSong.songTitle}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
              {currentSong.key ? <Text style={{ color: "#1ecad3", fontSize: 11, fontWeight: "600" }}>Tom: {currentSong.key}</Text> : null}
              {currentSong.leaderName ? <Text style={{ color: "#2a4060", fontSize: 11 }}>{currentSong.leaderName}</Text> : null}
            </View>
          </View>
        )}

        <SeekBar posAnim={posAnim} duration={duration} onSeekStart={handleSeekStart} onSeekEnd={handleSeekEnd} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32, paddingBottom: 4 }}>
          <Pressable onPress={() => void switchSong(currentSongIndex - 1)} disabled={currentSongIndex <= 0 || isLoadingSong} style={({ pressed }) => ({ opacity: (currentSongIndex <= 0 || isLoadingSong) ? 0.2 : pressed ? 0.5 : 1, padding: 6 })}>
            <Text style={{ fontSize: 20, color: "#5a7a9b" }}>⏮</Text>
          </Pressable>
          <Pressable
            onPress={() => void (isPlaying ? pause() : play())}
            disabled={!canPlay}
            style={({ pressed }) => ({ width: 58, height: 58, borderRadius: 29, backgroundColor: isPlaying ? "#071e14" : "#07101d", borderWidth: 2, borderColor: canPlay ? "#1ecad3" : "#0e2033", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1, shadowColor: "#1ecad3", shadowOpacity: canPlay ? 0.35 : 0, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: canPlay ? 6 : 0 })}
          >
            {isLoadingSong
              ? <ActivityIndicator color="#1ecad3" />
              : <Text style={{ fontSize: 24, color: canPlay ? "#1ecad3" : "#0e2033", marginLeft: isPlaying ? 0 : 2 }}>{isPlaying ? "⏸" : "▶"}</Text>
            }
          </Pressable>
          <Pressable onPress={() => void switchSong(currentSongIndex + 1)} disabled={currentSongIndex >= songTracks.length - 1 || isLoadingSong} style={({ pressed }) => ({ opacity: (currentSongIndex >= songTracks.length - 1 || isLoadingSong) ? 0.2 : pressed ? 0.5 : 1, padding: 6 })}>
            <Text style={{ fontSize: 20, color: "#5a7a9b" }}>⏭</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
