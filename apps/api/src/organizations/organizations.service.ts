import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type CreateOrgInput = { name: string; slug: string };
type UpdateOrgInput = { name?: string };
type AddMemberInput = { userId: string; role?: "OWNER" | "ADMIN" | "MEMBER"; instrument?: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(limit = 50, offset = 0) {
    const safeLimit = Math.min(limit, 200);
    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        take: safeLimit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.organization.count(),
    ]);
    return { ok: true, organizations: orgs, total, limit: safeLimit, offset };
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!org) throw new NotFoundException("Organization not found");
    return { ok: true, organization: org };
  }

  async create(input: CreateOrgInput) {
    const name = (input.name || "").trim();
    if (!name) throw new BadRequestException("name is required");
    const slug = input.slug ? slugify(input.slug) : slugify(name);
    if (!slug) throw new BadRequestException("Invalid slug");

    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException("Slug already in use");

    const org = await this.prisma.organization.create({ data: { name, slug } });
    return { ok: true, organization: org };
  }

  async update(id: string, input: UpdateOrgInput) {
    await this.findById(id);
    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name.trim();
    const org = await this.prisma.organization.update({ where: { id }, data });
    return { ok: true, organization: org };
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.organization.delete({ where: { id } });
    return { ok: true };
  }

  async addMember(orgId: string, input: AddMemberInput) {
    await this.findById(orgId);
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundException("User not found");

    const existing = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: input.userId, organizationId: orgId } },
    });
    if (existing) throw new BadRequestException("User is already a member");

    const member = await this.prisma.organizationMember.create({
      data: {
        userId: input.userId,
        organizationId: orgId,
        role: input.role || "MEMBER",
        instrument: input.instrument,
      },
    });
    return { ok: true, member };
  }

  async updateMember(orgId: string, memberId: string, data: { role?: "OWNER" | "ADMIN" | "MEMBER"; instrument?: string }) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found in this organization");

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data,
    });
    return { ok: true, member: updated };
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found in this organization");
    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { ok: true };
  }
}
