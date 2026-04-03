import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  UnauthorizedException,
} from "@nestjs/common";
import { SetlistService } from "./setlist.service";

type UpsertSetlistBody = {
  title?: string;
  notes?: string;
};

type CreateSetlistItemBody = {
  songTitle: string;
  key?: string;
  leaderName?: string;
  zone?: string;
  transitionNotes?: string;
  order?: number;
};

type UpdateSetlistItemBody = Partial<CreateSetlistItemBody>;

type ReorderBody = {
  items: Array<{ id: string; order: number }>;
};

@Controller("api/events/:eventId/setlist")
export class SetlistController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(private readonly setlistService: SetlistService) {}

  @Get()
  async getByEvent(@Param("eventId") eventId: string) {
    return this.setlistService.getByEvent(eventId);
  }

  @Put()
  async upsert(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: UpsertSetlistBody,
  ) {
    this.assertAdminKey(authorization);
    return this.setlistService.upsertByEvent(eventId, body);
  }

  @Post("items")
  async addItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: CreateSetlistItemBody,
  ) {
    this.assertAdminKey(authorization);
    return this.setlistService.addItem(eventId, body);
  }

  @Patch("items/:itemId")
  async updateItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateSetlistItemBody,
  ) {
    this.assertAdminKey(authorization);
    return this.setlistService.updateItem(eventId, itemId, body);
  }

  @Delete("items/:itemId")
  async removeItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Param("itemId") itemId: string,
  ) {
    this.assertAdminKey(authorization);
    return this.setlistService.removeItem(eventId, itemId);
  }

  @Post("reorder")
  async reorder(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: ReorderBody,
  ) {
    this.assertAdminKey(authorization);
    return this.setlistService.reorder(eventId, body);
  }

  private assertAdminKey(authorization?: string): void {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!this.adminApiKey || token !== this.adminApiKey) {
      throw new UnauthorizedException("unauthorized");
    }
  }
}
