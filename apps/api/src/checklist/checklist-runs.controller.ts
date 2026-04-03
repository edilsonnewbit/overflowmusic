import { Body, Controller, Get, Headers, Param, Patch, Put, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ChecklistRunsService } from "./checklist-runs.service";

type ChecklistItemBody = {
  label: string;
  checked?: boolean;
  checkedByName?: string;
  order?: number;
};

type UpsertRunBody = {
  templateId?: string;
  items?: ChecklistItemBody[];
};

type UpdateRunItemBody = {
  label?: string;
  checked?: boolean;
  checkedByName?: string;
  order?: number;
};

@Controller("api/events/:eventId/checklist")
export class ChecklistRunsController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(
    private readonly checklistRunsService: ChecklistRunsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getByEvent(@Param("eventId") eventId: string) {
    return this.checklistRunsService.getByEvent(eventId);
  }

  @Put()
  async upsert(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Body() body: UpsertRunBody,
  ) {
    await this.assertWriteAccess(authorization);
    return this.checklistRunsService.upsertByEvent(eventId, body);
  }

  @Patch("items/:itemId")
  async updateItem(
    @Headers("authorization") authorization: string | undefined,
    @Param("eventId") eventId: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateRunItemBody,
  ) {
    await this.assertWriteAccess(authorization);
    return this.checklistRunsService.updateItem(eventId, itemId, body);
  }

  private async assertWriteAccess(authorization?: string): Promise<void> {
    const token = (authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("unauthorized");
    }

    if (this.adminApiKey && token === this.adminApiKey) {
      return;
    }

    await this.authService.assertCanManageContent(token);
  }
}
