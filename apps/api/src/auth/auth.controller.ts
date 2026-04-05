import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { OAuth2Client } from "google-auth-library";
import { AuthService } from "./auth.service";
import { AuditService } from "../audit/audit.service";
import { UserRole } from "./auth.types";

type GoogleLoginBody = {
  idToken?: string;
  email?: string;
  name?: string;
  googleSub?: string;
};

type ApproveBody = {
  role?: UserRole;
};

@Controller()
export class AuthController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";
  private readonly googleClientIds = this.resolveGoogleClientIds();
  private readonly googleAllowedDomain = (process.env.GOOGLE_ALLOWED_DOMAIN || "").trim().toLowerCase();
  private readonly authBootstrapMode = process.env.AUTH_BOOTSTRAP_MODE === "true";
  private readonly oauthClient = new OAuth2Client();

  onModuleInit(): void {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && !this.authBootstrapMode && this.googleClientIds.length === 0) {
      console.warn(
        "[AuthController] AVISO: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_IDS não configurado. " +
          "Login com Google estará desabilitado em produção.",
      );
    }
    if (isProd && this.authBootstrapMode) {
      console.warn("[AuthController] AVISO: AUTH_BOOTSTRAP_MODE=true em produção. Desative em produção.");
    }
  }

  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post("api/auth/google")
  async googleLogin(@Body() body: GoogleLoginBody) {
    if (body.idToken) {
      return this.googleLoginWithIdToken(body.idToken);
    }

    if (this.authBootstrapMode && body.email && body.name && body.googleSub) {
      return this.authService.googleLogin({
        email: body.email,
        name: body.name,
        googleSub: body.googleSub,
      });
    }

    throw new BadRequestException(
      "idToken is required. For local bootstrap mode set AUTH_BOOTSTRAP_MODE=true.",
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post("api/auth/register")
  async emailRegister(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.emailRegister({
      email: body.email,
      password: body.password,
      name: body.name,
    });
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post("api/auth/login")
  async emailLogin(@Body() body: { email: string; password: string }) {
    return this.authService.emailLogin({
      email: body.email,
      password: body.password,
    });
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post("api/auth/verify-email")
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Post("api/auth/resend-verification")
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Post("api/auth/request-password-reset")
  async requestPasswordReset(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post("api/auth/reset-password")
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @SkipThrottle()
  @Get("api/auth/me")
  async me(@Headers("authorization") authorization?: string) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }

    return this.authService.getMe(token);
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post("api/auth/refresh")
  async refreshToken(@Headers("authorization") authorization?: string) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }

    return this.authService.refreshAccessToken(token);
  }

  @SkipThrottle()
  @Patch("api/auth/me")
  async updateMe(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { name?: string },
  ) {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }

    return this.authService.updateMe(token, { name: body.name });
  }

  @Get("api/admin/users")
  async approvedUsers(@Headers("authorization") authorization?: string) {
    this.assertAdminKey(authorization);
    return this.authService.listApprovedUsers();
  }

  @Get("api/admin/users/pending")
  async pendingUsers(@Headers("authorization") authorization?: string) {
    this.assertAdminKey(authorization);
    return this.authService.listPendingUsers();
  }

  @Get("api/admin/dashboard")
  async dashboard(@Headers("authorization") authorization?: string) {
    this.assertAdminKey(authorization);
    return this.authService.getDashboardStats();
  }

  @Post("api/admin/users/:userId/approve")
  async approveUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("userId") userId: string,
    @Body() body: ApproveBody,
  ) {
    this.assertAdminKey(authorization);
    const result = await this.authService.approveUser(userId, body.role || "MEMBER");
    void this.auditService.log({ action: "user.approved", resourceType: "User", resourceId: userId, metadata: { role: body.role || "MEMBER" } });
    return result;
  }

  @Post("api/admin/users/:userId/reject")
  async rejectUser(
    @Headers("authorization") authorization: string | undefined,
    @Param("userId") userId: string,
  ) {
    this.assertAdminKey(authorization);
    const result = await this.authService.rejectUser(userId);
    void this.auditService.log({ action: "user.rejected", resourceType: "User", resourceId: userId });
    return result;
  }

  private assertAdminKey(authorization?: string): void {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!this.adminApiKey || token !== this.adminApiKey) {
      throw new UnauthorizedException("unauthorized");
    }
  }

  private async googleLoginWithIdToken(idToken: string) {
    if (this.googleClientIds.length === 0) {
      throw new UnauthorizedException("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS is not configured");
    }

    let payload:
      | {
          email?: string;
          name?: string;
          sub?: string;
          email_verified?: boolean;
        }
      | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.googleClientIds,
      });
      payload = ticket.getPayload() || undefined;
    } catch {
      throw new UnauthorizedException("invalid google idToken");
    }

    const email = (payload?.email || "").toLowerCase();
    const name = payload?.name || email.split("@")[0] || "user";
    const googleSub = payload?.sub || "";
    const emailVerified = payload?.email_verified === true;

    if (!email || !googleSub || !emailVerified) {
      throw new UnauthorizedException("invalid google token payload");
    }

    if (this.googleAllowedDomain) {
      const domain = email.split("@")[1] || "";
      if (domain !== this.googleAllowedDomain) {
        throw new UnauthorizedException("google account domain is not allowed");
      }
    }

    return this.authService.googleLogin({ email, name, googleSub });
  }

  private resolveGoogleClientIds(): string[] {
    const singleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const multipleClientIds = (process.env.GOOGLE_CLIENT_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return Array.from(new Set([...multipleClientIds, ...(singleClientId ? [singleClientId] : [])]));
  }
}
