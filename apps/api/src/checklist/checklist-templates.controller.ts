import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ChecklistTemplatesService } from "./checklist-templates.service";

type CreateTemplateBody = {
  name: string;
  items: string[];
};

type UpdateTemplateBody = Partial<CreateTemplateBody>;

@Controller("api/checklists/templates")
export class ChecklistTemplatesController {
  constructor(
    private readonly templatesService: ChecklistTemplatesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list() {
    return this.templatesService.list();
  }

  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: CreateTemplateBody) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.templatesService.create(body);
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: UpdateTemplateBody,
  ) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.templatesService.update(id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    await this.authService.assertAdminKeyOrContentManager(authorization);
    return this.templatesService.remove(id);
  }
}
