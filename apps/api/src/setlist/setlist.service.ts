import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type UpsertSetlistInput = {
  title?: string;
  notes?: string;
};

type CreateSetlistItemInput = {
  songTitle: string;
  key?: string;
  leaderName?: string;
  zone?: string;
  transitionNotes?: string;
  order?: number;
};

type UpdateSetlistItemInput = Partial<CreateSetlistItemInput>;

type ReorderInput = {
  items: Array<{ id: string; order: number }>;
};

@Injectable()
export class SetlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getByEvent(eventId: string) {
    const setlist = await this.prisma.setlist.findUnique({
      where: { eventId },
      include: { items: { orderBy: { order: "asc" } } },
    });

    if (!setlist) {
      return { ok: true, setlist: null };
    }

    return { ok: true, setlist };
  }

  async upsertByEvent(eventId: string, input: UpsertSetlistInput) {
    await this.assertEventExists(eventId);

    const setlist = await this.prisma.setlist.upsert({
      where: { eventId },
      create: {
        eventId,
        title: input.title?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      update: {
        title: input.title?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      include: {
        items: { orderBy: { order: "asc" } },
      },
    });

    return { ok: true, setlist };
  }

  async addItem(eventId: string, input: CreateSetlistItemInput) {
    const setlist = await this.getOrCreateSetlist(eventId);

    const songTitle = (input.songTitle || "").trim();
    if (!songTitle) {
      throw new BadRequestException("songTitle is required");
    }

    const lastItem = await this.prisma.setlistItem.findFirst({
      where: { setlistId: setlist.id },
      orderBy: { order: "desc" },
    });

    const order = typeof input.order === "number" ? input.order : (lastItem?.order || 0) + 1;

    const item = await this.prisma.setlistItem.create({
      data: {
        setlistId: setlist.id,
        order,
        songTitle,
        key: input.key?.trim() || null,
        leaderName: input.leaderName?.trim() || null,
        zone: input.zone?.trim() || null,
        transitionNotes: input.transitionNotes?.trim() || null,
      },
    });

    return { ok: true, item };
  }

  async updateItem(eventId: string, itemId: string, input: UpdateSetlistItemInput) {
    const setlist = await this.getOrCreateSetlist(eventId);
    const item = await this.prisma.setlistItem.findFirst({
      where: { id: itemId, setlistId: setlist.id },
    });

    if (!item) {
      throw new BadRequestException("setlist item not found");
    }

    const data: {
      songTitle?: string;
      key?: string | null;
      leaderName?: string | null;
      zone?: string | null;
      transitionNotes?: string | null;
      order?: number;
    } = {};

    if (typeof input.songTitle === "string") {
      const songTitle = input.songTitle.trim();
      if (!songTitle) {
        throw new BadRequestException("songTitle cannot be empty");
      }
      data.songTitle = songTitle;
    }

    if (typeof input.key === "string") data.key = input.key.trim() || null;
    if (typeof input.leaderName === "string") data.leaderName = input.leaderName.trim() || null;
    if (typeof input.zone === "string") data.zone = input.zone.trim() || null;
    if (typeof input.transitionNotes === "string") data.transitionNotes = input.transitionNotes.trim() || null;
    if (typeof input.order === "number") data.order = input.order;

    const updated = await this.prisma.setlistItem.update({
      where: { id: itemId },
      data,
    });

    return { ok: true, item: updated };
  }

  async removeItem(eventId: string, itemId: string) {
    const setlist = await this.getOrCreateSetlist(eventId);
    const item = await this.prisma.setlistItem.findFirst({
      where: { id: itemId, setlistId: setlist.id },
    });

    if (!item) {
      throw new BadRequestException("setlist item not found");
    }

    await this.prisma.setlistItem.delete({ where: { id: itemId } });
    return { ok: true };
  }

  async reorder(eventId: string, input: ReorderInput) {
    const setlist = await this.getOrCreateSetlist(eventId);

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException("items is required");
    }

    const ids = input.items.map((it) => it.id);
    const existing = await this.prisma.setlistItem.findMany({
      where: { setlistId: setlist.id, id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      throw new BadRequestException("one or more items do not belong to this setlist");
    }

    await this.prisma.$transaction(
      input.items.map((it) =>
        this.prisma.setlistItem.update({
          where: { id: it.id },
          data: { order: it.order },
        }),
      ),
    );

    const items = await this.prisma.setlistItem.findMany({
      where: { setlistId: setlist.id },
      orderBy: { order: "asc" },
    });

    return { ok: true, items };
  }

  private async assertEventExists(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) {
      throw new BadRequestException("event not found");
    }
  }

  private async getOrCreateSetlist(eventId: string) {
    await this.assertEventExists(eventId);

    return this.prisma.setlist.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    });
  }

  async getSetlistTracks(eventId: string) {
    const setlist = await this.prisma.setlist.findUnique({
      where: { eventId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!setlist) return { ok: true, songTracks: [] };

    const titles = setlist.items.map((i) => i.songTitle);
    const songs = await this.prisma.song.findMany({
      where: { title: { in: titles } },
      include: { tracks: { orderBy: { order: "asc" } } },
    });

    const byTitle = new Map(songs.map((s) => [s.title, s.tracks]));
    const songTracks = setlist.items.map((item) => ({
      setlistItemId: item.id,
      order: item.order,
      songTitle: item.songTitle,
      key: item.key,
      leaderName: item.leaderName,
      tracks: byTitle.get(item.songTitle) ?? [],
    }));

    return { ok: true, songTracks };
  }
}
