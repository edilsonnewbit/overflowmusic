import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "./queue.service";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async registerToken(userId: string, token: string, platform?: string): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform: platform ?? null },
      update: { userId, platform: platform ?? null },
    });
  }

  async sendToAll(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    const rows = await this.prisma.pushToken.findMany({ select: { token: true } });
    if (rows.length === 0) return;

    const tokens = rows.map((r: { token: string }) => r.token);

    // Try to enqueue — if Redis is unavailable, fall back to synchronous send
    const enqueued = await this.queue.enqueuePush({ title, body, tokens, data });
    if (enqueued) {
      this.logger.log(`Enqueued push job for ${tokens.length} token(s)`);
      return;
    }

    // Fallback: send synchronously (same behaviour as before)
    this.logger.warn("Queue unavailable — sending push synchronously");
    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title,
      body,
      data: data ?? {},
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.logger.warn(`Expo push API responded with status ${response.status}`);
      }
    } catch (err) {
      this.logger.error("Failed to send push notifications", err);
    }
  }

  async sendNewEventNotification(eventTitle: string): Promise<void> {
    await this.sendToAll("Novo evento publicado", eventTitle, { type: "new_event" });
  }

  /** Send confirmation invite to a specific musician for an event slot. */
  async sendMusicianConfirmationRequest(
    userId: string,
    eventTitle: string,
    instrumentRole: string,
    slotId: string,
  ): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const tokenList = tokens.map((t: { token: string }) => t.token);
    const title = `Convite para evento: ${instrumentRole}`;
    const body = `Você foi convidado para tocar ${instrumentRole} em "${eventTitle}". Confirme sua participação.`;

    const enqueued = await this.queue.enqueuePush({
      title,
      body,
      tokens: tokenList,
      data: { type: "musician_invite", slotId, eventTitle, instrumentRole },
    });
    if (enqueued) return;

    const messages = tokenList.map((to: string) => ({
      to,
      title,
      body,
      data: { type: "musician_invite", slotId, eventTitle, instrumentRole },
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      this.logger.error("Failed to send musician confirmation push", err);
    }
  }

  /** Send a daily reminder to a pending musician. */
  async sendMusicianReminder(
    userId: string,
    eventTitle: string,
    instrumentRole: string,
    slotId: string,
  ): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const tokenList = tokens.map((t: { token: string }) => t.token);
    const title = `Lembrete: confirme sua participação`;
    const body = `Você ainda não confirmou ${instrumentRole} em "${eventTitle}". Responda para reservar sua vaga.`;

    const enqueued = await this.queue.enqueuePush({
      title,
      body,
      tokens: tokenList,
      data: { type: "musician_reminder", slotId, eventTitle, instrumentRole },
    });
    if (enqueued) return;

    const messages = tokenList.map((to: string) => ({
      to,
      title,
      body,
      data: { type: "musician_reminder", slotId, eventTitle, instrumentRole },
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      this.logger.error("Failed to send musician reminder push", err);
    }
  }
}
