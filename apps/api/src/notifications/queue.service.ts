import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";

// ── Payload types (shared with worker) ───────────────────────────────────────
export type PushJobData = {
  title: string;
  body: string;
  tokens: string[];
  data?: Record<string, unknown>;
};

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// ── QueueService ──────────────────────────────────────────────────────────────

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: IORedis | null = null;
  private pushQueue: Queue | null = null;
  private emailQueue: Queue | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn("REDIS_URL not set — queue publishing disabled (fallback to sync)");
      return;
    }

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      this.connection.on("error", (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      const defaultJobOptions = {
        attempts: 3,
        backoff: { type: "exponential" as const, delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      };

      this.pushQueue = new Queue("overflow.push", {
        connection: this.connection,
        defaultJobOptions,
      });

      this.emailQueue = new Queue("overflow.email", {
        connection: this.connection,
        defaultJobOptions: { ...defaultJobOptions, backoff: { type: "exponential" as const, delay: 10000 } },
      });
    } catch (err) {
      this.logger.error("Failed to initialise queue connection", err);
      this.connection = null;
      this.pushQueue = null;
      this.emailQueue = null;
    }
  }

  /** Enqueue a push notification batch. Returns false if queue is unavailable. */
  async enqueuePush(data: PushJobData): Promise<boolean> {
    if (!this.pushQueue) return false;
    try {
      await this.pushQueue.add("send", data);
      return true;
    } catch (err) {
      this.logger.warn("Failed to enqueue push job — will fallback to sync", err);
      return false;
    }
  }

  /** Enqueue a transactional email. Returns false if queue is unavailable. */
  async enqueueEmail(data: EmailJobData): Promise<boolean> {
    if (!this.emailQueue) return false;
    try {
      await this.emailQueue.add("send", data);
      return true;
    } catch (err) {
      this.logger.warn("Failed to enqueue email job", err);
      return false;
    }
  }

  /** Returns true if the Redis connection is responsive. Used by health checks. */
  async isRedisHealthy(): Promise<boolean> {
    if (!this.connection) return false;
    try {
      const result = await this.connection.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    try {
      await this.pushQueue?.close();
      await this.emailQueue?.close();
      await this.connection?.quit();
    } catch {
      // ignore on shutdown
    }
  }
}
