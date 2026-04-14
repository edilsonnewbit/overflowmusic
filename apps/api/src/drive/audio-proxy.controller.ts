import { Controller, Get, Logger, Query, Res, BadRequestException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { DriveService } from "./drive.service";

@SkipThrottle({ global: true })
@Controller("api/audio-proxy")
export class AudioProxyController {
  private readonly logger = new Logger(AudioProxyController.name);

  constructor(private readonly driveService: DriveService) {}

  @Get()
  async proxy(@Query("fileId") fileId: string, @Res() res: Response) {
    if (!fileId) throw new BadRequestException("fileId é obrigatório");
    try {
      const { stream, mimeType } = await this.driveService.streamFile(fileId);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=3600");
      (stream as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      this.logger.error(`[AudioProxy] Erro ao streamar fileId=${fileId}:`, err);
      if (!res.headersSent) {
        res.status(502).json({ ok: false, message: String(err) });
      }
    }
  }
}
