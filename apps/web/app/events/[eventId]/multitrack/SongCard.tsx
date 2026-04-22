"use client";

import type { SetlistSongTracks } from "@/lib/types";

type Props = {
  song: SetlistSongTracks;
  isActive: boolean;
  onSelect: () => void;
};

const TRACK_TYPE_COLORS: Record<string, string> = {
  CLICK: "#ef4444",
  GUIDE_VOCAL: "#f59e0b",
  FULL_BAND: "#7cf2a2",
  PAD: "#818cf8",
  BASS: "#06b6d4",
  STEM_KEYS: "#a78bfa",
  STEM_GUITAR: "#fb923c",
  STEM_DRUMS: "#f87171",
  STEM_BACKING: "#94a3b8",
};

export function SongCard({ song, isActive, onSelect }: Props) {
  const hasNoTracks = song.tracks.length === 0;
  const isPad = song.pad !== null;

  if (isPad) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`mt-song-card mt-pad-card${isActive ? " active" : ""}`}
      >
        <div className="mt-card-thumb mt-pad-thumb">
          <span className="mt-card-num">{song.order}</span>
          <span style={{ fontSize: 18 }}>🎹</span>
        </div>
        <div className="mt-card-info">
          <p className="mt-card-title">{song.songTitle}</p>
          <p className="mt-card-meta">
            {song.key ? <span className="mt-card-key">{song.key}</span> : null}
            <span className="mt-card-tracks" style={{ color: "#818cf8" }}>pad · loop</span>
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mt-song-card${isActive ? " active" : ""}${hasNoTracks ? " no-tracks" : ""}`}
    >
      {/* Thumbnail placeholder with gradient */}
      <div className="mt-card-thumb">
        <span className="mt-card-num">{song.order}</span>
        {song.tracks.slice(0, 4).map((t) => (
          <span
            key={t.id}
            className="mt-card-dot"
            style={{ background: TRACK_TYPE_COLORS[t.trackType] ?? "#94a3b8" }}
          />
        ))}
      </div>

      <div className="mt-card-info">
        <p className="mt-card-title">{song.songTitle}</p>
        <p className="mt-card-meta">
          {song.key ? <span className="mt-card-key">{song.key}</span> : null}
          <span className="mt-card-tracks">
            {hasNoTracks ? "sem faixas" : `${song.tracks.length} faixa${song.tracks.length !== 1 ? "s" : ""}`}
          </span>
        </p>
      </div>
    </button>
  );
}
