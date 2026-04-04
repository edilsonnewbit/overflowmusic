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
  UnauthorizedException,
} from "@nestjs/common";
import { EventsService } from "./events.service";
import { AuditService } from "../audit/audit.service";

type CreateEventBody = {
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  eventType?: "CULTO" | "CONFERENCIA" | "ENSAIO" | "OUTRO";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type UpdateEventBody = Partial<CreateEventBody>;

@Controller("api/events")
export class EventsController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
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
    this.assertAdminKey(authorization);
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
    this.assertAdminKey(authorization);
    return this.eventsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    this.assertAdminKey(authorization);
    const result = await this.eventsService.remove(id);
    void this.auditService.log({ action: "event.deleted", resourceType: "Event", resourceId: id });
    return result;
  }

  private assertAdminKey(authorization?: string): void {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!this.adminApiKey || token !== this.adminApiKey) {
      throw new UnauthorizedException("unauthorized");
    }
  }
}
