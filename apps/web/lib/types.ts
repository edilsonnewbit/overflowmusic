// Tipos compartilhados do domínio Overflow Music.
// Mantidos aqui para evitar dependência de workspace em builds Docker isolados.

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";

export type UserStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type EventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ChordChartSourceType = "TXT_IMPORT" | "MANUAL";

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  instruments: string[];
  instagramProfile?: string | null;
  birthDate?: string | null;
  church?: string | null;
  pastorName?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  volunteerArea?: string | null;
  volunteerTermsVersion?: string | null;
  volunteerTermsAcceptedAt?: string | null;
};

export type LoginPayload = {
  idToken?: string;
  email?: string;
  name?: string;
  googleSub?: string;
};

export type LoginResponse = {
  status: UserStatus;
  accessToken?: string;
  message?: string;
};

// ── Songs ─────────────────────────────────────────────────────────────────────

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
  sourceType?: ChordChartSourceType | string;
  parsedJson: ParsedChart | null;
  rawText: string | null;
  createdAt?: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  defaultKey: string | null;
  zone: string | null;
  tags: string[] | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  driveUrl: string | null;
  chordCharts: SongChordChart[];
};

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

// ── Events ────────────────────────────────────────────────────────────────────

export type MusicEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  description: string | null;
  status: EventStatus;
};

// ── Setlist ───────────────────────────────────────────────────────────────────

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

// ── Multitrack Player ─────────────────────────────────────────────────────────

export type TrackType =
  | "CLICK" | "GUIDE_VOCAL" | "FULL_BAND" | "PAD"
  | "BASS" | "STEM_KEYS" | "STEM_GUITAR" | "STEM_DRUMS" | "STEM_BACKING";

export type SongTrack = {
  id: string;
  songId: string;
  label: string;
  trackType: TrackType;
  driveFileId: string;
  driveUrl: string;
  order: number;
};

export type SetlistSongTracks = {
  setlistItemId: string;
  order: number;
  songTitle: string;
  key: string | null;
  leaderName: string | null;
  tracks: SongTrack[];
};

// ── Pads ──────────────────────────────────────────────────────────────────────

export type Pad = {
  id: string;
  name: string;
  key: string | null;
  driveFileId: string;
  driveUrl: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Checklists ────────────────────────────────────────────────────────────────

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
  eventId?: string;
  items: ChecklistRunItem[];
} | null;
