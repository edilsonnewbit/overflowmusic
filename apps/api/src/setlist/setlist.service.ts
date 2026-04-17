import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type SetlistActor = { userId: string | null; userName: string };

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

  // ── Rehearsal setlist methods ─────────────────────────────────────────────

  async getByRehearsal(rehearsalId: string) {
    const setlist = await this.prisma.setlist.findUnique({
      where: { rehearsalId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return { ok: true, setlist: setlist ?? null };
  }

  async upsertByRehearsal(rehearsalId: string, input: UpsertSetlistInput) {
    await this.assertRehearsalExists(rehearsalId);

    const setlist = await this.prisma.setlist.upsert({
      where: { rehearsalId },
      create: { rehearsalId, title: input.title?.trim() || null, notes: input.notes?.trim() || null },
      update: { title: input.title?.trim() || null, notes: input.notes?.trim() || null },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return { ok: true, setlist };
  }

  async addItemToRehearsal(rehearsalId: string, input: CreateSetlistItemInput, actor: SetlistActor) {
    const setlist = await this.getOrCreateRehearsalSetlist(rehearsalId);

    const songTitle = (input.songTitle || "").trim();
    if (!songTitle) throw new BadRequestException("songTitle is required");

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

    const details: Record<string, unknown> = {};
    if (item.key) details.tom = item.key;
    if (item.leaderName) details.lider = item.leaderName;
    if (item.zone) details.zona = item.zone;
    if (item.transitionNotes) details.notas = item.transitionNotes;

    await this.writeLog(setlist.id, actor, "ITEM_ADDED", songTitle, details);
    return { ok: true, item };
  }

  async updateItemInRehearsal(rehearsalId: string, itemId: string, input: UpdateSetlistItemInput, actor: SetlistActor) {
    const setlist = await this.getOrCreateRehearsalSetlist(rehearsalId);
    const item = await this.prisma.setlistItem.findFirst({ where: { id: itemId, setlistId: setlist.id } });
    if (!item) throw new BadRequestException("setlist item not found");

    const data: Record<string, unknown> = {};
    const changes: Array<{ campo: string; de: unknown; para: unknown }> = [];

    if (typeof input.songTitle === "string") {
      const t = input.songTitle.trim();
      if (!t) throw new BadRequestException("songTitle cannot be empty");
      if (t !== item.songTitle) { changes.push({ campo: "título", de: item.songTitle, para: t }); data.songTitle = t; }
    }
    if (typeof input.key === "string") {
      const v = input.key.trim() || null;
      if (v !== item.key) { changes.push({ campo: "tom", de: item.key, para: v }); data.key = v; }
    }
    if (typeof input.leaderName === "string") {
      const v = input.leaderName.trim() || null;
      if (v !== item.leaderName) { changes.push({ campo: "líder", de: item.leaderName, para: v }); data.leaderName = v; }
    }
    if (typeof input.zone === "string") {
      const v = input.zone.trim() || null;
      if (v !== item.zone) { changes.push({ campo: "zona", de: item.zone, para: v }); data.zone = v; }
    }
    if (typeof input.transitionNotes === "string") {
      const v = input.transitionNotes.trim() || null;
      if (v !== item.transitionNotes) { changes.push({ campo: "notas", de: item.transitionNotes, para: v }); data.transitionNotes = v; }
    }
    if (typeof input.order === "number") data.order = input.order;

    const updated = await this.prisma.setlistItem.update({ where: { id: itemId }, data });

    if (changes.length > 0) {
      await this.writeLog(setlist.id, actor, "ITEM_UPDATED", item.songTitle, { alteracoes: changes });
    }

    return { ok: true, item: updated };
  }

  async removeItemFromRehearsal(rehearsalId: string, itemId: string, actor: SetlistActor) {
    const setlist = await this.getOrCreateRehearsalSetlist(rehearsalId);
    const item = await this.prisma.setlistItem.findFirst({ where: { id: itemId, setlistId: setlist.id } });
    if (!item) throw new BadRequestException("setlist item not found");
    await this.prisma.setlistItem.delete({ where: { id: itemId } });
    await this.writeLog(setlist.id, actor, "ITEM_REMOVED", item.songTitle, {});
    return { ok: true };
  }

  async reorderRehearsal(rehearsalId: string, input: ReorderInput, actor: SetlistActor) {
    const setlist = await this.getOrCreateRehearsalSetlist(rehearsalId);

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException("items is required");
    }

    const ids = input.items.map((it) => it.id);
    const existing = await this.prisma.setlistItem.findMany({
      where: { setlistId: setlist.id, id: { in: ids } },
      select: { id: true, songTitle: true, order: true },
    });

    if (existing.length !== ids.length) {
      throw new BadRequestException("one or more items do not belong to this setlist");
    }

    await this.prisma.$transaction(
      input.items.map((it) =>
        this.prisma.setlistItem.update({ where: { id: it.id }, data: { order: it.order } }),
      ),
    );

    const items = await this.prisma.setlistItem.findMany({
      where: { setlistId: setlist.id },
      orderBy: { order: "asc" },
    });

    await this.writeLog(setlist.id, actor, "REORDERED", null, {
      novaOrdem: items.map((it) => it.songTitle),
    });

    return { ok: true, items };
  }

  async getRehearsalLogs(
    rehearsalId: string,
    params: { page?: number; limit?: number; search?: string },
  ) {
    await this.assertRehearsalExists(rehearsalId);

    const setlist = await this.prisma.setlist.findUnique({ where: { rehearsalId }, select: { id: true } });
    if (!setlist) return { ok: true, logs: [], total: 0, page: 1, pages: 0 };

    const limit = Math.min(params.limit ?? 20, 50);
    const page = Math.max(params.page ?? 1, 1);
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || undefined;

    const where = {
      setlistId: setlist.id,
      ...(search ? {
        OR: [
          { songTitle: { contains: search, mode: "insensitive" as const } },
          { userName: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.setlistLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      this.prisma.setlistLog.count({ where }),
    ]);

    return { ok: true, logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertEventExists(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) {
      throw new BadRequestException("event not found");
    }
  }

  private async assertRehearsalExists(rehearsalId: string) {
    const rehearsal = await this.prisma.rehearsal.findUnique({ where: { id: rehearsalId }, select: { id: true } });
    if (!rehearsal) throw new BadRequestException("rehearsal not found");
  }

  private async getOrCreateSetlist(eventId: string) {
    await this.assertEventExists(eventId);

    return this.prisma.setlist.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    });
  }

  private async getOrCreateRehearsalSetlist(rehearsalId: string) {
    await this.assertRehearsalExists(rehearsalId);
    return this.prisma.setlist.upsert({
      where: { rehearsalId },
      create: { rehearsalId },
      update: {},
    });
  }

  private async writeLog(
    setlistId: string,
    actor: SetlistActor,
    action: string,
    songTitle: string | null,
    details: Record<string, unknown>,
  ) {
    await this.prisma.setlistLog.create({
      data: {
        setlistId,
        userId: actor.userId,
        userName: actor.userName,
        action,
        songTitle,
        details: details as import("@prisma/client").Prisma.InputJsonValue,
      },
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
