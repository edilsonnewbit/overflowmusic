import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, AccessTokenPayload, UserRole } from "./auth.types";

type GoogleLoginInput = {
  email: string;
  name: string;
  googleSub: string;
};

type DbUserRecord = {
  id: string;
  name: string;
  email: string;
  googleSub: string;
  role: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
  private readonly tokenTtlSeconds = 60 * 60 * 24 * 7;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUsers();
  }

  async googleLogin(
    input: GoogleLoginInput,
  ): Promise<
    | { ok: true; status: "PENDING_APPROVAL"; user: AuthUser }
    | { ok: true; status: "REJECTED"; user: AuthUser }
    | { ok: true; status: "APPROVED"; user: AuthUser; accessToken: string }
  > {
    const email = (input.email || "").trim().toLowerCase();
    const name = (input.name || "").trim();
    const googleSub = (input.googleSub || "").trim();

    if (!email || !name || !googleSub) {
      throw new BadRequestException("email, name and googleSub are required");
    }

    let user = await this.prisma.user.findUnique({ where: { googleSub } });
    let foundByEmail = false;
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
      if (user) foundByEmail = true;
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          googleSub,
          role: "MEMBER",
          status: "PENDING_APPROVAL",
        },
      });

      return {
        ok: true,
        status: "PENDING_APPROVAL",
        user: this.toAuthUser(user),
      };
    }

    // Migrate seeded googleSub (e.g. "seed:email") to the real one from Google
    if (foundByEmail && user.googleSub !== googleSub) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleSub },
      });
    }

    if (user.status === "REJECTED") {
      return { ok: true, status: "REJECTED", user: this.toAuthUser(user) };
    }

    if (user.status === "PENDING_APPROVAL") {
      return { ok: true, status: "PENDING_APPROVAL", user: this.toAuthUser(user) };
    }

    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      iat: this.nowSeconds(),
      exp: this.nowSeconds() + this.tokenTtlSeconds,
    });

    return { ok: true, status: "APPROVED", user: this.toAuthUser(user), accessToken };
  }

  async getMe(accessToken: string): Promise<{ ok: true; user: AuthUser }> {
    const payload = this.verifyToken(accessToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "APPROVED") {
      throw new UnauthorizedException("unauthorized");
    }

    return { ok: true, user: this.toAuthUser(user) };
  }

  /**
   * Renews an access token without requiring re-authentication.
   * Accepts a valid, non-expired JWT and issues a new one with a fresh 7-day TTL.
   * Only works while the current token is still valid — the mobile app should
   * call this before the token expires (e.g., when exp < 2 days away).
   */
  async refreshAccessToken(currentToken: string): Promise<{ ok: true; accessToken: string; user: AuthUser }> {
    const payload = this.verifyToken(currentToken); // throws if expired or invalid
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "APPROVED") {
      throw new UnauthorizedException("unauthorized");
    }

    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      iat: this.nowSeconds(),
      exp: this.nowSeconds() + this.tokenTtlSeconds,
    });

    return { ok: true, accessToken, user: this.toAuthUser(user) };
  }

  async updateMe(accessToken: string, data: { name?: string }): Promise<{ ok: true; user: AuthUser }> {
    const payload = this.verifyToken(accessToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "APPROVED") {
      throw new UnauthorizedException("unauthorized");
    }

    const name = (data.name || "").trim();
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return { ok: true, user: this.toAuthUser(updated) };
  }

  async listPendingUsers(): Promise<{ ok: true; users: AuthUser[] }> {
    const users = await this.prisma.user.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
    });

    return { ok: true, users: users.map((user) => this.toAuthUser(user)) };
  }

  async listApprovedUsers(): Promise<{ ok: true; users: AuthUser[] }> {
    const users = await this.prisma.user.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return { ok: true, users: users.map((user) => this.toAuthUser(user)) };
  }

  async approveUser(userId: string, role: UserRole = "MEMBER"): Promise<{ ok: true; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("user not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        role,
        reviewedAt: new Date(),
      },
    });

    return { ok: true, user: this.toAuthUser(updated) };
  }

  async rejectUser(userId: string): Promise<{ ok: true; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("user not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
      },
    });

    return { ok: true, user: this.toAuthUser(updated) };
  }

  async getDashboardStats(): Promise<{
    ok: true;
    stats: {
      pendingUsers: number;
      totalUsers: number;
      totalEvents: number;
      upcomingEvents: number;
      totalSongs: number;
      totalChecklists: number;
    };
  }> {
    const now = new Date();
    const [pendingUsers, totalUsers, totalEvents, upcomingEvents, totalSongs, totalChecklists] = await Promise.all([
      this.prisma.user.count({ where: { status: "PENDING_APPROVAL" } }),
      this.prisma.user.count({ where: { status: "APPROVED" } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { dateTime: { gte: now } } }),
      this.prisma.song.count(),
      this.prisma.checklistRun.count(),
    ]);

    return {
      ok: true,
      stats: { pendingUsers, totalUsers, totalEvents, upcomingEvents, totalSongs, totalChecklists },
    };
  }

  async assertCanManageContent(accessToken: string): Promise<void> {
    const payload = this.verifyToken(accessToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "APPROVED") {
      throw new UnauthorizedException("unauthorized");
    }

    if (!["SUPER_ADMIN", "ADMIN", "LEADER"].includes(user.role)) {
      throw new UnauthorizedException("unauthorized");
    }
  }

  /**
   * Accepts either the ADMIN_API_KEY (server-to-server) or a valid JWT
   * from a user with role SUPER_ADMIN | ADMIN | LEADER.
   * This allows the mobile app to use its JWT without needing the API key.
   */
  async assertAdminKeyOrContentManager(authorization: string | undefined): Promise<void> {
    const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    // Fast path: server-to-server ADMIN_API_KEY
    if (this.adminApiKey && token === this.adminApiKey) return;
    // JWT path: validates signature, expiry, DB status, and role
    try {
      await this.assertCanManageContent(token);
    } catch {
      throw new UnauthorizedException("unauthorized");
    }
  }

  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  private async seedAdminUsers(): Promise<void> {
    const adminEmails = (process.env.ADMIN_APPROVED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    for (const email of adminEmails) {
      await this.prisma.user.upsert({
        where: { email },
        create: {
          name: email.split("@")[0],
          email,
          googleSub: `seed:${email}`,
          role: "ADMIN",
          status: "APPROVED",
          reviewedAt: new Date(),
        },
        update: {
          role: "ADMIN",
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      });
    }
  }

  private toAuthUser(user: DbUserRecord): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleSub: user.googleSub,
      role: user.role as UserRole,
      status: user.status as AuthUser["status"],
      createdAt: user.createdAt.toISOString(),
      reviewedAt: user.reviewedAt ? user.reviewedAt.toISOString() : null,
    };
  }

  private signToken(payload: AccessTokenPayload): string {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const input = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", this.jwtSecret).update(input).digest("base64url");
    return `${input}.${signature}`;
  }

  private verifyToken(token: string): AccessTokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("invalid token");
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const input = `${encodedHeader}.${encodedPayload}`;
    const expected = createHmac("sha256", this.jwtSecret).update(input).digest("base64url");
    if (signature !== expected) {
      throw new UnauthorizedException("invalid token signature");
    }

    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as AccessTokenPayload;
    if (!payload.exp || payload.exp < this.nowSeconds()) {
      throw new UnauthorizedException("token expired");
    }

    return payload;
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value).toString("base64url");
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }
}
