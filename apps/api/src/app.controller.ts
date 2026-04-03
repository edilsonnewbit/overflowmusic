import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";

@Controller()
export class AppController {
  private readonly version = process.env.IMAGE_TAG || "dev";
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  @Get("health")
  health(): { ok: true; service: string; version: string } {
    return { ok: true, service: "api", version: this.version };
  }

  @Get("api/health")
  apiHealth(): { ok: true; service: string; version: string } {
    return { ok: true, service: "api", version: this.version };
  }

  @Get("api/admin/auth/check")
  adminAuthCheck(
    @Headers("authorization") authorization?: string,
  ): { ok: true; version: string } {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!this.adminApiKey || token !== this.adminApiKey) {
      throw new UnauthorizedException("unauthorized");
    }

    return { ok: true, version: this.version };
  }
}
