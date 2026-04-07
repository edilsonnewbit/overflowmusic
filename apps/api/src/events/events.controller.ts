import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";

type CreateEventBody = {
  title: string;
  dateTime: string;
  location?: string;
  address?: string;
  description?: string;
  eventType?: "CULTO" | "CONFERENCIA" | "ENSAIO" | "OUTRO";
  status?: "DRAFT" | "ACTIVE" | "PUBLISHED" | "FINISHED" | "ARCHIVED";
  confirmationDeadlineDays?: number;
  responseWindowHours?: number;
};

type UpdateEventBody = Partial<CreateEventBody>;

type MusicianBody = {
  instrumentRole: string;
  userId: string;
  priority: number;
};

@Controller("api/events")
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: string,
  ) {
    return this.eventsService.list({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status,
    });
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.eventsService.getById(id);
  }

  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: CreateEventBody) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const result = await this.eventsService.create(body);
    if (result.ok) void this.auditService.log({ action: "event.created", resourceType: "Event", resourceId: result.event?.id, metadata: { title: body.title } });
    return result;
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: UpdateEventBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const result = await this.eventsService.remove(id);
    void this.auditService.log({ action: "event.deleted", resourceType: "Event", resourceId: id });
    return result;
  }

  // ── Musician Slots ────────────────────────────────────────────────────────

  @Get(":id/musicians")
  async listMusicians(@Param("id") id: string) {
    return this.eventsService.listMusicians(id);
  }

  @Post(":id/musicians")
  async upsertMusician(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: MusicianBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.upsertMusicianSlot(id, body);
  }

  @Post(":id/musicians/reorder")
  async reorderMusicians(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { items: { id: string; priority: number }[] },
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.reorderMusicianSlots(id, body.items);
  }

  @Delete(":id/musicians/:musicianId")
  async removeMusician(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("musicianId") musicianId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.removeMusicianSlot(id, musicianId);
  }

  @Post(":id/musicians/:musicianId/respond")
  async respondMusician(
    @Headers("authorization") authorization: string | undefined,
    @Param("musicianId") musicianId: string,
    @Body() body: { accept: boolean },
  ) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.authService.getMe(token);
    return this.eventsService.respondMusician(musicianId, user.id, body.accept);
  }

  @Post("slots/:slotId/respond")
  async respondMusicianSlot(
    @Headers("authorization") authorization: string | undefined,
    @Param("slotId") slotId: string,
    @Body() body: { accept: boolean },
  ) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.authService.getMe(token);
    return this.eventsService.respondMusicianBySlotId(slotId, user.id, body.accept);
  }
}
