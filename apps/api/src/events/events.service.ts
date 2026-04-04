import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

type CreateEventInput = {
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type UpdateEventInput = Partial<CreateEventInput>;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list() {
    const events = await this.prisma.event.findMany({
      orderBy: { dateTime: "asc" },
    });

    return { ok: true, events };
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
      },
    });

    if (!event) {
      throw new BadRequestException("event not found");
    }

    return { ok: true, event };
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
        description: input.description?.trim() || null,
        status: input.status || "DRAFT",
      },
    });

    void this.notifications.sendNewEventNotification(title);

    return { ok: true, event };
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
      description?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    } = {};

    if (typeof input.title === "string") {
      const title = input.title.trim();
      if (!title) {
        throw new BadRequestException("title cannot be empty");
      }
      data.title = title;
    }

    if (typeof input.dateTime === "string") {
      const dateTime = new Date(input.dateTime);
      if (Number.isNaN(dateTime.getTime())) {
        throw new BadRequestException("dateTime must be a valid ISO date");
      }
      data.dateTime = dateTime;
    }

    if (typeof input.location === "string") {
      data.location = input.location.trim() || null;
    }

    if (typeof input.description === "string") {
      data.description = input.description.trim() || null;
    }

    if (input.status) {
      data.status = input.status;
    }

    const event = await this.prisma.event.update({
      where: { id },
      data,
    });

    return { ok: true, event };
  }

  async remove(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("event not found");
    }

    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }
}
