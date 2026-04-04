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
}
