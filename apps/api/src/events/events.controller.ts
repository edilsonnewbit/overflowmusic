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
import { SkipThrottle } from "@nestjs/throttler";
import { EventsService } from "./events.service";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { RehearsalsService } from "../rehearsals/rehearsals.service";

type CreateEventBody = {
  title: string;
  dateTime: string;
  location?: string;
  address?: string;
  description?: string;
  eventType?: "CULTO" | "CONFERENCIA" | "ENSAIO" | "OUTRO";
  status?: "DRAFT" | "ACTIVE" | "PUBLISHED" | "FINISHED" | "ARCHIVED";
  confirmationDeadline?: string;
  confirmationDeadlineDays?: number;
  responseWindowHours?: number;
};

type UpdateEventBody = Partial<CreateEventBody> & { generateSlug?: boolean };

type MusicianBody = {
  instrumentRole: string;
  userId: string;
  priority: number;
};

@SkipThrottle({ global: true })
@Controller("api/events")
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly rehearsalsService: RehearsalsService,
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

  @Get(":id/instrument-configs")
  async getInstrumentConfigs(@Param("id") id: string) {
    const configs = await this.eventsService.getInstrumentConfigs(id);
    return { ok: true, configs };
  }

  @Post(":id/instrument-configs")
  async setInstrumentConfig(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { instrumentRole: string; requiredCount: number },
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const config = await this.eventsService.setInstrumentConfig(id, body.instrumentRole, body.requiredCount);
    return { ok: true, config };
  }

  @Get("my-invites")
  async getMyInvites(@Headers("authorization") authorization: string | undefined) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.authService.getMe(token);
    return this.eventsService.getMyInvites(user.id);
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
    await this.authService.assertAdminKeyOrSuperAdmin(authorization);
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

  @Post("volunteer-slots/:volunteerId/respond")
  async respondVolunteerSlot(
    @Headers("authorization") authorization: string | undefined,
    @Param("volunteerId") volunteerId: string,
    @Body() body: { accept: boolean },
  ) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.authService.getMe(token);
    return this.eventsService.respondVolunteer(volunteerId, user.id, body.accept);
  }

  // ── Rehearsals ────────────────────────────────────────────────────────────

  @Get(":id/rehearsals")
  async listRehearsals(@Param("id") id: string) {
    return this.rehearsalsService.listForEvent(id);
  }

  @Post(":id/rehearsals")
  async addRehearsal(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { rehearsalId: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.rehearsalsService.addToEvent(id, body.rehearsalId);
  }

  @Delete(":id/rehearsals/:rehearsalId")
  async removeRehearsal(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("rehearsalId") rehearsalId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.rehearsalsService.removeFromEvent(id, rehearsalId);
  }

  // ── Volunteers ─────────────────────────────────────────────────────────────

  @Get(":id/volunteers")
  async listVolunteers(@Param("id") id: string) {
    return this.eventsService.listVolunteers(id);
  }

  @Post(":id/volunteers")
  async addVolunteer(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { userId: string; volunteerArea: string; role?: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.addVolunteer(id, body);
  }

  @Delete(":id/volunteers/:volunteerId")
  async removeVolunteer(
    @Headers("authorization") authorization: string | undefined,
    @Param("volunteerId") volunteerId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.eventsService.removeVolunteer(volunteerId);
  }
}
