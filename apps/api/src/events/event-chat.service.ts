import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

export type ChatMessageRow = {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  text: string;
  isPrivate: boolean;
  toUserId: string | null;
  toUserName: string | null;
  createdAt: string;
};

@Injectable()
export class EventChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Lista mensagens públicas do evento (e privadas do usuário autenticado) */
  async list(eventId: string, authorization: string | undefined): Promise<{ messages: ChatMessageRow[] }> {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    let userId: string | null = null;
    try {
      const { user } = await this.auth.getMe(token);
      userId = user.id;
    } catch {
      // sem token — só mensagens públicas
    }

    const rows = await this.prisma.eventChatMessage.findMany({
      where: {
        eventId,
        OR: [
          { isPrivate: false },
          ...(userId ? [{ userId }, { toUserId: userId }] : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return {
      messages: rows.map((m) => ({
        id: m.id,
        eventId: m.eventId,
        userId: m.userId,
        userName: m.user.name,
        userPhoto: m.user.photoUrl ?? null,
        text: m.text,
        isPrivate: m.isPrivate,
        toUserId: m.toUserId ?? null,
        toUserName: m.toUser?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /** Envia mensagem */
  async send(
    eventId: string,
    authorization: string | undefined,
    input: { text: string; isPrivate?: boolean; toUserId?: string },
  ): Promise<{ ok: true; message: ChatMessageRow }> {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.auth.getMe(token);

    const text = (input.text || "").trim();
    if (!text) throw new BadRequestException("text is required");
    if (text.length > 2000) throw new BadRequestException("message too long (max 2000 chars)");

    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException("event not found");

    const isPrivate = !!input.isPrivate;
    const toUserId = isPrivate && input.toUserId ? input.toUserId : null;

    const msg = await this.prisma.eventChatMessage.create({
      data: { eventId, userId: user.id, text, isPrivate, toUserId },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    return {
      ok: true,
      message: {
        id: msg.id,
        eventId: msg.eventId,
        userId: msg.userId,
        userName: msg.user.name,
        userPhoto: msg.user.photoUrl ?? null,
        text: msg.text,
        isPrivate: msg.isPrivate,
        toUserId: msg.toUserId ?? null,
        toUserName: msg.toUser?.name ?? null,
        createdAt: msg.createdAt.toISOString(),
      },
    };
  }

  /** Deleta mensagem (o próprio autor ou admin) */
  async delete(messageId: string, authorization: string | undefined): Promise<{ ok: true }> {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { user } = await this.auth.getMe(token);

    const msg = await this.prisma.eventChatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException("message not found");
    if (msg.userId !== user.id && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      throw new BadRequestException("not authorized");
    }

    await this.prisma.eventChatMessage.delete({ where: { id: messageId } });
    return { ok: true };
  }
}
