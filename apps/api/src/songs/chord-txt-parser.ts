export type SongSectionLine = {
  type: "chords" | "lyrics" | "tab" | "text";
  content: string;
};

export type SongSection = {
  name: string;
  lines: SongSectionLine[];
};

export type ParsedChart = {
  title: string;
  artist: string | null;
  sections: SongSection[];
  chordDictionary: Record<string, string>;
  metadata: {
    suggestedKey: string | null;
    bpm: number | null;
    capo: number | null;
  };
};

// Alias for backward compatibility
export type ParsedChordTxt = ParsedChart;

const MAX_TXT_SIZE = 1_000_000;

function isLikelyChordLine(line: string): boolean {
  const cleaned = line.trim();
  if (!cleaned) return false;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const chordRegex = /^([A-G](#|b)?)([0-9A-Za-z()+-]*)?(\/[A-G](#|b)?)?$/i;
  const matches = tokens.filter((token) => chordRegex.test(token.replace(/[()[\]|-]/g, "")));

  return matches.length > 0 && matches.length / tokens.length >= 0.6;
}

function normalizeText(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function classifyLine(line: string): SongSectionLine {
  const trimmed = line.trim();

  if (trimmed.includes("|") && /^[A-Ga-gEBead\-|0-9hprb\/\s().]+$/.test(trimmed)) {
    return { type: "tab", content: line };
  }

  if (isLikelyChordLine(trimmed)) {
    return { type: "chords", content: line };
  }

  return { type: "lyrics", content: line };
}

function parseTitleAndArtist(firstLine: string): { title: string; artist: string | null } {
  const normalized = firstLine.trim();
  if (!normalized) {
    return { title: "Sem título", artist: null };
  }

  const dashIndex = normalized.indexOf(" - ");
  if (dashIndex === -1) {
    return { title: normalized, artist: null };
  }

  const artist = normalized.slice(0, dashIndex).trim() || null;
  const title = normalized.slice(dashIndex + 3).trim() || "Sem título";
  return { title, artist };
}

function parseChordDictionary(lines: string[]): Record<string, string> {
  const dict: Record<string, string> = {};
  const chordDefRegex = /^([A-G](#|b)?[\w/+#-]*)\s*=\s*(.+)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(chordDefRegex);
    if (!match) continue;

    const chord = match[1].trim();
    const value = match[3].trim();
    dict[chord] = value;
  }

  return dict;
}

function parseMetadata(lines: string[]): ParsedChart["metadata"] {
  let suggestedKey: string | null = null;
  let bpm: number | null = null;
  let capo: number | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!suggestedKey) {
      const keyMatch = line.match(/^(tom|tone|key)\s*[:=-]\s*([A-G](#|b)?m?(maj|min)?[0-9]*)$/i);
      if (keyMatch) {
        suggestedKey = keyMatch[2].trim();
      }
    }

    if (bpm === null) {
      const bpmMatch = line.match(/^bpm\s*[:=-]?\s*(\d{2,3})$/i);
      if (bpmMatch) {
        bpm = Number.parseInt(bpmMatch[1], 10);
      }
    }

    if (capo === null) {
      const capoMatch = line.match(/^capo\s*[:=-]?\s*(\d{1,2})$/i);
      if (capoMatch) {
        capo = Number.parseInt(capoMatch[1], 10);
      }
    }

    if (suggestedKey && bpm !== null && capo !== null) {
      break;
    }
  }

  return { suggestedKey, bpm, capo };
}

export function parseChordTxt(rawInput: string): ParsedChart {
  if (typeof rawInput !== "string") {
    throw new Error("content must be a string");
  }

  if (rawInput.length === 0) {
    throw new Error("content is empty");
  }

  if (rawInput.length > MAX_TXT_SIZE) {
    throw new Error("content exceeds max size (1MB)");
  }

  const normalized = normalizeText(rawInput);
  const lines = normalized.split("\n");
  const firstNonEmpty = lines.find((line) => line.trim().length > 0) || "Sem título";
  const { title, artist } = parseTitleAndArtist(firstNonEmpty);

  const sections: SongSection[] = [];
  let currentSection: SongSection = { name: "Sem seção", lines: [] };
  const sectionOnlyRegex = /^\[(.+)\]$/;
  const sectionInlineRegex = /^\[(.+?)\]\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();

    const sectionOnlyMatch = trimmed.match(sectionOnlyRegex);
    if (sectionOnlyMatch) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { name: sectionOnlyMatch[1].trim(), lines: [] };
      continue;
    }

    const sectionInlineMatch = trimmed.match(sectionInlineRegex);
    if (sectionInlineMatch && !trimmed.endsWith("]")) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }

      const sectionName = sectionInlineMatch[1].trim();
      const sectionTail = sectionInlineMatch[2].trim();
      currentSection = { name: sectionName, lines: [] };

      if (sectionTail) {
        currentSection.lines.push(classifyLine(sectionTail));
      }
      continue;
    }

    if (!trimmed) {
      if (currentSection.lines.length > 0) {
        currentSection.lines.push({ type: "text", content: "" });
      }
      continue;
    }

    currentSection.lines.push(classifyLine(line));
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  const chordDictionary = parseChordDictionary(lines);
  const metadata = parseMetadata(lines);

  return {
    title,
    artist,
    sections,
    chordDictionary,
    metadata,
  };
}
