import { BadRequestException, Body, Controller, Headers, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { NotificationsService } from "./notifications.service";

type RegisterTokenBody = {
  token: string;
  platform?: string;
};

@Controller("api/notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  async register(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: RegisterTokenBody,
  ) {
    const bearerToken = (authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!bearerToken) throw new BadRequestException("authorization required");

    const { user } = await this.authService.getMe(bearerToken);

    const pushToken = (body.token || "").trim();
    if (!pushToken) throw new BadRequestException("token is required");

    await this.notificationsService.registerToken(user.id, pushToken, body.platform);
    return { ok: true };
  }
}
