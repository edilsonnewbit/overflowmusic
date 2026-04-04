/**
 * Overflow Music — Background Worker
 *
 * Queues processed:
 *   overflow.push  — Expo push notification batches
 *   overflow.email — Transactional email via SMTP
 *
 * Job retries are handled by BullMQ (3 attempts, exponential backoff).
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { createTransport } from "nodemailer";

// ── Redis connection ──────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("[worker] REDIS_URL is not set — exiting");
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

connection.on("connect", () => console.log("[worker] Redis connected"));
connection.on("error", (err) => console.error("[worker] Redis error:", err.message));

// ── SMTP transport (optional — only if SMTP_HOST is configured) ───────────────
const smtpTransport =
  process.env.SMTP_HOST
    ? createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

// ── Push notification worker ──────────────────────────────────────────────────
const pushWorker = new Worker(
  "overflow.push",
  async (job) => {
    const { title, body, tokens, data } = job.data;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.warn(`[push] job ${job.id} has no tokens — skipping`);
      return;
    }

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data: data ?? {},
    }));

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
      const text = await response.text();
      throw new Error(`Expo push API ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = await response.json();
    console.log(
      `[push] job ${job.id} sent ${tokens.length} notification(s) — status: ${response.status}`,
    );
    return result;
  },
  {
    connection,
    concurrency: 3,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  },
);

pushWorker.on("completed", (job) => {
  console.log(`[push] job ${job.id} completed`);
});

pushWorker.on("failed", (job, err) => {
  console.error(`[push] job ${job?.id} failed:`, err.message);
});

// ── Email worker ──────────────────────────────────────────────────────────────
const emailWorker = new Worker(
  "overflow.email",
  async (job) => {
    const { to, subject, html, text } = job.data;

    if (!smtpTransport) {
      console.warn(`[email] job ${job.id} skipped — SMTP_HOST not configured`);
      return;
    }

    const info = await smtpTransport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });

    console.log(`[email] job ${job.id} sent to ${to} — messageId: ${info.messageId}`);
    return { messageId: info.messageId };
  },
  {
    connection,
    concurrency: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  },
);

emailWorker.on("completed", (job) => {
  console.log(`[email] job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[email] job ${job?.id} failed:`, err.message);
});

// ── Heartbeat ─────────────────────────────────────────────────────────────────
setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, 60_000);

console.log("[worker] started — listening on overflow.push and overflow.email");

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown() {
  console.log("[worker] shutting down...");
  await pushWorker.close();
  await emailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
