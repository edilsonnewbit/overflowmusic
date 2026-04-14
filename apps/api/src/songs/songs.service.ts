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

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService,
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

  async importTracksFromFolder(songId: string, folderUrl: string) {
    await this.assertSongExists(songId);

    const folderId = extractFolderIdFromUrl(folderUrl);
    if (!folderId) throw new BadRequestException("URL da pasta inválida. Use o link do Google Drive no formato drive.google.com/drive/folders/...");

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
