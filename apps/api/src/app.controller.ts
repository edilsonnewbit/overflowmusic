import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "./prisma/prisma.service";
import { QueueService } from "./notifications/queue.service";

@SkipThrottle({ global: true })
@Controller()
export class AppController {
  private readonly version = process.env.IMAGE_TAG || "dev";
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private async getHealthData(): Promise<{
    ok: boolean;
    service: string;
    version: string;
    db: string;
    redis: string;
  }> {
    const [dbUp, redisUp] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.queue.isRedisHealthy(),
    ]);
    return {
      ok: dbUp && redisUp,
      service: "api",
      version: this.version,
      db: dbUp ? "up" : "down",
      redis: redisUp ? "up" : "down",
    };
  }

  @Get("health")
  async health() {
    return this.getHealthData();
  }

  @Get("api/health")
  async apiHealth() {
    return this.getHealthData();
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
