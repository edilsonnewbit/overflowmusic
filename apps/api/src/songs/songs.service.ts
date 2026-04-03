import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ChordChartSourceType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseChordTxt } from "./chord-txt-parser";

type CreateSongInput = {
  title: string;
  artist?: string;
  defaultKey?: string;
  tags?: string[];
};

type UpdateSongInput = Partial<CreateSongInput>;

type ImportTxtInput = {
  content: string;
  songId?: string;
};

@Injectable()
export class SongsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const songs = await this.prisma.song.findMany({
      orderBy: { title: "asc" },
      include: {
        chordCharts: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    return { ok: true, songs };
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
        tags: Array.isArray(input.tags) ? (input.tags as Prisma.InputJsonValue) : Prisma.JsonNull,
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
      tags?: Prisma.InputJsonValue;
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
    if (Array.isArray(input.tags)) data.tags = input.tags as Prisma.InputJsonValue;

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

  private parseImportContent(rawContent: string): { content: string; parsed: ReturnType<typeof parseChordTxt> } {
    const content = (rawContent || "").trim();
    if (!content) {
      throw new BadRequestException("content is required");
    }

    const parsed = parseChordTxt(content);
    return { content, parsed };
  }
}
