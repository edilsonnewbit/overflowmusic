import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuditionsService } from "./auditions.service";

@Controller("api/auditions")
export class AuditionsController {
  private readonly logger = new Logger(AuditionsController.name);

  constructor(private readonly service: AuditionsService) {}

  /**
   * POST /api/auditions
   * Rota pública — qualquer pessoa pode se inscrever.
   * Aceita JSON com link do YouTube opcional.
   * Throttle secundário: 10 envios por BFF por minuto (o BFF já limita 3/hora por IP real).
   */
  @Post()
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  async create(@Body() body: Record<string, unknown>) {
    try {
      return await this.service.create({
        name: body.name as string,
        email: body.email as string,
        whatsapp: body.whatsapp as string,
        birthDate: body.birthDate as string | undefined,
        city: body.city as string | undefined,
        church: body.church as string | undefined,
        pastorName: body.pastorName as string | undefined,
        instagramProfile: body.instagramProfile as string | undefined,
        volunteerArea: body.volunteerArea as string,
        skills: Array.isArray(body.skills) ? (body.skills as string[]) : [],
        availability: Array.isArray(body.availability) ? (body.availability as string[]) : [],
        hasTransport: body.hasTransport === true,
        motivation: body.motivation as string | undefined,
        youtubeUrl: (body.youtubeUrl as string | null | undefined) ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error("[AuditionsController] create falhou:", message);
      throw err;
    }
  }

  /**
   * GET /api/auditions
   * Requer autenticação de admin ou content manager.
   */
  @Get()
  async listAll(@Headers("authorization") auth?: string) {
    return this.service.listAll(auth);
  }

  /**
   * PATCH /api/auditions/:id/status
   * Atualiza status de uma audição.
   */
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Headers("authorization") auth: string | undefined,
    @Body() body: { status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"; adminNotes?: string },
  ) {
    return this.service.updateStatus(id, auth, body.status, body.adminNotes);
  }
}
