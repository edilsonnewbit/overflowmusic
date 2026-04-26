export type SongSearchIntent = {
  title: string;
  artist: string;
};

export function parseSongSearchIntent(search: string): SongSearchIntent {
  const clean = search.trim();
  if (!clean) return { title: "", artist: "" };

  const byDash = clean.split(" - ").map((value) => value.trim()).filter(Boolean);
  if (byDash.length >= 2) {
    return { artist: byDash[0] ?? "", title: byDash.slice(1).join(" - ") };
  }

  return { title: clean, artist: "" };
}
