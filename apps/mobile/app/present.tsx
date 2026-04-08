import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  PanResponder,
  StatusBar,
  Platform,
  Vibration,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../src/context/SessionContext";
import { fetchSongs, fetchSongById } from "../src/lib/api";
import type { ParsedChart } from "@overflow/types";

// ─── Presentation screen — fullscreen mode for live worship events ─────────────

// ── Transposition helpers ──────────────────────────────────────────────────────
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const FLAT_PREFERRED = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

function noteToIndex(note: string): number {
  const i = NOTES_SHARP.indexOf(note);
  return i !== -1 ? i : NOTES_FLAT.indexOf(note);
}
function shiftNote(note: string, semitones: number): string {
  const i = noteToIndex(note);
  if (i === -1) return note;
  const j = ((i + semitones) % 12 + 12) % 12;
  const sharp = NOTES_SHARP[j];
  return FLAT_PREFERRED.has(sharp) ? NOTES_FLAT[j] : sharp;
}
function transposeToken(token: string, semitones: number): string {
  const m = token.match(/^([A-G][#b]?)(.*?)$/);
  if (!m) return token;
  const rest = m[2];
  const slashIdx = rest.indexOf("/");
  if (slashIdx !== -1) {
    const quality = rest.slice(0, slashIdx);
    const bassStr = rest.slice(slashIdx + 1);
    const bassMatch = bassStr.match(/^([A-G][#b]?)(.*)$/);
    if (bassMatch)
      return shiftNote(m[1], semitones) + quality + "/" + shiftNote(bassMatch[1], semitones) + bassMatch[2];
  }
  return shiftNote(m[1], semitones) + rest;
}
function transposeChordLine(content: string, semitones: number): string {
  if (semitones === 0) return content;
  return content.replace(/\S+/g, (token) => {
    if (!/^[A-G]/.test(token)) return token;
    return transposeToken(token, semitones);
  });
}
// Note names for display (cycle +/- 12 semitones from C)
const NOTE_NAMES = NOTES_SHARP;

export default function PresentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventSetlist } = useSession();

  const sortedItems = useMemo(
    () => [...(eventSetlist?.items ?? [])].sort((a, b) => a.order - b.order),
    [eventSetlist],
  );

  // ── State ─────────────────────────────────────────────────────────────────
  const [current, setCurrent] = useState(0);
  const [showNav, setShowNav] = useState(true);
  const [showCifra, setShowCifra] = useState(false);
  const [loadingCifra, setLoadingCifra] = useState(false);
  const [currentChart, setCurrentChart] = useState<ParsedChart | null>(null);

  // Auto-scroll controls
  const [fontSize, setFontSize] = useState(14);
  const [scrollSpeed, setScrollSpeed] = useState(2); // 1–10
  const [autoScrolling, setAutoScrolling] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollHeightRef = useRef(0);
  const scrollContainerRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transposition
  const [transposeSemitones, setTransposeSemitones] = useState(0);

  // Raw text fallback (when parsedJson is unavailable)
  const [currentRawText, setCurrentRawText] = useState<string | null>(null);

  // Metronome
  const [metroOn, setMetroOn] = useState(false);
  const [metroBpm, setMetroBpm] = useState(80);
  const [metroBeat, setMetroBeat] = useState(-1);
  const metroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metroBeatCountRef = useRef(0);

  // Stable refs to avoid stale closures in PanResponder
  const currentRef = useRef(current);
  currentRef.current = current;
  const sortedLengthRef = useRef(sortedItems.length);
  sortedLengthRef.current = sortedItems.length;

  // Chart cache: lower-cased songTitle → { parsed: ParsedChart | null; rawText: string | null }
  const chartCache = useRef<Map<string, { parsed: ParsedChart | null; rawText: string | null }>>(new Map());
  // Songs list cache: lower-cased title → song id
  const songIdCache = useRef<Map<string, string> | null>(null);

  // ── Auto-scroll engine ────────────────────────────────────────────────────
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    setAutoScrolling(false);
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    setAutoScrolling(true);
    autoScrollTimerRef.current = setInterval(() => {
      const next = scrollYRef.current + scrollSpeed;
      if (next >= scrollHeightRef.current - scrollContainerRef.current) {
        stopAutoScroll();
        return;
      }
      scrollViewRef.current?.scrollTo({ y: next, animated: false });
      scrollYRef.current = next;
    }, 30);
  }, [scrollSpeed, stopAutoScroll]);

  // Restart auto-scroll when speed changes while active
  useEffect(() => {
    if (autoScrolling) {
      startAutoScroll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSpeed]);

  // Stop auto-scroll when cifra is closed or song changes
  useEffect(() => {
    if (!showCifra) stopAutoScroll();
  }, [showCifra, stopAutoScroll]);

  // Reset rawText when song changes
  useEffect(() => {
    setCurrentRawText(null);
  }, [current]);

  // ── Metronome engine ──────────────────────────────────────────────────────
  useEffect(() => {
    if (metroIntervalRef.current) {
      clearInterval(metroIntervalRef.current);
      metroIntervalRef.current = null;
    }
    if (!metroOn) {
      setMetroBeat(-1);
      return;
    }
    const intervalMs = Math.round(60000 / metroBpm);
    metroBeatCountRef.current = 0;
    setMetroBeat(0);
    Vibration.vibrate(40);
    metroIntervalRef.current = setInterval(() => {
      metroBeatCountRef.current += 1;
      const beat = metroBeatCountRef.current % 4;
      setMetroBeat(beat);
      Vibration.vibrate(beat === 0 ? 60 : 30);
    }, intervalMs);
    return () => {
      if (metroIntervalRef.current) clearInterval(metroIntervalRef.current);
    };
  }, [metroOn, metroBpm]);

  // ── Auto-hide nav ─────────────────────────────────────────────────────────
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), 3000);
  }, []);

  useEffect(() => {
    resetNavTimer();
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= sortedItems.length) return;
      setCurrent(idx);
      setShowCifra(false);
      setCurrentChart(null);
      setTransposeSemitones(0);
      resetNavTimer();
    },
    [sortedItems.length, resetNavTimer],
  );

  // ── Swipe gesture ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60 && currentRef.current < sortedLengthRef.current - 1) {
          setCurrent((c) => c + 1);
          setShowCifra(false);
          setCurrentChart(null);
        } else if (gs.dx > 60 && currentRef.current > 0) {
          setCurrent((c) => c - 1);
          setShowCifra(false);
          setCurrentChart(null);
        }
        // Reset nav timer regardless
        setShowNav(true);
      },
    }),
  ).current;

  // ── Chart loading ─────────────────────────────────────────────────────────
  async function loadChart(title: string): Promise<{ parsed: ParsedChart | null; rawText: string | null }> {
    const key = title.toLowerCase().trim();
    if (chartCache.current.has(key)) return chartCache.current.get(key)!;

    // Lazy-load the songs list to look up song IDs by title
    if (!songIdCache.current) {
      const res = await fetchSongs();
      if (!res.ok || res.songs.length === 0) {
        // Do NOT cache: allow retry on next attempt
        return { parsed: null, rawText: null };
      }
      const map = new Map<string, string>();
      for (const s of res.songs) {
        map.set(s.title.toLowerCase().trim(), s.id);
      }
      songIdCache.current = map;
    }

    const songId = songIdCache.current.get(key);
    if (!songId) {
      // Song not in catalog — cache the miss so we don't re-fetch the list
      const empty = { parsed: null, rawText: null };
      chartCache.current.set(key, empty);
      return empty;
    }

    const res = await fetchSongById(songId);
    const firstChart = res.song?.chordCharts?.[0];
    const result = {
      parsed: firstChart?.parsedJson ?? null,
      rawText: firstChart?.rawText ?? null,
    };
    chartCache.current.set(key, result);
    return result;
  }

  async function handleToggleCifra() {
    if (showCifra) {
      setShowCifra(false);
      return;
    }
    const item = sortedItems[current];
    if (!item) return;

    // Check cache first for instant display
    const cacheKey = item.songTitle.toLowerCase().trim();
    if (chartCache.current.has(cacheKey)) {
      const cached = chartCache.current.get(cacheKey)!;
      setCurrentChart(cached.parsed);
      setCurrentRawText(cached.rawText);
      setShowCifra(true); // always open — cifra view handles "sem cifra"
      return;
    }

    setLoadingCifra(true);
    try {
      const result = await loadChart(item.songTitle);
      setCurrentChart(result.parsed);
      setCurrentRawText(result.rawText);
    } catch {
      setCurrentChart(null);
      setCurrentRawText(null);
    } finally {
      setLoadingCifra(false);
      setShowCifra(true); // always open after load attempt
    }
  }

  // ── Empty setlist guard ───────────────────────────────────────────────────
  if (sortedItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <StatusBar hidden />
        <Pressable style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.emptyText}>Setlist vazio.</Text>
      </View>
    );
  }

  const item = sortedItems[current];
  const isFirst = current === 0;
  const isLast = current === sortedItems.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* ── Close button — always visible ──────────────────────────────── */}
      <Pressable
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        hitSlop={16}
        accessibilityLabel="Fechar modo apresentação"
      >
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      {/* ── Main content area (swipe + tap to toggle nav) ──────────────── */}
      <View style={styles.mainArea} {...panResponder.panHandlers}>
        <Pressable style={{ flex: 1 }} onPress={resetNavTimer}>
            <View style={[styles.centerContent, showCifra && styles.centerContentCifra]}>
            {/* Position counter */}
            <Text style={styles.posText}>
              {current + 1} / {sortedItems.length}
            </Text>

            {!showCifra ? (
              <>
                {/* Song title */}
                <Text style={styles.titleText} numberOfLines={3} adjustsFontSizeToFit>
                  {item.songTitle}
                </Text>

                {/* Chips: key / leader / zone */}
                <View style={styles.chipsRow}>
                  {item.key ? (
                    <View style={[styles.chip, styles.chipGreen]}>
                      <Text style={[styles.chipText, { color: "#7cf2a2" }]}>🎵 {item.key}</Text>
                    </View>
                  ) : null}
                  {item.leaderName ? (
                    <View style={[styles.chip, styles.chipBlue]}>
                      <Text style={[styles.chipText, { color: "#a5c8ff" }]}>🎤 {item.leaderName}</Text>
                    </View>
                  ) : null}
                  {item.zone ? (
                    <View style={[styles.chip, styles.chipYellow]}>
                      <Text style={[styles.chipText, { color: "#fbbf24" }]}>◎ {item.zone}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Transition notes */}
                {item.transitionNotes ? (
                  <Text style={styles.transitionText}>{item.transitionNotes}</Text>
                ) : null}

                {/* Toggle chord chart */}
                <Pressable
                  style={styles.cifraToggleBtn}
                  onPress={() => void handleToggleCifra()}
                >
                  {loadingCifra ? (
                    <ActivityIndicator color="#1ecad3" />
                  ) : (
                    <Text style={styles.cifraToggleBtnText}>Ver cifra ▼</Text>
                  )}
                </Pressable>
              </>
            ) : (
              /* ── Chord chart view ───────────────────────────────────── */
              <View style={styles.cifraContainer}>
                <View style={styles.cifraHeader}>
                  <Text style={styles.cifraTitleText} numberOfLines={1}>
                    {item.songTitle}
                  </Text>
                  <Pressable onPress={() => setShowCifra(false)} hitSlop={8}>
                    <Text style={styles.cifraCloseText}>✕ Ocultar</Text>
                  </Pressable>
                </View>

                {/* ── Controls toolbar ─────────────────────────────────── */}
                <View style={styles.cifraToolbar}>
                  {/* Font size */}
                  <View style={styles.toolbarGroup}>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setFontSize((s) => Math.max(10, s - 2))}
                    >
                      <Text style={styles.toolBtnText}>A-</Text>
                    </Pressable>
                    <Text style={styles.toolLabel}>{fontSize}px</Text>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setFontSize((s) => Math.min(28, s + 2))}
                    >
                      <Text style={styles.toolBtnText}>A+</Text>
                    </Pressable>
                  </View>

                  {/* Scroll speed */}
                  <View style={styles.toolbarGroup}>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setScrollSpeed((s) => Math.max(1, s - 1))}
                    >
                      <Text style={styles.toolBtnText}>▼</Text>
                    </Pressable>
                    <Text style={styles.toolLabel}>vel {scrollSpeed}</Text>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setScrollSpeed((s) => Math.min(10, s + 1))}
                    >
                      <Text style={styles.toolBtnText}>▲</Text>
                    </Pressable>
                  </View>

                  {/* Play/stop */}
                  <Pressable
                    style={[styles.toolBtn, autoScrolling && styles.toolBtnActive]}
                    onPress={() => (autoScrolling ? stopAutoScroll() : startAutoScroll())}
                  >
                    <Text style={styles.toolBtnText}>{autoScrolling ? "⏹" : "▶"}</Text>
                  </Pressable>
                </View>

                {/* ── Row 2: Transpose + Metronome ─────────────────────── */}
                <View style={styles.cifraToolbar2}>
                  {/* Transpose */}
                  <View style={styles.toolbarGroup}>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setTransposeSemitones((s) => s - 1)}
                    >
                      <Text style={styles.toolBtnText}>−</Text>
                    </Pressable>
                    <Pressable
                      style={styles.toolBtnNeutral}
                      onPress={() => setTransposeSemitones(0)}
                    >
                      <Text style={styles.toolLabelAccent}>
                        {transposeSemitones === 0
                          ? "Tom ×"
                          : `${transposeSemitones > 0 ? "+" : ""}${transposeSemitones}`}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setTransposeSemitones((s) => s + 1)}
                    >
                      <Text style={styles.toolBtnText}>+</Text>
                    </Pressable>
                  </View>

                  {/* Metronome */}
                  <View style={styles.toolbarGroup}>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setMetroBpm((b) => Math.max(40, b - 5))}
                    >
                      <Text style={styles.toolBtnText}>−</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toolBtn, metroOn && styles.toolBtnActive]}
                      onPress={() => setMetroOn((v) => !v)}
                    >
                      <Text style={styles.toolBtnText}>♩{metroBpm}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.toolBtn}
                      onPress={() => setMetroBpm((b) => Math.min(240, b + 5))}
                    >
                      <Text style={styles.toolBtnText}>+</Text>
                    </Pressable>
                    {/* Beat dots */}
                    <View style={styles.beatDots}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.beatDot,
                            metroOn && metroBeat === i && (i === 0 ? styles.beatDotAccent : styles.beatDotOn),
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                <ScrollView
                  ref={scrollViewRef}
                  style={styles.cifraScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  scrollEventThrottle={16}
                  onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    scrollYRef.current = e.nativeEvent.contentOffset.y;
                  }}
                  onContentSizeChange={(_w, h) => { scrollHeightRef.current = h; }}
                  onLayout={(e) => { scrollContainerRef.current = e.nativeEvent.layout.height; }}
                >
                  {currentChart?.sections.map((section, si) => (
                    <View key={si} style={styles.cifraSection}>
                      <Text style={styles.cifraSectionName}>[{section.name}]</Text>
                      {section.lines.map((line, li) => (
                        <Text
                          key={li}
                          style={[
                            line.type === "chords" ? styles.chordLine : styles.lyricLine,
                            { fontSize },
                            { lineHeight: fontSize * 1.55 },
                          ]}
                        >
                          {line.type === "chords"
                            ? transposeChordLine(line.content || " ", transposeSemitones)
                            : (line.content || " ")}
                        </Text>
                      ))}
                    </View>
                  ))}
                  {!currentChart && currentRawText ? (
                    <Text
                      style={[
                        styles.lyricLine,
                        { fontSize, lineHeight: fontSize * 1.55 },
                      ]}
                    >
                      {currentRawText}
                    </Text>
                  ) : null}
                  {!currentChart && !currentRawText ? (
                    <Text style={[styles.lyricLine, { fontSize }]}>
                      Nenhuma cifra disponível.
                    </Text>
                  ) : null}
                </ScrollView>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* ── Bottom navigation (auto-hides) ─────────────────────────────── */}
      <View
        pointerEvents={showNav ? "auto" : "none"}
        style={[
          styles.bottomNav,
          { paddingBottom: insets.bottom + 8, opacity: showNav ? 1 : 0 },
        ]}
      >
        <Pressable
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
          onPress={() => goTo(current - 1)}
          disabled={isFirst}
          accessibilityLabel="Música anterior"
        >
          <Text style={styles.navBtnText}>◀ Anterior</Text>
        </Pressable>

        {/* Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={{ flex: 1 }}
        >
          {sortedItems.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => goTo(idx)}
              style={[styles.pill, idx === current && styles.pillActive]}
              accessibilityLabel={`Ir para música ${idx + 1}`}
            >
              <Text style={[styles.pillText, idx === current && styles.pillTextActive]}>
                {idx + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.navBtn, isLast && styles.navBtnDisabled]}
          onPress={() => goTo(current + 1)}
          disabled={isLast}
          accessibilityLabel="Próxima música"
        >
          <Text style={styles.navBtnText}>Próxima ▶</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07101d",
  },
  mainArea: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  centerContentCifra: {
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  posText: {
    color: "#3a5a6a",
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 20,
  },
  titleText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#e8f2ff",
    lineHeight: 56,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -1,
    maxWidth: 360,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipGreen: { backgroundColor: "#0f3020", borderColor: "#7cf2a233" },
  chipBlue: { backgroundColor: "#0f2040", borderColor: "#a5c8ff33" },
  chipYellow: { backgroundColor: "#2a1f00", borderColor: "#fbbf2433" },
  chipText: { fontSize: 16, fontWeight: "600" },
  transitionText: {
    fontSize: 15,
    color: "#5a7a9a",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 320,
  },
  cifraToggleBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1a3a5a",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
  },
  cifraToggleBtnText: { color: "#1ecad3", fontSize: 14 },
  // ── Chord chart ──────────────────────────────────────────────────────────
  cifraContainer: {
    flex: 1,
    backgroundColor: "#0d1f2e",
    borderRadius: 12,
    padding: 16,
  },
  cifraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cifraTitleText: {
    color: "#e2f0ff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  cifraCloseText: { color: "#1ecad3", fontSize: 13 },
  // ── Cifra toolbar ─────────────────────────────────────────────────────────
  cifraToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2c44",
    marginBottom: 6,
    gap: 8,
  },
  cifraToolbar2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2c44",
    marginBottom: 10,
    gap: 8,
  },
  toolbarGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    backgroundColor: "#1a3a5a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 32,
    alignItems: "center",
  },
  toolBtnActive: {
    backgroundColor: "#1ecad3",
  },
  toolBtnNeutral: {
    backgroundColor: "#0f2137",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 52,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2d4b6d",
  },
  toolBtnText: {
    color: "#b3c6e0",
    fontSize: 12,
    fontWeight: "600",
  },
  toolLabel: {
    color: "#7a9dc0",
    fontSize: 11,
    minWidth: 40,
    textAlign: "center",
  },
  toolLabelAccent: {
    color: "#7cf2a2",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  // Beat dots for metronome
  beatDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginLeft: 4,
  },
  beatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a3a5a",
  },
  beatDotOn: {
    backgroundColor: "#1ecad3",
  },
  beatDotAccent: {
    backgroundColor: "#7cf2a2",
  },
  cifraScroll: { flex: 1 },
  cifraSection: { marginBottom: 18 },
  cifraSectionName: {
    color: "#5a7a9a",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 6,
  },
  chordLine: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    color: "#7cf2a2",
    lineHeight: 20,
  },
  lyricLine: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    color: "#c0d4e8",
    lineHeight: 20,
  },
  // ── Empty state ──────────────────────────────────────────────────────────
  emptyText: {
    color: "#5a7a9a",
    fontSize: 18,
    textAlign: "center",
    marginTop: 80,
  },
  // ── Close button (always visible) ────────────────────────────────────────
  closeBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    backgroundColor: "rgba(8, 15, 26, 0.8)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#8fa9c8", fontSize: 18 },
  // ── Bottom nav ───────────────────────────────────────────────────────────
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "rgba(8, 15, 26, 0.9)",
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1a3a5a",
    borderRadius: 20,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: "#7cf2a2", fontSize: 13, fontWeight: "600" },
  pillsContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: "#7cf2a2" },
  pillText: { color: "#8fa9c8", fontSize: 12 },
  pillTextActive: { color: "#0f2137", fontWeight: "700" },
});
