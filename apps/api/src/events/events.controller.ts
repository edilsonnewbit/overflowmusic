import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { EventsService } from "./events.service";

type CreateEventBody = {
  title: string;
  dateTime: string;
  location?: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type UpdateEventBody = Partial<CreateEventBody>;

@Controller("api/events")
export class EventsController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list() {
    return this.eventsService.list();
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.eventsService.getById(id);
  }

  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: CreateEventBody) {
    this.assertAdminKey(authorization);
    return this.eventsService.create(body);
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
    return this.eventsService.remove(id);
  }

  private assertAdminKey(authorization?: string): void {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!this.adminApiKey || token !== this.adminApiKey) {
      throw new UnauthorizedException("unauthorized");
    }
  }
}
