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
import { AuthService } from "../auth/auth.service";
import { PadsService } from "./pads.service";

@SkipThrottle({ global: true })
@Controller("api/pads")
export class PadsController {
  constructor(
    private readonly padsService: PadsService,
    private readonly authService: AuthService,
  ) {}

  /** Lista todos os pads — qualquer usuário pode consultar */
  @Get()
  async listPads(@Query("key") key?: string) {
    return this.padsService.listPads(key);
  }

  /** Cria um pad (apenas ADMIN/SUPER_ADMIN) */
  @Post()
  async createPad(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { name: string; key?: string; driveUrl: string; description?: string },
  ) {
    await this.assertWriteAccess(authorization);
    return this.padsService.createPad(body);
  }

  /** Atualiza um pad */
  @Patch(":id")
  async updatePad(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { name?: string; key?: string | null; driveUrl?: string; description?: string | null },
  ) {
    await this.assertWriteAccess(authorization);
    return this.padsService.updatePad(id, body);
  }

  /** Remove um pad */
  @Delete(":id")
  async deletePad(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    await this.assertWriteAccess(authorization);
    return this.padsService.deletePad(id);
  }

  private async assertWriteAccess(authorization?: string) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
  }
}
