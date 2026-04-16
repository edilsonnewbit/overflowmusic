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
import { RehearsalsService } from "./rehearsals.service";
import { AuthService } from "../auth/auth.service";
import { SetlistService } from "../setlist/setlist.service";

type CreateRehearsalBody = {
  title: string;
  dateTime: string;
  location?: string;
  address?: string;
  description?: string;
  notes?: string;
  durationMinutes?: number;
};

type UpdateRehearsalBody = Partial<CreateRehearsalBody>;

type UpsertSetlistBody = { title?: string; notes?: string };
type CreateSetlistItemBody = {
  songTitle: string;
  key?: string;
  leaderName?: string;
  zone?: string;
  transitionNotes?: string;
  order?: number;
};
type UpdateSetlistItemBody = Partial<CreateSetlistItemBody>;
type ReorderBody = { items: Array<{ id: string; order: number }> };

@SkipThrottle({ global: true })
@Controller("api/rehearsals")
export class RehearsalsController {
  constructor(
    private readonly rehearsalsService: RehearsalsService,
    private readonly authService: AuthService,
    private readonly setlistService: SetlistService,
  ) {}

  @Get()
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.rehearsalsService.list({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.rehearsalsService.getById(id);
  }

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: CreateRehearsalBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.rehearsalsService.create(body);
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: UpdateRehearsalBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.rehearsalsService.update(id, body);
  }

  @Delete(":id")
  async remove(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.rehearsalsService.remove(id);
  }

  // ── Setlist endpoints ─────────────────────────────────────────────────────

  @Get(":id/setlist")
  async getSetlist(@Param("id") id: string) {
    return this.setlistService.getByRehearsal(id);
  }

  @Put(":id/setlist")
  async upsertSetlist(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: UpsertSetlistBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.upsertByRehearsal(id, body);
  }

  @Post(":id/setlist/items")
  async addSetlistItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: CreateSetlistItemBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.addItemToRehearsal(id, body);
  }

  @Patch(":id/setlist/items/:itemId")
  async updateSetlistItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateSetlistItemBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.updateItemInRehearsal(id, itemId, body);
  }

  @Delete(":id/setlist/items/:itemId")
  async removeSetlistItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.removeItemFromRehearsal(id, itemId);
  }

  @Post(":id/setlist/reorder")
  async reorderSetlist(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: ReorderBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.setlistService.reorderRehearsal(id, body);
  }
}
