import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DriveService } from "../drive/drive.service";
import { AuthService } from "../auth/auth.service";
import { VOLUNTEER_AREAS } from "../auth/auth.types";

export type CreateAuditionInput = {
  name: string;
  email: string;
  whatsapp: string;
  birthDate?: string;
  city?: string;
  church?: string;
  pastorName?: string;
  instagramProfile?: string;
  volunteerArea: string;
  skills?: string[];
  availability?: string[];
  hasTransport?: boolean;
  motivation?: string;
  videoBuffer?: Buffer;
  videoMimeType?: string;
  videoFilename?: string;
};

export type AuditionSummary = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  volunteerArea: string;
  status: string;
  driveFileUrl: string | null;
  createdAt: string;
};

@Injectable()
export class AuditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drive: DriveService,
    private readonly auth: AuthService,
  ) {}

  async create(input: CreateAuditionInput): Promise<{ ok: true; id: string }> {
    const name = (input.name || "").trim();
    const email = (input.email || "").trim().toLowerCase();
    const whatsapp = (input.whatsapp || "").trim();
    const volunteerArea = (input.volunteerArea || "").trim();

    if (!name || !email || !whatsapp || !volunteerArea) {
      throw new BadRequestException("name, email, whatsapp e volunteerArea são obrigatórios");
    }

    if (!(volunteerArea in VOLUNTEER_AREAS)) {
      throw new BadRequestException("Área de voluntariado inválida");
    }

    let driveFileId: string | null = null;
    let driveFileUrl: string | null = null;

    if (input.videoBuffer && input.videoBuffer.length > 0) {
      const maxBytes = 300 * 1024 * 1024; // 300 MB
      if (input.videoBuffer.length > maxBytes) {
        throw new BadRequestException("O vídeo não pode ultrapassar 300 MB");
      }
      const result = await this.drive.uploadFile({
        buffer: input.videoBuffer,
        mimeType: input.videoMimeType ?? "video/mp4",
        filename: input.videoFilename ?? `audicao_${Date.now()}.mp4`,
      });
      if (result) {
        driveFileId = result.fileId;
        driveFileUrl = result.webViewLink;
      }
    }

    const audition = await this.prisma.audition.create({
      data: {
        name,
        email,
        whatsapp,
        birthDate: (input.birthDate || "").trim() || null,
        city: (input.city || "").trim() || null,
        church: (input.church || "").trim() || null,
        pastorName: (input.pastorName || "").trim() || null,
        instagramProfile: (input.instagramProfile || "").trim() || null,
        volunteerArea,
        skills: Array.isArray(input.skills) ? input.skills : [],
        availability: Array.isArray(input.availability) ? input.availability : [],
        hasTransport: input.hasTransport ?? false,
        motivation: (input.motivation || "").trim() || null,
        driveFileId,
        driveFileUrl,
      },
    });

    return { ok: true, id: audition.id };
  }

  async listAll(authorization: string | undefined): Promise<{ ok: true; auditions: AuditionSummary[] }> {
    await this.auth.assertAdminKeyOrContentManager(authorization);

    const auditions = await this.prisma.audition.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        birthDate: true,
        city: true,
        church: true,
        pastorName: true,
        instagramProfile: true,
        volunteerArea: true,
        skills: true,
        availability: true,
        hasTransport: true,
        motivation: true,
        driveFileUrl: true,
        status: true,
        adminNotes: true,
        reviewedAt: true,
        reviewedBy: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      auditions: auditions.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
      })),
    };
  }

  async updateStatus(
    id: string,
    authorization: string | undefined,
    status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED",
    adminNotes?: string,
  ): Promise<{ ok: true }> {
    await this.auth.assertAdminKeyOrContentManager(authorization);

    const audition = await this.prisma.audition.findUnique({ where: { id } });
    if (!audition) throw new NotFoundException("Audição não encontrada");

    await this.prisma.audition.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes !== undefined ? (adminNotes || null) : undefined,
        reviewedAt: ["APPROVED", "REJECTED"].includes(status) ? new Date() : undefined,
      },
    });

    return { ok: true };
  }
}
