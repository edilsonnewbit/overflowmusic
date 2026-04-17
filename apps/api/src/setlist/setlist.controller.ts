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
  Query,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { SetlistService } from "./setlist.service";
import { AuthService } from "../auth/auth.service";

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

@SkipThrottle({ global: true })
@Controller("api/events/:eventId/setlist")
export class SetlistController {
  constructor(
    private readonly setlistService: SetlistService,
    private readonly authService: AuthService,
  ) {}

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
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.upsertByEvent(eventId, body);
  }

  @Post("items")
  async addItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: CreateSetlistItemBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const actor = await this.authService.getActorFromAuth(authorization);
    return this.setlistService.addItem(eventId, body, actor);
  }

  @Patch("items/:itemId")
  async updateItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateSetlistItemBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const actor = await this.authService.getActorFromAuth(authorization);
    return this.setlistService.updateItem(eventId, itemId, body, actor);
  }

  @Delete("items/:itemId")
  async removeItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Param("itemId") itemId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const actor = await this.authService.getActorFromAuth(authorization);
    return this.setlistService.removeItem(eventId, itemId, actor);
  }

  @Post("reorder")
  async reorder(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: ReorderBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    const actor = await this.authService.getActorFromAuth(authorization);
    return this.setlistService.reorder(eventId, body, actor);
  }

  @Get("logs")
  async getLogs(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.setlistService.getEventLogs(eventId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get("tracks")
  async getSetlistTracks(@Param("eventId") eventId: string) {
    return this.setlistService.getSetlistTracks(eventId);
  }
}
