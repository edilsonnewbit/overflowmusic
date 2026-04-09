import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";

@Injectable()
export class DriveService implements OnModuleInit {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive | null = null;
  private readonly folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

  onModuleInit(): void {
    const keyRaw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").trim();
    if (!keyRaw || !this.folderId) {
      this.logger.warn(
        "[DriveService] GOOGLE_SERVICE_ACCOUNT_KEY ou GOOGLE_DRIVE_FOLDER_ID não configurados. Upload de vídeos desabilitado."
      );
      return;
    }

    try {
      const key = JSON.parse(
        keyRaw.startsWith("{") ? keyRaw : Buffer.from(keyRaw, "base64").toString("utf-8")
      );
      const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });
      this.drive = google.drive({ version: "v3", auth });
      this.logger.log("[DriveService] Autenticado com sucesso via Service Account.");
    } catch (err) {
      this.logger.error("[DriveService] Falha ao inicializar credenciais:", err);
    }
  }

  get isAvailable(): boolean {
    return this.drive !== null && this.folderId !== "";
  }

  /**
   * Faz upload de um buffer para o Google Drive na pasta configurada.
   * Retorna { fileId, webViewLink } ou null se Drive não estiver configurado.
   */
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

    // Tornar o arquivo acessível para leitura por quem tiver o link
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
}
