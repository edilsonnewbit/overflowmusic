import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuditionsService } from "./auditions.service";

@Controller("api/auditions")
export class AuditionsController {
  private readonly logger = new Logger(AuditionsController.name);

  constructor(private readonly service: AuditionsService) {}

  /**
   * POST /api/auditions
   * Rota pública — qualquer pessoa pode se inscrever.
   * Aceita multipart/form-data com campos de texto + vídeo opcional (campo "video").
   * Throttle secundário: 10 envios por BFF por minuto (o BFF já limita 3/hora por IP real).
   */
  @Post()
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor("video", {
      limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
    })
  )
  async create(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      return await this.service.create({
        name: body.name,
        email: body.email,
        whatsapp: body.whatsapp,
        birthDate: body.birthDate,
        city: body.city,
        church: body.church,
        pastorName: body.pastorName,
        instagramProfile: body.instagramProfile,
        volunteerArea: body.volunteerArea,
        skills: body.skills ? (JSON.parse(body.skills) as string[]) : [],
        availability: body.availability ? (JSON.parse(body.availability) as string[]) : [],
        hasTransport: body.hasTransport === "true",
        motivation: body.motivation,
        videoBuffer: file?.buffer,
        videoMimeType: file?.mimetype,
        videoFilename: file?.originalname,
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
