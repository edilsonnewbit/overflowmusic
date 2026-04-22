import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type CreatePadInput = {
  name: string;
  key?: string | null;
  driveUrl: string;
  description?: string | null;
};

type UpdatePadInput = Partial<CreatePadInput>;

/** Extrai o fileId de uma URL do Google Drive */
function extractDriveFileId(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1?.[1]) return m1[1];
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2?.[1]) return m2[1];
  throw new BadRequestException("URL do Google Drive inválida. Use o link de compartilhamento do arquivo.");
}

@Injectable()
export class PadsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPads(key?: string) {
    return this.prisma.pad.findMany({
      where: key ? { key } : undefined,
      orderBy: [{ key: "asc" }, { name: "asc" }],
    });
  }

  async createPad(input: CreatePadInput) {
    const driveFileId = extractDriveFileId(input.driveUrl);
    return this.prisma.pad.create({
      data: {
        name:        input.name,
        key:         input.key ?? null,
        driveFileId,
        driveUrl:    input.driveUrl,
        description: input.description ?? null,
      },
    });
  }

  async updatePad(id: string, input: UpdatePadInput) {
    await this.assertExists(id);
    const data: Record<string, unknown> = {};
    if (input.name        !== undefined) data.name        = input.name;
    if (input.key         !== undefined) data.key         = input.key;
    if (input.description !== undefined) data.description = input.description;
    if (input.driveUrl !== undefined) {
      data.driveUrl    = input.driveUrl;
      data.driveFileId = extractDriveFileId(input.driveUrl);
    }
    return this.prisma.pad.update({ where: { id }, data });
  }

  async deletePad(id: string) {
    await this.assertExists(id);
    await this.prisma.pad.delete({ where: { id } });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const pad = await this.prisma.pad.findUnique({ where: { id } });
    if (!pad) throw new NotFoundException("Pad não encontrado");
    return pad;
  }
}
