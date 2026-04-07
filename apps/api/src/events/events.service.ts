import { BadRequestException, Injectable } from "@nestjs/common";
import { EventStatus, EventType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type CreateEventInput = {
  title: string;
  dateTime: string;
  location?: string;
  address?: string;
  description?: string;
  eventType?: EventType;
  status?: EventStatus;
  confirmationDeadlineDays?: number;
  responseWindowHours?: number;
};

type UpdateEventInput = Partial<CreateEventInput>;

type MusicianSlotInput = {
  instrumentRole: string;
  userId: string;
  priority: number;
};

/** Computes a virtual "display status" based on db status + date. */
function computedStatus(status: EventStatus, dateTime: Date): string {
  if (status === "ACTIVE" || status === "PUBLISHED") {
    if (new Date() > dateTime) return "FINISHED";
  }
  return status;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(params: { limit?: number; offset?: number; status?: string } = {}) {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const where = params.status ? { status: params.status as EventStatus } : undefined;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { dateTime: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventsWithStatus = events.map((e) => ({
      ...e,
      computedStatus: computedStatus(e.status, e.dateTime),
    }));

    return { ok: true, events: eventsWithStatus, total, limit, offset };
  }

  async getById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        setlist: {
          include: {
            items: {
              orderBy: { order: "asc" },
            },
          },
        },
        musicians: {
          include: {
            user: {
              select: { id: true, name: true, email: true, instruments: true },
            },
          },
          orderBy: [{ instrumentRole: "asc" }, { priority: "asc" }],
        },
      },
    });

    if (!event) {
      throw new BadRequestException("event not found");
    }

    return {
      ok: true,
      event: {
        ...event,
        computedStatus: computedStatus(event.status, event.dateTime),
      },
    };
  }

  async create(input: CreateEventInput) {
    const title = (input.title || "").trim();
    if (!title) {
      throw new BadRequestException("title is required");
    }

    const dateTime = new Date(input.dateTime);
    if (Number.isNaN(dateTime.getTime())) {
      throw new BadRequestException("dateTime must be a valid ISO date");
    }

    const event = await this.prisma.event.create({
      data: {
        title,
        dateTime,
        location: input.location?.trim() || null,
        address: input.address?.trim() || null,
        description: input.description?.trim() || null,
        eventType: input.eventType || "CULTO",
        status: input.status || "DRAFT",
        confirmationDeadlineDays: input.confirmationDeadlineDays ?? 3,
        responseWindowHours: input.responseWindowHours ?? 24,
      },
    });

    return { ok: true, event: { ...event, computedStatus: computedStatus(event.status, event.dateTime) } };
  }

  async update(id: string, input: UpdateEventInput) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("event not found");
    }

    const data: {
      title?: string;
      dateTime?: Date;
      location?: string | null;
      address?: string | null;
      description?: string | null;
      eventType?: EventType;
      status?: EventStatus;
      confirmationDeadlineDays?: number;
      responseWindowHours?: number;
    } = {};

    if (typeof input.title === "string") {
      const title = input.title.trim();
      if (!title) throw new BadRequestException("title cannot be empty");
      data.title = title;
    }

    if (typeof input.dateTime === "string") {
      const dateTime = new Date(input.dateTime);
      if (Number.isNaN(dateTime.getTime())) throw new BadRequestException("dateTime must be a valid ISO date");
      data.dateTime = dateTime;
    }

    if (typeof input.location === "string") data.location = input.location.trim() || null;
    if (typeof input.address === "string") data.address = input.address.trim() || null;
    if (typeof input.description === "string") data.description = input.description.trim() || null;
    if (input.status) data.status = input.status;
    if (input.eventType) data.eventType = input.eventType;
    if (typeof input.confirmationDeadlineDays === "number") data.confirmationDeadlineDays = input.confirmationDeadlineDays;
    if (typeof input.responseWindowHours === "number") data.responseWindowHours = input.responseWindowHours;

    const event = await this.prisma.event.update({ where: { id }, data });

    // When activating/publishing, trigger musician notifications
    if (data.status === "ACTIVE" || data.status === "PUBLISHED") {
      void this.triggerMusicianNotifications(id);
    }

    return { ok: true, event: { ...event, computedStatus: computedStatus(event.status, event.dateTime) } };
  }

  async remove(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException("event not found");
    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }

  // ── Musician slots ──────────────────────────────────────────────────────────

  async listMusicians(eventId: string) {
    const musicians = await this.prisma.eventMusician.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true, instruments: true } } },
      orderBy: [{ instrumentRole: "asc" }, { priority: "asc" }],
    });
    return { ok: true, musicians };
  }

  async upsertMusicianSlot(eventId: string, input: MusicianSlotInput) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new BadRequestException("event not found");

    const slot = await this.prisma.eventMusician.upsert({
      where: { eventId_instrumentRole_userId: { eventId, instrumentRole: input.instrumentRole, userId: input.userId } },
      create: {
        eventId,
        instrumentRole: input.instrumentRole,
        userId: input.userId,
        priority: input.priority,
        status: "PENDING",
      },
      update: { priority: input.priority },
      include: { user: { select: { id: true, name: true, email: true, instruments: true } } },
    });

    return { ok: true, musician: slot };
  }

  async reorderMusicianSlots(eventId: string, items: { id: string; priority: number }[]) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new BadRequestException("event not found");
    await Promise.all(
      items.map((item) =>
        this.prisma.eventMusician.update({ where: { id: item.id }, data: { priority: item.priority } }),
      ),
    );
    return { ok: true };
  }

  async removeMusicianSlot(eventId: string, musicianId: string) {
    const slot = await this.prisma.eventMusician.findFirst({ where: { id: musicianId, eventId } });
    if (!slot) throw new BadRequestException("musician slot not found");
    await this.prisma.eventMusician.delete({ where: { id: musicianId } });
    return { ok: true };
  }

  async respondMusician(musicianId: string, userId: string, accept: boolean) {
    const slot = await this.prisma.eventMusician.findUnique({ where: { id: musicianId } });
    if (!slot) throw new BadRequestException("slot not found");
    if (slot.userId !== userId) throw new BadRequestException("unauthorized");
    if (slot.status !== "PENDING") throw new BadRequestException("slot already responded");

    const newStatus = (accept ? "CONFIRMED" : "DECLINED") as "CONFIRMED" | "DECLINED";

    await this.prisma.eventMusician.update({
      where: { id: musicianId },
      data: { status: newStatus, respondedAt: new Date() },
    });

    // If declined, escalate to next priority
    if (!accept) {
      void this.escalateMusician(slot.eventId, slot.instrumentRole, slot.priority);
    }

    return { ok: true };
  }

  async respondMusicianBySlotId(slotId: string, userId: string, accept: boolean) {
    return this.respondMusician(slotId, userId, accept);
  }

  async getMyInvites(userId: string) {
    const slots = await this.prisma.eventMusician.findMany({
      where: { userId, status: "PENDING" },
      include: {
        event: {
          select: { id: true, title: true, dateTime: true, location: true, eventType: true, status: true },
        },
      },
      orderBy: { event: { dateTime: "asc" } },
    });

    const invites = slots
      .filter((s) => new Date(s.event.dateTime) >= new Date())
      .map((s) => ({
        slotId: s.id,
        eventId: s.event.id,
        eventTitle: s.event.title,
        eventDate: s.event.dateTime,
        eventLocation: s.event.location,
        eventType: s.event.eventType,
        instrumentRole: s.instrumentRole,
        notifiedAt: s.notifiedAt,
      }));

    return { ok: true, invites };
  }

  private async triggerMusicianNotifications(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return;

    // Get all instrument roles with PENDING priority=1 musicians
    const firstSlots = await this.prisma.eventMusician.findMany({
      where: { eventId, priority: 1, status: "PENDING" },
      include: { user: { select: { id: true, name: true } } },
    });

    for (const slot of firstSlots) {
      await this.notifications.sendMusicianConfirmationRequest(
        slot.userId,
        event.title,
        slot.instrumentRole,
        slot.id,
      );

      await this.prisma.eventMusician.update({
        where: { id: slot.id },
        data: { notifiedAt: new Date() },
      });
    }
  }

  async escalateMusician(eventId: string, instrumentRole: string, currentPriority: number) {
    const next = await this.prisma.eventMusician.findFirst({
      where: { eventId, instrumentRole, priority: { gt: currentPriority }, status: "PENDING" },
      orderBy: { priority: "asc" },
    });

    if (!next) return; // No more candidates

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return;

    await this.notifications.sendMusicianConfirmationRequest(
      next.userId,
      event.title,
      instrumentRole,
      next.id,
    );

    await this.prisma.eventMusician.update({
      where: { id: next.id },
      data: { notifiedAt: new Date() },
    });
  }

  /** Called by the worker/cron: expire musicians who didn't respond within responseWindowHours */
  async processExpiredMusicians() {
    const eventsToCheck = await this.prisma.event.findMany({
      where: { status: { in: ["ACTIVE", "PUBLISHED"] } },
      select: { id: true, title: true, responseWindowHours: true },
    });

    for (const event of eventsToCheck) {
      const thresholdTime = new Date(Date.now() - event.responseWindowHours * 60 * 60 * 1000);

      const expiredSlots = await this.prisma.eventMusician.findMany({
        where: {
          eventId: event.id,
          status: "PENDING",
          notifiedAt: { lt: thresholdTime },
        },
        orderBy: [{ instrumentRole: "asc" }, { priority: "asc" }],
      });

      for (const slot of expiredSlots) {
        await this.prisma.eventMusician.update({
          where: { id: slot.id },
          data: { status: "EXPIRED" },
        });
        void this.escalateMusician(slot.eventId, slot.instrumentRole, slot.priority);
      }
    }

    // Also auto-finish events past their dateTime
    await this.prisma.event.updateMany({
      where: { status: { in: ["ACTIVE", "PUBLISHED"] }, dateTime: { lt: new Date() } },
      data: { status: "FINISHED" },
    });
  }

  /** Send 3x/day reminders to PENDING musicians */
  async sendPendingReminders() {
    const pendingSlots = await this.prisma.eventMusician.findMany({
      where: { status: "PENDING", notifiedAt: { not: null } },
      include: {
        event: { select: { title: true, status: true, dateTime: true } },
        user: { select: { id: true, name: true } },
      },
    });

    for (const slot of pendingSlots) {
      if (slot.event.status !== "ACTIVE" && slot.event.status !== "PUBLISHED") continue;
      if (new Date() > slot.event.dateTime) continue;

      await this.notifications.sendMusicianReminder(slot.userId, slot.event.title, slot.instrumentRole, slot.id);
    }
  }
}
