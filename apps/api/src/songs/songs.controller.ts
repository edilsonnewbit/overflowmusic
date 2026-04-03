import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "../auth/auth.service";
import { SongsService } from "./songs.service";
import { validateTxtUpload } from "./txt-upload-validator";

type CreateSongBody = {
  title: string;
  artist?: string;
  defaultKey?: string;
  tags?: string[];
};

type UpdateSongBody = Partial<CreateSongBody>;

type ImportTxtBody = {
  content: string;
  songId?: string;
};

type ImportTxtFileBody = {
  songId?: string;
};

type PreviewTxtBody = {
  content: string;
};

@Controller("api/songs")
export class SongsController {
  private readonly adminApiKey = process.env.ADMIN_API_KEY || "";

  constructor(
    private readonly songsService: SongsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list() {
    return this.songsService.list();
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.songsService.getById(id);
  }

  @Get(":id/charts")
  async listCharts(@Param("id") id: string) {
    return this.songsService.listCharts(id);
  }

  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: CreateSongBody) {
    await this.assertWriteAccess(authorization);
    return this.songsService.create(body);
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: UpdateSongBody,
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    await this.assertWriteAccess(authorization);
    return this.songsService.remove(id);
  }

  @Post("import/txt")
  async importTxt(@Headers("authorization") authorization: string | undefined, @Body() body: ImportTxtBody) {
    await this.assertWriteAccess(authorization);
    return this.songsService.importTxt(body);
  }

  @Post("import/txt/preview")
  async previewTxt(@Headers("authorization") authorization: string | undefined, @Body() body: PreviewTxtBody) {
    await this.assertWriteAccess(authorization);
    return this.songsService.previewTxt(body.content);
  }

  @Post("import/txt/file")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 1_000_000 },
    }),
  )
  async importTxtFile(
    @Headers("authorization") authorization: string | undefined,
    @UploadedFile() file: any,
    @Body() body: ImportTxtFileBody,
  ) {
    await this.assertWriteAccess(authorization);
    validateTxtUpload(file);

    const content = file.buffer.toString("utf-8");
    return this.songsService.importTxt({ content, songId: body.songId });
  }

  @Post("import/txt/file/preview")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 1_000_000 },
    }),
  )
  async previewTxtFile(
    @Headers("authorization") authorization: string | undefined,
    @UploadedFile() file: any,
  ) {
    await this.assertWriteAccess(authorization);
    validateTxtUpload(file);

    const content = file.buffer.toString("utf-8");
    return this.songsService.previewTxt(content);
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
