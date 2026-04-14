import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";

@Injectable()
export class DriveService implements OnModuleInit {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive | null = null;
  private readonly folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

  onModuleInit(): void {
    if (!this.folderId) {
      this.logger.warn("[DriveService] GOOGLE_DRIVE_FOLDER_ID não configurado. Upload desabilitado.");
      return;
    }

    // Opção A: OAuth2 com refresh token (recomendado — usa cota do dono da pasta)
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || "").trim();
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

    if (refreshToken && clientId && clientSecret) {
      try {
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
        oauth2.setCredentials({ refresh_token: refreshToken });
        this.drive = google.drive({ version: "v3", auth: oauth2 });
        this.logger.log("[DriveService] Autenticado via OAuth2 refresh token.");
        return;
      } catch (err) {
        this.logger.error("[DriveService] Falha ao inicializar OAuth2:", err);
      }
    }

    // Opção B (fallback): Service Account
    const keyRaw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").trim();
    if (keyRaw) {
      try {
        const key = JSON.parse(
          keyRaw.startsWith("{") ? keyRaw : Buffer.from(keyRaw, "base64").toString("utf-8")
        );
        const auth = new google.auth.GoogleAuth({
          credentials: key,
          scopes: ["https://www.googleapis.com/auth/drive.file"],
        });
        this.drive = google.drive({ version: "v3", auth });
        this.logger.log("[DriveService] Autenticado via Service Account.");
      } catch (err) {
        this.logger.error("[DriveService] Falha ao inicializar Service Account:", err);
      }
      return;
    }

    this.logger.warn("[DriveService] Nenhuma credencial configurada. Upload desabilitado.");
  }

  get isAvailable(): boolean {
    return this.drive !== null && this.folderId !== "";
  }

  async uploadFile(opts: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<{ fileId: string; webViewLink: string } | null> {
    if (!this.drive) return null;

    const stream = Readable.from(opts.buffer);

    const res = await this.drive.files.create({
      requestBody: {
        name: opts.filename,
        parents: [this.folderId],
      },
      media: {
        mimeType: opts.mimeType,
        body: stream,
      },
      fields: "id, webViewLink",
    });

    const fileId = res.data.id;
    const webViewLink = res.data.webViewLink;

    if (!fileId || !webViewLink) {
      throw new Error("Drive upload falhou: resposta sem id ou webViewLink");
    }

    await this.drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    return { fileId, webViewLink };
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) return;
    await this.drive.files.delete({ fileId });
  }

  async streamFile(fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    // Try Drive API first (requires credentials)
    if (this.drive) {
      try {
        const meta = await this.drive.files.get({ fileId, fields: "mimeType" });
        const mimeType = meta.data.mimeType ?? "audio/mpeg";
        const res = await this.drive.files.get(
          { fileId, alt: "media" },
          { responseType: "stream" },
        );
        return { stream: res.data as unknown as NodeJS.ReadableStream, mimeType };
      } catch (err) {
        this.logger.warn(`[DriveService] API stream falhou, tentando download público: ${String(err)}`);
      }
    }

    // Fallback: direct HTTP download for publicly shared files ("anyone with the link")
    return this.streamPublicFile(fileId);
  }

  private async streamPublicFile(fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    // Follow the redirect chain (Drive redirects large files to a confirmation page)
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    const response = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Drive download falhou: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Drive download retornou body vazio");
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";

    // Verify we got actual audio, not an HTML confirmation page
    if (contentType.includes("text/html")) {
      throw new Error("Drive exigiu confirmação — compartilhe o arquivo como 'qualquer pessoa com o link pode visualizar'");
    }

    const { Readable } = await import("node:stream");
    const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    return { stream, mimeType: contentType };
  }
}
