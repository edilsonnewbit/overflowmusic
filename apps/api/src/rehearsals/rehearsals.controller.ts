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
import { RehearsalsService } from "./rehearsals.service";
import { AuthService } from "../auth/auth.service";

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

@SkipThrottle()
@Controller("api/rehearsals")
export class RehearsalsController {
  constructor(
    private readonly rehearsalsService: RehearsalsService,
    private readonly authService: AuthService,
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
}
