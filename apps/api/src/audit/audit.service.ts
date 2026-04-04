import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(opts: {
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: opts.actorId,
          action: opts.action,
          resourceType: opts.resourceType,
          resourceId: opts.resourceId,
          metadata: opts.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // Audit should never break the main flow — log silently
    }
  }
}
