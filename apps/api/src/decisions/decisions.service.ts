import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

const DECISION_TYPES = ["PRIMEIRA_VEZ", "RECONSAGRACAO", "BATISMO", "OUTRO"] as const;
type DecisionType = typeof DECISION_TYPES[number];

export type CreateDecisionInput = {
  name: string;
  whatsapp: string;
  city?: string;
  church?: string;
  decisionType?: DecisionType;
  howDidYouHear?: string;
  acceptsContact?: boolean;
  churchHelp?: string;
  wantsPrayer?: boolean;
  notes?: string;
};

export type DecisionRow = {
  id: string;
  name: string;
  whatsapp: string;
  city: string | null;
  church: string | null;
  decisionType: string;
  howDidYouHear: string | null;
  acceptsContact: boolean;
  churchHelp: string | null;
  wantsPrayer: boolean | null;
  notes: string | null;
  createdAt: string;
};

@Injectable()
export class DecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Busca evento pelo slug — rota pública só precisa do título */
  async getEventBySlug(slug: string): Promise<{ id: string; title: string; dateTime: string; location: string | null }> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, title: true, dateTime: true, location: true },
    });
    if (!event) throw new NotFoundException("Evento não encontrado");
    return { ...event, dateTime: event.dateTime.toISOString() };
  }

  /** Registra decisão — rota pública */
  async create(slug: string, input: CreateDecisionInput): Promise<{ ok: true; id: string }> {
    const name = (input.name || "").trim();
    const whatsapp = (input.whatsapp || "").trim();

    if (!name || !whatsapp) {
      throw new BadRequestException("name e whatsapp são obrigatórios");
    }

    const event = await this.prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) throw new NotFoundException("Evento não encontrado");

    const decisionType: DecisionType = DECISION_TYPES.includes(input.decisionType as DecisionType)
      ? (input.decisionType as DecisionType)
      : "PRIMEIRA_VEZ";

    const decision = await this.prisma.eventDecision.create({
      data: {
        eventId: event.id,
        name,
        whatsapp,
        city: (input.city || "").trim() || null,
        church: (input.church || "").trim() || null,
        decisionType,
        howDidYouHear: (input.howDidYouHear || "").trim() || null,
        acceptsContact: input.acceptsContact ?? true,
        churchHelp: (input.churchHelp || "").trim() || null,
        wantsPrayer: input.wantsPrayer ?? null,
        notes: (input.notes || "").trim() || null,
      },
    });

    return { ok: true, id: decision.id };
  }

  /** Lista decisões de um evento — requer admin */
  async listByEvent(
    eventId: string,
    authorization: string | undefined,
  ): Promise<{ ok: true; decisions: DecisionRow[]; total: number }> {
    await this.auth.assertAdminKeyOrContentManager(authorization);

    const decisions = await this.prisma.eventDecision.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      total: decisions.length,
      decisions: decisions.map((d) => ({
        id: d.id,
        name: d.name,
        whatsapp: d.whatsapp,
        city: d.city,
        church: d.church,
        decisionType: d.decisionType,
        howDidYouHear: d.howDidYouHear,
        acceptsContact: d.acceptsContact,
        churchHelp: d.churchHelp,
        wantsPrayer: d.wantsPrayer,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  /** Exporta CSV de decisões — requer admin */
  async exportCsv(eventId: string, authorization: string | undefined): Promise<string> {
    await this.auth.assertAdminKeyOrContentManager(authorization);

    const decisions = await this.prisma.eventDecision.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });

    const header = "Nome,WhatsApp,Cidade,Igreja,Tipo de Decisão,Como soube,Aceita contato,Conexão Igreja,Quer oração,Observações,Data\n";
    const rows = decisions.map((d) =>
      [
        `"${d.name}"`,
        `"${d.whatsapp}"`,
        `"${d.city ?? ""}"`,
        `"${d.church ?? ""}"`,
        `"${d.decisionType}"`,
        `"${d.howDidYouHear ?? ""}"`,
        d.acceptsContact ? "Sim" : "Não",
        `"${d.churchHelp ?? ""}"`,
        d.wantsPrayer === true ? "Sim" : d.wantsPrayer === false ? "Não" : "",
        `"${(d.notes ?? "").replace(/"/g, '""')}"`,
        new Date(d.createdAt).toLocaleString("pt-BR"),
      ].join(",")
    );

    return header + rows.join("\n");
  }
}
