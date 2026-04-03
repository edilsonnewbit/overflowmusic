import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchSongById, fetchSongs } from "../lib/api";
import { CACHE_SONGS, getCache, setCache } from "../lib/cache";
import { styles } from "../styles";
import type { Song, SongImportResult, SongPreview, SongSection } from "../types";

type Tab = "browse" | "import";

type Props = {
  preview: SongPreview | null;
  importResult: SongImportResult | null;
  onPreview: (content: string) => Promise<void>;
  onImport: (content: string) => Promise<void>;
  loadingPreview: boolean;
  loadingImport: boolean;
};

export function SongsScreen({
  preview,
  importResult,
  onPreview,
  onImport,
  loadingPreview,
  loadingImport,
}: Props) {
  const [tab, setTab] = useState<Tab>("browse");

  return (
    <View style={{ flex: 1 }}>
      {/* inner tab bar */}
      <View style={innerTabBarStyle}>
        <Pressable
          style={[innerTabStyle, tab === "browse" ? innerTabActiveStyle : null]}
          onPress={() => setTab("browse")}
        >
          <Text style={[innerTabTextStyle, tab === "browse" ? innerTabTextActiveStyle : null]}>
            Biblioteca
          </Text>
        </Pressable>
        <Pressable
          style={[innerTabStyle, tab === "import" ? innerTabActiveStyle : null]}
          onPress={() => setTab("import")}
        >
          <Text style={[innerTabTextStyle, tab === "import" ? innerTabTextActiveStyle : null]}>
            Importar TXT
          </Text>
        </Pressable>
      </View>

      {tab === "browse" ? (
        <BrowseTab />
      ) : (
        <ImportTab
          preview={preview}
          importResult={importResult}
          onPreview={onPreview}
          onImport={onImport}
          loadingPreview={loadingPreview}
          loadingImport={loadingImport}
        />
      )}
    </View>
  );
}

// ── Browse Tab ────────────────────────────────────────────────────────────────

function BrowseTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [search, setSearch] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [selected, setSelected] = useState<Song | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    void loadSongs();
  }, []);

  async function loadSongs() {
    setLoading(true);
    setError(null);

    const cached = await getCache<Song[]>(CACHE_SONGS);
    if (cached) {
      setSongs(cached);
    }

    try {
      const result = await fetchSongs();
      if (!result.ok) throw new Error(result.message);
      setSongs(result.songs);
      void setCache(CACHE_SONGS, result.songs);
      setIsStale(false);
    } catch (e) {
      if (cached) {
        setIsStale(true);
      } else {
        setError(e instanceof Error ? e.message : "Erro ao carregar músicas.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function openSong(song: Song) {
    // If song has no chart content yet, fetch full detail
    const hasDetail = song.chordCharts.some((c) => c.structuredContent || c.rawContent);
    if (hasDetail) {
      setSelected(song);
      return;
    }
    setLoadingDetail(true);
    try {
      const result = await fetchSongById(song.id);
      if (result.ok && result.song) {
        setSelected(result.song);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  if (selected) {
    return (
      <SongDetail
        song={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const allKeys = Array.from(
    new Set(songs.map((s) => s.defaultKey).filter(Boolean) as string[])
  ).sort();
  const allTags = Array.from(
    new Set(songs.flatMap((s) => (Array.isArray(s.tags) ? (s.tags as string[]) : [])))
  ).sort();

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.title.toLowerCase().includes(q) || (s.artist || "").toLowerCase().includes(q);
    const matchKey = keyFilter ? s.defaultKey === keyFilter : true;
    const matchTag = tagFilter
      ? Array.isArray(s.tags) && (s.tags as string[]).includes(tagFilter)
      : true;
    return matchSearch && matchKey && matchTag;
  });

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={searchInputStyle}
        placeholder="Buscar por título ou artista..."
        placeholderTextColor="#4d6b8a"
        value={search}
        onChangeText={setSearch}
      />

      {/* key filter */}
      {!loading && allKeys.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 6 }}
        >
          <Pressable
            onPress={() => setKeyFilter("")}
            style={keyFilter === "" ? activeFilterChipStyle : filterChipStyle}
          >
            <Text style={{ fontSize: 12, color: keyFilter === "" ? "#7cf2a2" : "#b3c6e0" }}>
              Todos os tons
            </Text>
          </Pressable>
          {allKeys.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKeyFilter(keyFilter === k ? "" : k)}
              style={keyFilter === k ? activeFilterChipStyle : filterChipStyle}
            >
              <Text style={{ fontSize: 12, color: keyFilter === k ? "#7cf2a2" : "#b3c6e0" }}>
                {k}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* tag filter */}
      {!loading && allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 8 }}
        >
          {allTags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setTagFilter(tagFilter === tag ? "" : tag)}
              style={tagFilter === tag ? activeFilterChipStyle : filterChipStyle}
            >
              <Text style={{ fontSize: 12, color: tagFilter === tag ? "#7cf2a2" : "#b3c6e0" }}>
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading && (
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <ActivityIndicator color="#1ecad3" />
          <Text style={{ color: "#b3c6e0", marginTop: 8 }}>Carregando músicas...</Text>
        </View>
      )}
      {isStale && !loading && (
        <Text style={{ color: "#f59e0b", marginHorizontal: 12, marginBottom: 4, fontSize: 12 }}>
          ⚠ Dados em cache — sem conexão com o servidor
        </Text>
      )}
      {error && <Text style={{ color: "#f87171", margin: 12 }}>{error}</Text>}
      {loadingDetail && (
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <ActivityIndicator color="#1ecad3" size="small" />
        </View>
      )}

      <ScrollView>
        {!loading &&
          filtered.map((song) => (
            <Pressable
              key={song.id}
              onPress={() => void openSong(song)}
              style={songRowStyle}
            >
              <Text style={{ color: "#f4f8ff", fontWeight: "700", fontSize: 15 }}>
                {song.title}
              </Text>
              {song.artist ? (
                <Text style={{ color: "#b3c6e0", fontSize: 12, marginTop: 2 }}>{song.artist}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {song.defaultKey ? (
                  <Text style={pillStyle}>Tom: {song.defaultKey}</Text>
                ) : null}
                {song.chordCharts.length > 0 ? (
                  <Text style={pillStyle}>{song.chordCharts.length} cifra(s)</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        {!loading && filtered.length === 0 && !error && (
          <Text style={{ color: "#b3c6e0", margin: 16 }}>
            {search ? "Nenhuma música encontrada." : "Nenhuma música cadastrada ainda."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Song Detail ───────────────────────────────────────────────────────────────

function SongDetail({ song, onBack }: { song: Song; onBack: () => void }) {
  const [chartIndex, setChartIndex] = useState(0);
  const chart = song.chordCharts[chartIndex] ?? null;
  const parsed = chart?.structuredContent ?? null;
  const meta = parsed?.metadata;

  return (
    <ScrollView style={{ flex: 1 }}>
      <Pressable onPress={onBack} style={{ padding: 12 }}>
        <Text style={{ color: "#7cf2a2", fontSize: 13 }}>← Músicas</Text>
      </Pressable>

      {/* header */}
      <View style={detailHeaderStyle}>
        <Text style={{ color: "#f4f8ff", fontSize: 22, fontWeight: "700" }}>{song.title}</Text>
        {song.artist ? (
          <Text style={{ color: "#b3c6e0", fontSize: 13, marginTop: 4 }}>{song.artist}</Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {song.defaultKey ? <MetaPill label="Tom" value={song.defaultKey} /> : null}
          {meta?.suggestedKey && meta.suggestedKey !== song.defaultKey ? (
            <MetaPill label="Tom cifra" value={meta.suggestedKey} />
          ) : null}
          {meta?.bpm ? <MetaPill label="BPM" value={String(meta.bpm)} /> : null}
          {meta?.capo ? <MetaPill label="Capo" value={String(meta.capo)} /> : null}
        </View>
      </View>

      {/* version picker */}
      {song.chordCharts.length > 1 && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 12, flexWrap: "wrap" }}>
          {song.chordCharts.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => setChartIndex(i)}
              style={[versionBtnStyle, i === chartIndex ? versionBtnActiveStyle : null]}
            >
              <Text
                style={{
                  color: i === chartIndex ? "#0a1929" : "#b3c6e0",
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                v{c.version}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* sections */}
      {parsed ? (
        <View style={chartBoxStyle}>
          {parsed.sections.map((section: SongSection, si: number) => (
            <View key={si} style={{ marginBottom: 20 }}>
              <Text style={sectionNameStyle}>[{section.name}]</Text>
              {section.lines.map((line, li) => (
                <Text
                  key={li}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    color:
                      line.type === "chords"
                        ? "#7cf2a2"
                        : line.type === "tab"
                          ? "#93c5fd"
                          : line.type === "text"
                            ? "#7a94b0"
                            : "#d6e5f8",
                    fontWeight: line.type === "chords" ? "700" : "400",
                  }}
                >
                  {line.content || " "}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : chart?.rawContent ? (
        <View style={chartBoxStyle}>
          <Text style={{ color: "#d6e5f8", fontFamily: "monospace", fontSize: 13 }}>
            {chart.rawContent}
          </Text>
        </View>
      ) : (
        <Text style={{ color: "#b3c6e0", margin: 16 }}>Nenhuma cifra disponível.</Text>
      )}

      {/* chord dictionary */}
      {parsed && Object.keys(parsed.chordDictionary).length > 0 && (
        <View style={dictBoxStyle}>
          <Text style={sectionNameStyle}>Dicionário de Acordes</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(parsed.chordDictionary).map(([chord, fingering]) => (
              <View key={chord} style={dictItemStyle}>
                <Text style={{ color: "#7cf2a2", fontWeight: "700" }}>{chord}</Text>
                <Text style={{ color: "#b3c6e0", fontSize: 11, marginLeft: 4 }}>{fingering}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Import Tab ────────────────────────────────────────────────────────────────

type ImportTabProps = {
  preview: SongPreview | null;
  importResult: SongImportResult | null;
  onPreview: (content: string) => Promise<void>;
  onImport: (content: string) => Promise<void>;
  loadingPreview: boolean;
  loadingImport: boolean;
};

function ImportTab({
  preview,
  importResult,
  onPreview,
  onImport,
  loadingPreview,
  loadingImport,
}: ImportTabProps) {
  const [txtInput, setTxtInput] = useState("");
  const [fileStatusText, setFileStatusText] = useState("");
  const [loadingFilePick, setLoadingFilePick] = useState(false);
  const isBusy = loadingPreview || loadingImport || loadingFilePick;

  async function selectTxtFile() {
    if (isBusy) return;
    setLoadingFilePick(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setFileStatusText("Arquivo inválido.");
        return;
      }

      const content = await FileSystem.readAsStringAsync(asset.uri);
      if (!content.trim()) {
        setFileStatusText("Arquivo vazio.");
        return;
      }

      setTxtInput(content);
      setFileStatusText(`Arquivo carregado: ${asset.name || "cifra.txt"}`);
    } catch {
      setFileStatusText("Falha ao ler arquivo .txt.");
    } finally {
      setLoadingFilePick(false);
    }
  }

  return (
    <ScrollView>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Importar Cifra TXT</Text>
        <Text style={styles.cardDescription}>
          Requer usuário autorizado (ou EXPO_PUBLIC_ADMIN_API_KEY em fallback).
        </Text>

        <Pressable
          style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
          onPress={() => void selectTxtFile()}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>
            {loadingFilePick ? "Lendo arquivo..." : "Selecionar arquivo .txt"}
          </Text>
        </Pressable>
        {fileStatusText ? <Text style={styles.helper}>{fileStatusText}</Text> : null}

        <TextInput
          style={[styles.input, styles.multilineLarge]}
          multiline
          numberOfLines={7}
          placeholder="Cole o conteúdo .txt da cifra"
          placeholderTextColor="#8fa9c8"
          value={txtInput}
          onChangeText={setTxtInput}
          editable={!isBusy}
        />

        <Pressable
          style={[styles.primaryButton, isBusy ? styles.buttonDisabled : null]}
          onPress={() => void onPreview(txtInput)}
          disabled={isBusy}
        >
          <Text style={styles.primaryButtonText}>
            {loadingPreview ? "Gerando preview..." : "Gerar preview"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
          onPress={() => void onImport(txtInput)}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>
            {loadingImport ? "Salvando cifra..." : "Salvar cifra"}
          </Text>
        </Pressable>

        {preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>
              {preview.title}
              {preview.artist ? ` - ${preview.artist}` : ""}
            </Text>
            <Text style={styles.previewText}>
              Key: {preview.metadata?.suggestedKey || "-"} | BPM:{" "}
              {preview.metadata?.bpm ?? "-"} | Capo: {preview.metadata?.capo ?? "-"}
            </Text>
            <Text style={styles.previewText}>
              Seções: {preview.sections.length} | Acordes mapeados:{" "}
              {Object.keys(preview.chordDictionary || {}).length}
            </Text>
          </View>
        ) : null}

        {importResult ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Importação concluída</Text>
            <Text style={styles.previewText}>Música: {importResult.songTitle}</Text>
            <Text style={styles.previewText}>
              ID: {importResult.songId} | Versão da cifra: v{importResult.chartVersion}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={metaPillStyle}>
      <Text style={{ color: "#7a94b0", fontSize: 10, textTransform: "uppercase" }}>{label} </Text>
      <Text style={{ color: "#7cf2a2", fontWeight: "700", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

// ── local styles ──────────────────────────────────────────────────────────────

const innerTabBarStyle = {
  flexDirection: "row" as const,
  borderBottomWidth: 1,
  borderBottomColor: "#1e3650",
  backgroundColor: "#071623",
};
const innerTabStyle = {
  flex: 1,
  paddingVertical: 10,
  alignItems: "center" as const,
};
const innerTabActiveStyle = {
  borderBottomWidth: 2,
  borderBottomColor: "#7cf2a2",
};
const innerTabTextStyle = { color: "#7a94b0", fontWeight: "600" as const, fontSize: 13 };
const innerTabTextActiveStyle = { color: "#7cf2a2" };

const searchInputStyle = {
  margin: 12,
  marginBottom: 8,
  padding: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "#0d2035",
  color: "#e8f1fb",
  fontSize: 14,
};

const songRowStyle = {
  marginHorizontal: 12,
  marginBottom: 10,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "#122840",
};

const pillStyle = {
  color: "#7cf2a2",
  fontSize: 11,
  fontWeight: "700" as const,
  backgroundColor: "#1b3756",
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 3,
};

const detailHeaderStyle = {
  marginHorizontal: 14,
  marginBottom: 16,
  padding: 16,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#31557c",
  backgroundColor: "#122840",
};

const metaPillStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: "#0d2035",
  borderWidth: 1,
  borderColor: "#2d4b6d",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

const versionBtnStyle = {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "#0d2035",
};
const versionBtnActiveStyle = {
  backgroundColor: "#7cf2a2",
  borderColor: "#7cf2a2",
};

const chartBoxStyle = {
  marginHorizontal: 14,
  marginBottom: 16,
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#1e3650",
  backgroundColor: "#071623",
};

const sectionNameStyle = {
  color: "#fbbf24",
  fontWeight: "700" as const,
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  marginBottom: 6,
};

const dictBoxStyle = {
  marginHorizontal: 14,
  marginBottom: 24,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#1e3650",
  backgroundColor: "#071623",
};

const dictItemStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: "#0d2035",
  borderWidth: 1,
  borderColor: "#2d4b6d",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

const filterChipStyle = {
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#2d4b6d",
  backgroundColor: "transparent",
};

const activeFilterChipStyle = {
  ...filterChipStyle,
  borderColor: "#7cf2a2",
  backgroundColor: "#1b3756",
};


type Props = {
  preview: SongPreview | null;
  importResult: SongImportResult | null;
  onPreview: (content: string) => Promise<void>;
  onImport: (content: string) => Promise<void>;
  loadingPreview: boolean;
  loadingImport: boolean;
};

export function SongsScreen({
  preview,
  importResult,
  onPreview,
  onImport,
  loadingPreview,
  loadingImport,
}: Props) {
  const [txtInput, setTxtInput] = useState("");
  const [fileStatusText, setFileStatusText] = useState("");
  const [loadingFilePick, setLoadingFilePick] = useState(false);
  const isBusy = loadingPreview || loadingImport || loadingFilePick;

  async function selectTxtFile() {
    if (isBusy) {
      return;
    }

    setLoadingFilePick(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setFileStatusText("Arquivo inválido.");
        return;
      }

      const content = await FileSystem.readAsStringAsync(asset.uri);
      if (!content.trim()) {
        setFileStatusText("Arquivo vazio.");
        return;
      }

      setTxtInput(content);
      setFileStatusText(`Arquivo carregado: ${asset.name || "cifra.txt"}`);
    } catch {
      setFileStatusText("Falha ao ler arquivo .txt.");
    } finally {
      setLoadingFilePick(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cifra TXT Preview</Text>
      <Text style={styles.cardDescription}>Requer usuário autorizado (ou EXPO_PUBLIC_ADMIN_API_KEY em fallback).</Text>

      <Pressable
        style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
        onPress={() => void selectTxtFile()}
        disabled={isBusy}
      >
        <Text style={styles.secondaryButtonText}>{loadingFilePick ? "Lendo arquivo..." : "Selecionar arquivo .txt"}</Text>
      </Pressable>
      {fileStatusText ? <Text style={styles.helper}>{fileStatusText}</Text> : null}

      <TextInput
        style={[styles.input, styles.multilineLarge]}
        multiline
        numberOfLines={7}
        placeholder="Cole o conteúdo .txt da cifra"
        placeholderTextColor="#8fa9c8"
        value={txtInput}
        onChangeText={setTxtInput}
        editable={!isBusy}
      />

      <Pressable
        style={[styles.primaryButton, isBusy ? styles.buttonDisabled : null]}
        onPress={() => void onPreview(txtInput)}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>{loadingPreview ? "Gerando preview..." : "Gerar preview"}</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryButton, isBusy ? styles.buttonDisabled : null]}
        onPress={() => void onImport(txtInput)}
        disabled={isBusy}
      >
        <Text style={styles.secondaryButtonText}>{loadingImport ? "Salvando cifra..." : "Salvar cifra"}</Text>
      </Pressable>

      {preview ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>
            {preview.title}
            {preview.artist ? ` - ${preview.artist}` : ""}
          </Text>
          <Text style={styles.previewText}>
            Key: {preview.metadata?.suggestedKey || "-"} | BPM: {preview.metadata?.bpm ?? "-"} | Capo: {preview.metadata?.capo ?? "-"}
          </Text>
          <Text style={styles.previewText}>
            Seções: {preview.sections.length} | Acordes mapeados: {Object.keys(preview.chordDictionary || {}).length}
          </Text>
        </View>
      ) : null}

      {importResult ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Importação concluída</Text>
          <Text style={styles.previewText}>Música: {importResult.songTitle}</Text>
          <Text style={styles.previewText}>
            ID: {importResult.songId} | Versão da cifra: v{importResult.chartVersion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
