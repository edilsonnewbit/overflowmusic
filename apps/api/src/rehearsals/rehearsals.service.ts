import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type CreateRehearsalInput = {
  title: string;
  dateTime: string;
  location?: string;
  address?: string;
  description?: string;
  notes?: string;
  durationMinutes?: number;
};

type UpdateRehearsalInput = Partial<CreateRehearsalInput>;

@Injectable()
export class RehearsalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { limit?: number; offset?: number } = {}) {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;

    const [rehearsals, total] = await Promise.all([
      this.prisma.rehearsal.findMany({
        orderBy: { dateTime: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.rehearsal.count(),
    ]);

    return { ok: true, rehearsals, total, limit, offset };
  }

  async getById(id: string) {
    const rehearsal = await this.prisma.rehearsal.findUnique({
      where: { id },
      include: {
        events: {
          include: {
            event: { select: { id: true, title: true, dateTime: true } },
          },
        },
      },
    });

    if (!rehearsal) {
      throw new BadRequestException("rehearsal not found");
    }

    return { ok: true, rehearsal };
  }

  async create(input: CreateRehearsalInput) {
    const title = (input.title || "").trim();
    if (!title) throw new BadRequestException("title is required");

    const dateTime = new Date(input.dateTime);
    if (Number.isNaN(dateTime.getTime())) {
      throw new BadRequestException("dateTime must be a valid ISO date");
    }

    const rehearsal = await this.prisma.rehearsal.create({
      data: {
        title,
        dateTime,
        location: input.location?.trim() || null,
        address: input.address?.trim() || null,
        description: input.description?.trim() || null,
        notes: input.notes?.trim() || null,
        durationMinutes: input.durationMinutes ?? 60,
      },
    });

    return { ok: true, rehearsal };
  }

  async update(id: string, input: UpdateRehearsalInput) {
    await this.getById(id);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.dateTime !== undefined) {
      const dt = new Date(input.dateTime);
      if (Number.isNaN(dt.getTime())) throw new BadRequestException("dateTime must be a valid ISO date");
      data.dateTime = dt;
    }
    if (input.location !== undefined) data.location = input.location?.trim() || null;
    if (input.address !== undefined) data.address = input.address?.trim() || null;
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;

    const rehearsal = await this.prisma.rehearsal.update({ where: { id }, data });
    return { ok: true, rehearsal };
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.rehearsal.delete({ where: { id } });
    return { ok: true };
  }

  async listForEvent(eventId: string) {
    const rows = await this.prisma.eventRehearsal.findMany({
      where: { eventId },
      include: { rehearsal: true },
      orderBy: { rehearsal: { dateTime: "asc" } },
    });
    return { ok: true, rehearsals: rows.map((r) => r.rehearsal) };
  }

  async addToEvent(eventId: string, rehearsalId: string) {
    const exists = await this.prisma.rehearsal.findUnique({ where: { id: rehearsalId } });
    if (!exists) throw new BadRequestException("rehearsal not found");

    await this.prisma.eventRehearsal.upsert({
      where: { eventId_rehearsalId: { eventId, rehearsalId } },
      create: { eventId, rehearsalId },
      update: {},
    });

    return { ok: true };
  }

  async removeFromEvent(eventId: string, rehearsalId: string) {
    await this.prisma.eventRehearsal.deleteMany({ where: { eventId, rehearsalId } });
    return { ok: true };
  }
}
