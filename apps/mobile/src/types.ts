export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  items: string[];
};

export type ChecklistRunItem = {
  id: string;
  label: string;
  checked: boolean;
  checkedByName: string | null;
  order: number;
};

export type ChecklistRun = {
  id: string;
  items: ChecklistRunItem[];
} | null;

export type SongPreview = {
  title: string;
  artist: string | null;
  metadata?: {
    suggestedKey: string | null;
    bpm: number | null;
    capo: number | null;
  };
  sections: Array<{ name: string }>;
  chordDictionary: Record<string, string>;
};

export type SongImportResult = {
  songId: string;
  songTitle: string;
  chartVersion: number;
};

export type LoginPayload = {
  idToken?: string;
  email?: string;
  name?: string;
  googleSub?: string;
};

export type LoginResponse = {
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  accessToken?: string;
  message?: string;
};

export type MusicEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type SetlistItem = {
  id: string;
  order: number;
  songTitle: string;
  key: string | null;
  leaderName: string | null;
  zone: string | null;
  transitionNotes: string | null;
};

export type EventSetlist = {
  id: string;
  title: string | null;
  notes: string | null;
  items: SetlistItem[];
} | null;

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

export type SongChordChart = {
  id: string;
  version: number;
  structuredContent: ParsedChart | null;
  rawContent: string | null;
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  tags: string[] | null;
  chordCharts: SongChordChart[];
};
