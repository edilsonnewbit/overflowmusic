import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ChordChartSourceType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DriveService } from "../drive/drive.service";
import { parseChordTxt } from "./chord-txt-parser";

type CreateSongInput = {
  title: string;
  artist?: string;
  defaultKey?: string;
  zone?: string;
  tags?: string[];
  youtubeUrl?: string;
  spotifyUrl?: string;
  driveUrl?: string;
};

type UpdateSongInput = Partial<CreateSongInput>;

type ImportTxtInput = {
  content: string;
  songId?: string;
};

type ImportCifraClubInput = {
  title: string;
  artist?: string;
  songId?: string;
};

type CifraClubLookupResult = {
  sourceUrl: string;
  content: string;
  parsed: ReturnType<typeof parseChordTxt>;
};

type TrackType =
  | "CLICK" | "GUIDE_VOCAL" | "FULL_BAND" | "PAD"
  | "BASS" | "STEM_KEYS" | "STEM_GUITAR" | "STEM_DRUMS" | "STEM_BACKING";

function inferTrackType(filename: string): TrackType {
  const n = filename.toLowerCase().replace(/[_\-\.]/g, " ");
  if (/click|metronome/.test(n)) return "CLICK";
  if (/lead.?vocal|voz.?principal|vocal.?guia|lead.?vox/.test(n)) return "GUIDE_VOCAL";
  if (/backing.?vocal|back.?vocal|coro|backing/.test(n)) return "STEM_BACKING";
  if (/full.?band|full.?mix/.test(n)) return "FULL_BAND";
  if (/drum|bateria|beat/.test(n)) return "STEM_DRUMS";
  if (/percuss|percussion/.test(n)) return "STEM_DRUMS";
  if (/bass|baixo/.test(n)) return "BASS";
  if (/guitar|guitarra|violao/.test(n)) return "STEM_GUITAR";
  if (/keyboard|piano|teclado|organ|keys/.test(n)) return "STEM_KEYS";
  if (/synth|pad|string/.test(n)) return "PAD";
  return "FULL_BAND";
}

function extractFolderIdFromUrl(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

const CIFRA_CLUB_BASE_URL = "https://www.cifraclub.com.br";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyCifraClub(input: string): string {
  return normalizeForMatch(input).replace(/\s+/g, "-");
}

function decodeHtmlEntities(input: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    aacute: "a",
    agrave: "a",
    acirc: "a",
    atilde: "a",
    auml: "a",
    eacute: "e",
    ecirc: "e",
    iacute: "i",
    oacute: "o",
    ocirc: "o",
    otilde: "o",
    ouml: "o",
    uacute: "u",
    ccedil: "c",
    Aacute: "A",
    Agrave: "A",
    Acirc: "A",
    Atilde: "A",
    Eacute: "E",
    Ecirc: "E",
    Iacute: "I",
    Oacute: "O",
    Ocirc: "O",
    Otilde: "O",
    Uacute: "U",
    Ccedil: "C",
  };

  return input
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, entity) => namedEntities[entity] ?? match);
}

function htmlToPlainText(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, ""),
  );
}

function extractPageTitleParts(html: string): { title: string; artist: string | null } {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  const titleText = decodeHtmlEntities(match?.[1] ?? "").trim();
  const parts = titleText.split(" - ").map((value) => value.trim()).filter(Boolean);

  if (parts.length >= 3 && parts[parts.length - 1]?.toLowerCase() === "cifra club") {
    return {
      title: parts[0] ?? "Sem título",
      artist: parts[1] ?? null,
    };
  }

  return {
    title: titleText || "Sem título",
    artist: null,
  };
}

function extractSuggestedKeyFromHtml(html: string): string | null {
  const toneIndex = html.toLowerCase().indexOf("tom:");
  if (toneIndex === -1) {
    return null;
  }

  const snippet = htmlToPlainText(html.slice(toneIndex, toneIndex + 200));
  const match = snippet.match(/tom:\s*([A-G](?:#|b)?(?:m|maj|min)?[0-9(+)]*)/i);
  return match?.[1]?.trim() ?? null;
}

function extractPrimaryPreBlock(html: string): string | null {
  const matches = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
  if (matches.length === 0) {
    return null;
  }

  const sorted = matches
    .map((match) => match[1] ?? "")
    .sort((left, right) => right.length - left.length);

  const candidate = sorted[0]?.trim() ?? "";
  return candidate || null;
}

function buildImportContentFromCifraClubPage(html: string): { content: string; title: string; artist: string | null } {
  const { title, artist } = extractPageTitleParts(html);
  const preBlock = extractPrimaryPreBlock(html);
  if (!preBlock) {
    throw new BadRequestException("Nao foi possivel extrair a cifra da pagina encontrada.");
  }

  const key = extractSuggestedKeyFromHtml(html);
  const chartBody = htmlToPlainText(preBlock)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!chartBody) {
    throw new BadRequestException("A pagina encontrada nao possui conteudo de cifra importavel.");
  }

  const header = artist ? `${artist} - ${title}` : title;
  const content = [header, key ? `Tom: ${key}` : null, "", chartBody].filter(Boolean).join("\n");
  return { content, title, artist };
}

function normalizeCifraClubSongPath(path: string, artistSlug: string): string | null {
  const cleanPath = path.split("?")[0]?.split("#")[0] ?? "";
  const baseMatch = cleanPath.match(new RegExp(`^/${escapeRegExp(artistSlug)}/([^/]+)(?:/)?`));
  if (!baseMatch?.[1]) {
    return null;
  }

  const invalidSuffixes = ["/letra/", "/guitarpro/", "/imprimir.html", "/tab/", "/partituras/"];
  if (invalidSuffixes.some((suffix) => cleanPath.includes(suffix))) {
    return null;
  }

  return `/${artistSlug}/${baseMatch[1]}/`;
}

const EXCLUDED_CIFRA_CLUB_SLUGS = new Set([
  "cifras", "violao", "guitarra", "musica", "artistas", "tablaturas",
  "busca", "noticias", "ranking", "letras", "acordes", "ukulele",
  "cavaquinho", "contrabaixo", "teclado", "bateria", "gaita",
]);

function extractSongLinksFromSearchPage(html: string): string[] {
  const hrefRegex = /href="(\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\/?)"[^>]*>/gi;
  const unique = new Set<string>();
  for (const match of html.matchAll(hrefRegex)) {
    const path = match[1] ?? "";
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 2 && !EXCLUDED_CIFRA_CLUB_SLUGS.has(parts[0] ?? "")) {
      unique.add(`/${parts[0]}/${parts[1]}/`);
    }
  }
  return [...unique];
}

function scoreSearchResult(path: string, query: string): number {
  const parts = path.split("/").filter(Boolean);
  const combined = normalizeForMatch(`${parts[0] ?? ""} ${parts[1] ?? ""}`.replace(/-/g, " "));
  const target = normalizeForMatch(query);
  const targetTokens = target.split(" ").filter(Boolean);
  if (combined === target) return 10_000;
  let score = 0;
  if (combined.includes(target) || target.includes(combined)) score += 2_000;
  for (const token of targetTokens) {
    if (combined.includes(token)) score += 100;
  }
  return score;
}

function extractSongPathsFromArtistPage(html: string, artistSlug: string): string[] {
  const hrefRegex = /href="([^"]+)"/gi;
  const unique = new Set<string>();

  for (const match of html.matchAll(hrefRegex)) {
    const href = match[1] ?? "";
    const normalized = normalizeCifraClubSongPath(href, artistSlug);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function scoreSongPath(path: string, title: string): number {
  const target = normalizeForMatch(title);
  const targetTokens = target.split(" ").filter(Boolean);
  const songSlug = path.split("/").filter(Boolean)[1] ?? "";
  const songLabel = normalizeForMatch(songSlug.replace(/-/g, " "));

  if (!songLabel) {
    return 0;
  }

  if (songLabel === target) {
    return 10_000;
  }

  let score = 0;
  if (songLabel.includes(target) || target.includes(songLabel)) {
    score += 2_000;
  }

  for (const token of targetTokens) {
    if (songLabel.includes(token)) {
      score += 100;
    }
  }

  return score;
}

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService?: DriveService,
  ) {}

  async list(params: { limit?: number; offset?: number; search?: string; key?: string; tags?: string } = {}) {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const where: Record<string, unknown> = {};
    if (params.search) where.title = { contains: params.search, mode: "insensitive" };
    if (params.key) where.defaultKey = { equals: params.key, mode: "insensitive" };
    if (params.tags) where.tags = { path: [], array_contains: params.tags.split(",").map((t) => t.trim()) };

    const [songs, total] = await Promise.all([
      this.prisma.song.findMany({
        where,
        orderBy: { title: "asc" },
        take: limit,
        skip: offset,
        include: {
          chordCharts: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.song.count({ where }),
    ]);

    return { ok: true, songs, total, limit, offset };
  }

  async getById(id: string) {
    const song = await this.prisma.song.findUnique({
      where: { id },
      include: {
        chordCharts: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!song) {
      throw new BadRequestException("song not found");
    }

    return { ok: true, song };
  }

  async create(input: CreateSongInput) {
    const title = (input.title || "").trim();
    if (!title) {
      throw new BadRequestException("title is required");
    }

    const song = await this.prisma.song.create({
      data: {
        title,
        artist: input.artist?.trim() || null,
        defaultKey: input.defaultKey?.trim() || null,
        zone: input.zone?.trim() || null,
        tags: Array.isArray(input.tags) ? (input.tags as Prisma.InputJsonValue) : Prisma.JsonNull,
        youtubeUrl: input.youtubeUrl?.trim() || null,
        spotifyUrl: input.spotifyUrl?.trim() || null,
        driveUrl: input.driveUrl?.trim() || null,
      },
    });

    return { ok: true, song };
  }

  async update(id: string, input: UpdateSongInput) {
    const existing = await this.prisma.song.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("song not found");
    }

    const data: {
      title?: string;
      artist?: string | null;
      defaultKey?: string | null;
      zone?: string | null;
      tags?: Prisma.InputJsonValue;
      youtubeUrl?: string | null;
      spotifyUrl?: string | null;
      driveUrl?: string | null;
    } = {};

    if (typeof input.title === "string") {
      const title = input.title.trim();
      if (!title) {
        throw new BadRequestException("title cannot be empty");
      }
      data.title = title;
    }

    if (typeof input.artist === "string") data.artist = input.artist.trim() || null;
    if (typeof input.defaultKey === "string") data.defaultKey = input.defaultKey.trim() || null;
    if (typeof input.zone === "string") data.zone = input.zone.trim() || null;
    if (Array.isArray(input.tags)) data.tags = input.tags as Prisma.InputJsonValue;
    if (typeof input.youtubeUrl === "string") data.youtubeUrl = input.youtubeUrl.trim() || null;
    if (typeof input.spotifyUrl === "string") data.spotifyUrl = input.spotifyUrl.trim() || null;
    if (typeof input.driveUrl === "string") data.driveUrl = input.driveUrl.trim() || null;

    const song = await this.prisma.song.update({
      where: { id },
      data,
    });

    return { ok: true, song };
  }

  async remove(id: string) {
    const existing = await this.prisma.song.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("song not found");
    }

    await this.prisma.song.delete({ where: { id } });
    return { ok: true };
  }

  async importTxt(input: ImportTxtInput) {
    const { content, parsed } = this.parseImportContent(input.content);

    let songId = input.songId;
    if (!songId) {
      const existing = await this.prisma.song.findFirst({
        where: {
          title: parsed.title,
          artist: parsed.artist,
        },
      });

      if (existing) {
        songId = existing.id;
      } else {
        const created = await this.prisma.song.create({
          data: {
            title: parsed.title,
            artist: parsed.artist,
            defaultKey: parsed.metadata.suggestedKey,
          },
        });
        songId = created.id;
      }
    }

    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      throw new BadRequestException("song not found");
    }

    const latest = await this.prisma.chordChart.findFirst({
      where: { songId },
      orderBy: { version: "desc" },
    });

    const version = (latest?.version || 0) + 1;

    const chordChart = await this.prisma.chordChart.create({
      data: {
        songId,
        sourceType: ChordChartSourceType.TXT_IMPORT,
        rawText: content,
        parsedJson: parsed as Prisma.InputJsonValue,
        version,
      },
    });

    return {
      ok: true,
      song,
      chordChart,
      parsed,
    };
  }

  previewTxt(content: string) {
    const parsed = this.parseImportContent(content).parsed;
    return { ok: true, parsed };
  }

  async previewCifraClub(input: ImportCifraClubInput) {
    const lookup = await this.lookupCifraClubChart(input);
    return {
      ok: true,
      parsed: lookup.parsed,
      sourceUrl: lookup.sourceUrl,
      content: lookup.content,
    };
  }

  async importFromCifraClub(input: ImportCifraClubInput) {
    const lookup = await this.lookupCifraClubChart(input);
    const result = await this.importTxt({
      content: lookup.content,
      songId: input.songId,
    });

    return {
      ...result,
      sourceUrl: lookup.sourceUrl,
    };
  }

  async listCharts(songId: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
    if (!song) {
      throw new BadRequestException("song not found");
    }

    const charts = await this.prisma.chordChart.findMany({
      where: { songId },
      orderBy: { version: "desc" },
    });

    return { ok: true, charts };
  }

  async updateChart(songId: string, chartId: string, rawText: string) {
    const chart = await this.prisma.chordChart.findUnique({ where: { id: chartId } });
    if (!chart || chart.songId !== songId) {
      throw new BadRequestException("chart not found");
    }

    const content = (rawText || "").trim();
    if (!content) {
      throw new BadRequestException("rawText is required");
    }

    const parsed = parseChordTxt(content);

    const updated = await this.prisma.chordChart.update({
      where: { id: chartId },
      data: {
        rawText: content,
        parsedJson: parsed as Prisma.InputJsonValue,
      },
    });

    return { ok: true, chordChart: updated, parsed };
  }

  private parseImportContent(rawContent: string): { content: string; parsed: ReturnType<typeof parseChordTxt> } {
    const content = (rawContent || "").trim();
    if (!content) {
      throw new BadRequestException("content is required");
    }

    const parsed = parseChordTxt(content);
    return { content, parsed };
  }

  private async lookupCifraClubChart(input: ImportCifraClubInput): Promise<CifraClubLookupResult> {
    const title = (input.title || "").trim();
    const artist = (input.artist || "").trim();

    if (!title) {
      throw new BadRequestException("title is required");
    }

    let sourceUrl: string;
    if (artist) {
      sourceUrl = await this.resolveCifraClubSongUrl(title, artist);
    } else {
      const parts = title.split(" - ").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        sourceUrl = await this.resolveCifraClubSongUrl(parts.slice(1).join(" - "), parts[0]!);
      } else {
        sourceUrl = await this.resolveCifraClubBySearch(title);
      }
    }
    const response = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "User-Agent": "OverflowMusicApp/1.0 (+https://music.overflowmvmt.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new BadRequestException("Falha ao carregar a pagina encontrada no Cifra Club.");
    }

    const html = await response.text();
    const built = buildImportContentFromCifraClubPage(html);
    return {
      sourceUrl,
      content: built.content,
      parsed: parseChordTxt(built.content),
    };
  }

  private async resolveCifraClubSongUrl(title: string, artist: string): Promise<string> {
    const artistSlug = slugifyCifraClub(artist);
    const titleSlug = slugifyCifraClub(title);

    if (!artistSlug || !titleSlug) {
      throw new BadRequestException("title and artist are required for automatic lookup");
    }

    const artistPageUrl = `${CIFRA_CLUB_BASE_URL}/${artistSlug}/`;
    const directSongUrl = `${CIFRA_CLUB_BASE_URL}/${artistSlug}/${titleSlug}/`;

    try {
      const artistPageResponse = await fetch(artistPageUrl, {
        method: "GET",
        headers: {
          "User-Agent": "OverflowMusicApp/1.0 (+https://music.overflowmvmt.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      if (artistPageResponse.ok) {
        const artistPageHtml = await artistPageResponse.text();
        const candidatePaths = extractSongPathsFromArtistPage(artistPageHtml, artistSlug)
          .map((path) => ({ path, score: scoreSongPath(path, title) }))
          .filter((candidate) => candidate.score > 0)
          .sort((left, right) => right.score - left.score);

        if (candidatePaths[0]?.path) {
          return `${CIFRA_CLUB_BASE_URL}${candidatePaths[0].path}`;
        }
      }
    } catch {
      // fallback below
    }

    return directSongUrl;
  }

  private async resolveCifraClubBySearch(query: string): Promise<string> {
    const searchUrl = `${CIFRA_CLUB_BASE_URL}/busca/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent": "OverflowMusicApp/1.0 (+https://music.overflowmvmt.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new BadRequestException("Falha ao buscar cifras no Cifra Club.");
    }

    const html = await response.text();
    const links = extractSongLinksFromSearchPage(html);

    if (links.length === 0) {
      throw new BadRequestException("Nenhuma cifra encontrada para a busca informada.");
    }

    const best = links
      .map((path) => ({ path, score: scoreSearchResult(path, query) }))
      .sort((a, b) => b.score - a.score)[0]?.path ?? links[0]!;

    return `${CIFRA_CLUB_BASE_URL}${best}`;
  }

  // ── Tracks (multitrack player) ────────────────────────────────────────────

  async listTracks(songId: string) {
    await this.assertSongExists(songId);
    const tracks = await this.prisma.songTrack.findMany({
      where: { songId },
      orderBy: { order: "asc" },
    });
    return { ok: true, tracks };
  }

  async createTrack(songId: string, input: {
    label: string;
    trackType: string;
    driveFileId: string;
    driveUrl: string;
    order?: number;
  }) {
    await this.assertSongExists(songId);
    const track = await this.prisma.songTrack.create({
      data: {
        songId,
        label: input.label,
        trackType: input.trackType as any,
        driveFileId: input.driveFileId,
        driveUrl: input.driveUrl,
        order: input.order ?? 0,
      },
    });
    return { ok: true, track };
  }

  async deleteTrack(songId: string, trackId: string) {
    await this.prisma.songTrack.deleteMany({ where: { id: trackId, songId } });
    return { ok: true };
  }

  async bulkCreateTracks(songId: string, files: Array<{ fileId: string; name: string; mimeType?: string }>) {
    await this.assertSongExists(songId);
    if (!files.length) throw new BadRequestException("Nenhum arquivo enviado.");

    function cleanName(filename: string): string {
      return filename.replace(/\.[^.]+$/, "").replace(/^\d+\s*/, "").trim();
    }

    // Resolve real filename from Drive API (authenticated) or Content-Disposition header (fallback)
    const driveService = this.driveService;
    async function resolveFilename(fileId: string, providedName: string): Promise<string> {
      const looksLikeId = /^[a-zA-Z0-9_-]{20,}$/.test(providedName);
      if (!looksLikeId) return providedName;

      // Try authenticated Drive API first
      const apiName = await driveService?.getFileName(fileId);
      if (apiName) return apiName;

      // Fallback: HEAD request to public download URL
      try {
        const url = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t`;
        const res = await fetch(url, { method: "HEAD", redirect: "follow" });
        const disposition = res.headers.get("content-disposition") ?? "";
        // Try filename*=UTF-8''encoded first, then filename="..."
        const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].trim());
        const plainMatch = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
        if (plainMatch?.[1]) return plainMatch[1].trim();
      } catch { /* ignore */ }
      return providedName;
    }

    const existing = await this.prisma.songTrack.findMany({ where: { songId }, select: { order: true } });
    let nextOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) + 1 : 1;

    // Resolve filenames in parallel
    const resolved = await Promise.all(
      files.map(async (f) => ({ ...f, resolvedName: await resolveFilename(f.fileId, f.name) }))
    );

    const created = await Promise.all(
      resolved.map(async (f) => {
        const label = cleanName(f.resolvedName);
        const trackType = inferTrackType(f.resolvedName);
        const driveUrl = `https://drive.google.com/file/d/${f.fileId}/view`;
        return this.prisma.songTrack.create({
          data: { songId, label, trackType: trackType as any, driveFileId: f.fileId, driveUrl, order: nextOrder++ },
        });
      })
    );

    return { ok: true, imported: created.length, tracks: created };
  }

  async importTracksFromFolder(songId: string, folderUrl: string) {
    await this.assertSongExists(songId);

    const folderId = extractFolderIdFromUrl(folderUrl);
    if (!folderId) throw new BadRequestException("URL da pasta inválida. Use o link do Google Drive no formato drive.google.com/drive/folders/...");

    if (!this.driveService) {
      throw new BadRequestException("Drive service is not available.");
    }

    const files = await this.driveService.listFolderFiles(folderId);
    const audioFiles = files.filter((f) =>
      f.mimeType.startsWith("audio/") || /\.(mp3|wav|aac|m4a|ogg|flac)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      throw new BadRequestException("Nenhum arquivo de áudio encontrado na pasta.");
    }

    // Remove only the leading number prefix (e.g. "0 Lead Vocals.mp3" → "Lead Vocals")
    function cleanName(filename: string): string {
      return filename.replace(/\.[^.]+$/, "").replace(/^\d+\s*/, "").trim();
    }

    const existing = await this.prisma.songTrack.findMany({ where: { songId }, select: { order: true } });
    let nextOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) + 1 : 1;

    const created = await Promise.all(
      audioFiles.map(async (f) => {
        const label = cleanName(f.name);
        const trackType = inferTrackType(f.name);
        const driveUrl = `https://drive.google.com/file/d/${f.id}/view`;
        return this.prisma.songTrack.create({
          data: {
            songId,
            label,
            trackType: trackType as any,
            driveFileId: f.id,
            driveUrl,
            order: nextOrder++,
          },
        });
      })
    );

    return { ok: true, imported: created.length, tracks: created };
  }

  private async assertSongExists(songId: string) {
    const exists = await this.prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
    if (!exists) throw new BadRequestException("song not found");
  }
}
