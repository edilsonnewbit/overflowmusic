import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, AccessTokenPayload, UserRole } from "./auth.types";

const scryptAsync = promisify(scrypt);

const VOLUNTEER_TERMS_VERSION = "1.0-2026";

type GoogleLoginInput = {
  email: string;
  name: string;
  googleSub: string;
  volunteerTermsAccepted?: boolean;
  instagramProfile?: string;
  birthDate?: string;
  church?: string;
  pastorName?: string;
  whatsapp?: string;
  address?: string;
};

type DbUserRecord = {
  id: string;
  name: string;
  email: string;
  googleSub: string | null;
  passwordHash: string | null;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  role: string;
  status: string;
  instruments: string[];
  instagramProfile: string | null;
  birthDate: Date | null;
  church: string | null;
  pastorName: string | null;
  whatsapp: string | null;
  address: string | null;
  volunteerTermsVersion: string | null;
  volunteerTermsAcceptedAt: Date | null;
  createdAt: Date;
  reviewedAt: Date | null;
  lastLoginAt: Date | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
  private readonly tokenTtlSeconds = 60 * 60 * 24 * 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdminUsers();
  }

  async googleLogin(
    input: GoogleLoginInput,
  ): Promise<
    | { ok: true; status: "PENDING_APPROVAL"; needsProfileCompletion: boolean; user: AuthUser }
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
      const termsData =
        input.volunteerTermsAccepted === true
          ? { volunteerTermsVersion: VOLUNTEER_TERMS_VERSION, volunteerTermsAcceptedAt: new Date() }
          : {};
      const profileData = {
        instagramProfile: (input.instagramProfile || "").trim() || null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        church: (input.church || "").trim() || null,
        pastorName: (input.pastorName || "").trim() || null,
        whatsapp: (input.whatsapp || "").trim() || null,
        address: (input.address || "").trim() || null,
      };
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          googleSub,
          role: "MEMBER",
          status: "PENDING_APPROVAL",
          ...termsData,
          ...profileData,
        },
      });

      return {
        ok: true,
        status: "PENDING_APPROVAL",
        needsProfileCompletion: !user.volunteerTermsVersion,
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

    // If user hasn't accepted terms yet but is doing so now, save terms + profile data
    if (user.volunteerTermsVersion === null && input.volunteerTermsAccepted === true) {
      const updateData: Record<string, unknown> = {
        volunteerTermsVersion: VOLUNTEER_TERMS_VERSION,
        volunteerTermsAcceptedAt: new Date(),
      };
      if ((input.instagramProfile || "").trim()) updateData.instagramProfile = input.instagramProfile!.trim();
      if (input.birthDate) updateData.birthDate = new Date(input.birthDate);
      if ((input.church || "").trim()) updateData.church = input.church!.trim();
      if ((input.pastorName || "").trim()) updateData.pastorName = input.pastorName!.trim();
      if ((input.whatsapp || "").trim()) updateData.whatsapp = input.whatsapp!.trim();
      if ((input.address || "").trim()) updateData.address = input.address!.trim();
      user = await this.prisma.user.update({ where: { id: user.id }, data: updateData });
    }

    if (user.status === "REJECTED") {
      return { ok: true, status: "REJECTED", user: this.toAuthUser(user) };
    }

    if (user.status === "PENDING_APPROVAL") {
      return {
        ok: true,
        status: "PENDING_APPROVAL",
        needsProfileCompletion: !user.volunteerTermsVersion,
        user: this.toAuthUser(user),
      };
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

  /**
   * Register a new user with email and password.
   * Sends a verification email and creates the user with emailVerified = false.
   */
  async emailRegister(input: {
    email: string;
    password: string;
    name: string;
    instagramProfile?: string;
    birthDate?: string;
    church?: string;
    pastorName?: string;
    whatsapp?: string;
    address?: string;
    volunteerTermsAccepted?: boolean;
  }): Promise<{ ok: true; user: AuthUser; message: string }> {
    const email = (input.email || "").trim().toLowerCase();
    const password = (input.password || "").trim();
    const name = (input.name || "").trim();

    if (!email || !password || !name) {
      throw new BadRequestException("email, password and name are required");
    }

    if (password.length < 8) {
      throw new BadRequestException("password must be at least 8 characters");
    }

    if (!input.volunteerTermsAccepted) {
      throw new BadRequestException("É necessário aceitar o Termo de Adesão ao Serviço Voluntário para se cadastrar.");
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException("email already registered");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    const volunteerTermsAcceptedAt = new Date();
    const VOLUNTEER_TERMS_VERSION = "1.0-2026";

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: false,
        role: "MEMBER",
        status: "PENDING_APPROVAL",
        instagramProfile: (input.instagramProfile || "").trim() || null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        church: (input.church || "").trim() || null,
        pastorName: (input.pastorName || "").trim() || null,
        whatsapp: (input.whatsapp || "").trim() || null,
        address: (input.address || "").trim() || null,
        volunteerTermsVersion: VOLUNTEER_TERMS_VERSION,
        volunteerTermsAcceptedAt,
      },
    });

    // Create verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, token);
    } catch (error) {
      console.error('[AuthService] Falha ao enviar email de verificação:', error);
      // Não bloqueia o registro se o email falhar
    }

    return {
      ok: true,
      user: this.toAuthUser(user),
      message: "Registration successful. Please check your email to verify your account.",
    };
  }

  /**
   * Verify email with token sent to user's email.
   */
  async verifyEmail(token: string): Promise<{ ok: true; message: string }> {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException("Verification token has expired");
    }

    // Update user
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Delete used token
    await this.prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { ok: true, message: "Email verified successfully" };
  }

  /**
   * Resend verification email.
   */
  async resendVerificationEmail(email: string): Promise<{ ok: true; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    // Delete old tokens
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, token);
    } catch (error) {
      console.error('[AuthService] Falha ao reenviar email de verificação:', error);
      throw new InternalServerErrorException('Failed to send verification email. Please try again later.');
    }

    return { ok: true, message: "Verification email sent" };
  }

  /**
   * Login with email and password.
   */
  async emailLogin(input: {
    email: string;
    password: string;
  }): Promise<
    | { ok: true; status: "EMAIL_NOT_VERIFIED"; user: AuthUser; message: string }
    | { ok: true; status: "PENDING_APPROVAL"; user: AuthUser }
    | { ok: true; status: "REJECTED"; user: AuthUser }
    | { ok: true; status: "APPROVED"; user: AuthUser; accessToken: string }
  > {
    const email = (input.email || "").trim().toLowerCase();
    const password = (input.password || "").trim();

    if (!email || !password) {
      throw new BadRequestException("email and password are required");
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Check email verification
    if (!user.emailVerified) {
      return {
        ok: true,
        status: "EMAIL_NOT_VERIFIED",
        user: this.toAuthUser(user),
        message: "Please verify your email before logging in",
      };
    }

    // Check approval status
    if (user.status === "REJECTED") {
      return { ok: true, status: "REJECTED", user: this.toAuthUser(user) };
    }

    if (user.status === "PENDING_APPROVAL") {
      return { ok: true, status: "PENDING_APPROVAL", user: this.toAuthUser(user) };
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate access token
    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      iat: this.nowSeconds(),
      exp: this.nowSeconds() + this.tokenTtlSeconds,
    });

    return { ok: true, status: "APPROVED", user: this.toAuthUser(user), accessToken };
  }

  /**
   * Request password reset.
   */
  async requestPasswordReset(email: string): Promise<{ ok: true; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Don't reveal if user exists
    if (!user) {
      return { ok: true, message: "If the email exists, a password reset link has been sent" };
    }

    // Delete old tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      console.error('[AuthService] Falha ao enviar email de recuperação:', error);
      // Não revela se o email existe
    }

    return { ok: true, message: "If the email exists, a password reset link has been sent" };

    return { ok: true, message: "If the email exists, a password reset link has been sent" };
  }

  /**
   * Reset password with token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ ok: true; message: string }> {
    if (newPassword.length < 8) {
      throw new BadRequestException("password must be at least 8 characters");
    }

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Reset token has expired");
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return { ok: true, message: "Password reset successfully" };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(":");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return key === derivedKey.toString("hex");
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

  async updateMe(accessToken: string, data: {
    name?: string;
    instruments?: string[];
    instagramProfile?: string | null;
    birthDate?: string | null;
    church?: string | null;
    pastorName?: string | null;
    whatsapp?: string | null;
    address?: string | null;
  }): Promise<{ ok: true; user: AuthUser }> {
    const payload = this.verifyToken(accessToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "APPROVED") {
      throw new UnauthorizedException("unauthorized");
    }

    const name = (data.name || "").trim();
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const updateData: {
      name: string;
      instruments?: string[];
      instagramProfile?: string | null;
      birthDate?: Date | null;
      church?: string | null;
      pastorName?: string | null;
      whatsapp?: string | null;
      address?: string | null;
    } = { name };

    if (Array.isArray(data.instruments)) updateData.instruments = data.instruments;
    if (data.instagramProfile !== undefined) updateData.instagramProfile = (data.instagramProfile || "").trim() || null;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    if (data.church !== undefined) updateData.church = (data.church || "").trim() || null;
    if (data.pastorName !== undefined) updateData.pastorName = (data.pastorName || "").trim() || null;
    if (data.whatsapp !== undefined) updateData.whatsapp = (data.whatsapp || "").trim() || null;
    if (data.address !== undefined) updateData.address = (data.address || "").trim() || null;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return { ok: true, user: this.toAuthUser(updated) };
  }

  async adminUpdateUser(
    userId: string,
    data: { role?: UserRole; instruments?: string[] },
  ): Promise<{ ok: true; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("user not found");
    }

    const updateData: { role?: UserRole; instruments?: string[] } = {};
    if (data.role) updateData.role = data.role;
    if (Array.isArray(data.instruments)) updateData.instruments = data.instruments;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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
      googleSub: user.googleSub || undefined,
      role: user.role as UserRole,
      status: user.status as AuthUser["status"],
      instruments: user.instruments ?? [],
      instagramProfile: user.instagramProfile ?? null,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      church: user.church ?? null,
      pastorName: user.pastorName ?? null,
      whatsapp: user.whatsapp ?? null,
      address: user.address ?? null,
      volunteerTermsVersion: user.volunteerTermsVersion ?? null,
      volunteerTermsAcceptedAt: user.volunteerTermsAcceptedAt ? user.volunteerTermsAcceptedAt.toISOString() : null,
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
