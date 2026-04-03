import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type ChecklistItemInput = {
  label: string;
  checked?: boolean;
  checkedByName?: string;
  order?: number;
};

type UpsertRunInput = {
  templateId?: string;
  items?: ChecklistItemInput[];
};

type UpdateRunItemInput = {
  label?: string;
  checked?: boolean;
  checkedByName?: string;
  order?: number;
};

@Injectable()
export class ChecklistRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByEvent(eventId: string) {
    await this.assertEventExists(eventId);

    const run = await this.prisma.checklistRun.findFirst({
      where: { eventId },
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, checklist: run };
  }

  async upsertByEvent(eventId: string, input: UpsertRunInput) {
    await this.assertEventExists(eventId);

    const itemsFromInput = this.sanitizeItems(input.items);
    const template = input.templateId
      ? await this.prisma.checklistTemplate.findUnique({ where: { id: input.templateId } })
      : null;

    if (input.templateId && !template) {
      throw new BadRequestException("template not found");
    }

    const existing = await this.prisma.checklistRun.findFirst({
      where: { eventId, templateId: input.templateId || null },
      include: { items: true },
    });

    if (existing) {
      if (itemsFromInput.length > 0) {
        await this.prisma.$transaction([
          this.prisma.checklistItemRun.deleteMany({ where: { checklistRunId: existing.id } }),
          ...itemsFromInput.map((item, index) =>
            this.prisma.checklistItemRun.create({
              data: {
                checklistRunId: existing.id,
                label: item.label,
                checked: item.checked,
                checkedByName: item.checkedByName,
                checkedAt: item.checked ? new Date() : null,
                order: item.order ?? index + 1,
              },
            }),
          ),
        ]);
      }

      const refreshed = await this.prisma.checklistRun.findUnique({
        where: { id: existing.id },
        include: { items: { orderBy: { order: "asc" } } },
      });

      return { ok: true, checklist: refreshed };
    }

    const templateItems = this.extractTemplateItems(template?.items);
    const baseItems = itemsFromInput.length > 0 ? itemsFromInput : templateItems;

    const created = await this.prisma.checklistRun.create({
      data: {
        eventId,
        templateId: template?.id || null,
        items: {
          create: baseItems.map((item, index) => ({
            label: item.label,
            checked: item.checked,
            checkedByName: item.checkedByName,
            checkedAt: item.checked ? new Date() : null,
            order: item.order ?? index + 1,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    return { ok: true, checklist: created };
  }

  async updateItem(eventId: string, itemId: string, input: UpdateRunItemInput) {
    await this.assertEventExists(eventId);

    const item = await this.prisma.checklistItemRun.findFirst({
      where: {
        id: itemId,
        checklistRun: { eventId },
      },
      include: {
        checklistRun: {
          select: { id: true },
        },
      },
    });

    if (!item) {
      throw new BadRequestException("checklist item not found");
    }

    const data: {
      label?: string;
      checked?: boolean;
      checkedByName?: string | null;
      checkedAt?: Date | null;
      order?: number;
    } = {};

    if (typeof input.label === "string") {
      const label = input.label.trim();
      if (!label) {
        throw new BadRequestException("label cannot be empty");
      }
      data.label = label;
    }

    if (typeof input.checked === "boolean") {
      data.checked = input.checked;
      data.checkedAt = input.checked ? new Date() : null;
      if (!input.checked) {
        data.checkedByName = null;
      }
    }

    if (typeof input.checkedByName === "string") {
      data.checkedByName = input.checkedByName.trim() || null;
    }

    if (typeof input.order === "number") {
      data.order = input.order;
    }

    const updatedItem = await this.prisma.checklistItemRun.update({
      where: { id: itemId },
      data,
    });

    const items = await this.prisma.checklistItemRun.findMany({
      where: { checklistRunId: item.checklistRun.id },
      orderBy: { order: "asc" },
    });

    return { ok: true, item: updatedItem, items };
  }

  private async assertEventExists(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new BadRequestException("event not found");
    }
  }

  private sanitizeItems(items: unknown): Array<{ label: string; checked: boolean; checkedByName: string | null; order?: number }> {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item): item is ChecklistItemInput => item !== null && typeof item === "object")
      .map((item) => ({
        label: typeof item.label === "string" ? item.label.trim() : "",
        checked: Boolean(item.checked),
        checkedByName: typeof item.checkedByName === "string" ? item.checkedByName.trim() || null : null,
        order: typeof item.order === "number" ? item.order : undefined,
      }))
      .filter((item) => item.label.length > 0);
  }

  private extractTemplateItems(
    itemsJson: unknown,
  ): Array<{ label: string; checked: boolean; checkedByName: string | null; order?: number }> {
    if (!Array.isArray(itemsJson)) {
      return [];
    }

    return itemsJson
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((label) => ({
        label,
        checked: false,
        checkedByName: null,
      }));
  }
}
