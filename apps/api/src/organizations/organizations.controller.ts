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
import { OrganizationsService } from "./organizations.service";
import { AuthService } from "../auth/auth.service";

@Controller("api/organizations")
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.orgsService.list(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.orgsService.findById(id);
  }

  @Post()
  async create(
    @Headers("authorization") auth: string | undefined,
    @Body() body: { name: string; slug?: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.create({ name: body.name, slug: body.slug || body.name });
  }

  @Patch(":id")
  async update(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() body: { name?: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.update(id, body);
  }

  @Delete(":id")
  async remove(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.remove(id);
  }

  @Post(":id/members")
  async addMember(
    @Headers("authorization") auth: string | undefined,
    @Param("id") orgId: string,
    @Body() body: { userId: string; role?: "OWNER" | "ADMIN" | "MEMBER"; instrument?: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.addMember(orgId, body);
  }

  @Patch(":id/members/:memberId")
  async updateMember(
    @Headers("authorization") auth: string | undefined,
    @Param("id") orgId: string,
    @Param("memberId") memberId: string,
    @Body() body: { role?: "OWNER" | "ADMIN" | "MEMBER"; instrument?: string },
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.updateMember(orgId, memberId, body);
  }

  @Delete(":id/members/:memberId")
  async removeMember(
    @Headers("authorization") auth: string | undefined,
    @Param("id") orgId: string,
    @Param("memberId") memberId: string,
  ) {
    await this.authService.assertAdminKeyOrContentManager(auth);
    return this.orgsService.removeMember(orgId, memberId);
  }
}
