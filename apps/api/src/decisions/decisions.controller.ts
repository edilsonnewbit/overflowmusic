import { Body, Controller, Get, Headers, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { DecisionsService } from "./decisions.service";

@Controller("api/decisions")
export class DecisionsController {
  constructor(private readonly service: DecisionsService) {}

  /** GET /api/decisions/event-by-slug/:slug — info pública do evento pelo slug */
  @Get("event-by-slug/:slug")
  async getEventBySlug(@Param("slug") slug: string) {
    return this.service.getEventBySlug(slug);
  }

  /** POST /api/decisions/:slug — registrar decisão (rota pública) */
  @Post(":slug")
  async create(
    @Param("slug") slug: string,
    @Body() body: {
      name: string;
      whatsapp: string;
      city?: string;
      church?: string;
      decisionType?: "PRIMEIRA_VEZ" | "RECONSAGRACAO" | "BATISMO" | "OUTRO";
      howDidYouHear?: string;
      acceptsContact?: boolean;
      notes?: string;
    },
  ) {
    return this.service.create(slug, body);
  }

  /** GET /api/decisions/event/:eventId — listar decisões (admin) */
  @Get("event/:eventId")
  async listByEvent(
    @Param("eventId") eventId: string,
    @Headers("authorization") auth?: string,
  ) {
    return this.service.listByEvent(eventId, auth);
  }

  /** GET /api/decisions/event/:eventId/csv — exportar CSV (admin) */
  @Get("event/:eventId/csv")
  async exportCsv(
    @Param("eventId") eventId: string,
    @Headers("authorization") auth: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(eventId, auth);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="decisoes-${eventId}.csv"`);
    res.send("\uFEFF" + csv); // BOM para Excel reconhecer UTF-8
  }
}
