import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type CreateTemplateInput = {
  name: string;
  items: string[];
};

type UpdateTemplateInput = Partial<CreateTemplateInput>;

@Injectable()
export class ChecklistTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const templates = await this.prisma.checklistTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, templates };
  }

  async create(input: CreateTemplateInput) {
    const name = (input.name || "").trim();
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const items = this.sanitizeItems(input.items);
    if (items.length === 0) {
      throw new BadRequestException("items is required");
    }

    const template = await this.prisma.checklistTemplate.create({
      data: {
        name,
        items: items as Prisma.InputJsonValue,
      },
    });

    return { ok: true, template };
  }

  async update(id: string, input: UpdateTemplateInput) {
    const existing = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("template not found");
    }

    const data: {
      name?: string;
      items?: Prisma.InputJsonValue;
    } = {};

    if (typeof input.name === "string") {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("name cannot be empty");
      }
      data.name = name;
    }

    if (Array.isArray(input.items)) {
      data.items = this.sanitizeItems(input.items) as Prisma.InputJsonValue;
    }

    const template = await this.prisma.checklistTemplate.update({
      where: { id },
      data,
    });

    return { ok: true, template };
  }

  async remove(id: string) {
    const existing = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException("template not found");
    }

    await this.prisma.checklistTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private sanitizeItems(items: unknown): string[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
}
