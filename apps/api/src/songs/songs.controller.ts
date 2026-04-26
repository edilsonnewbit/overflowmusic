import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "../auth/auth.service";
import { SongsService } from "./songs.service";
import { validateTxtUpload } from "./txt-upload-validator";

type CreateSongBody = {
  title: string;
  artist?: string;
  defaultKey?: string;
  zone?: string;
  tags?: string[];
  youtubeUrl?: string;
  spotifyUrl?: string;
  driveUrl?: string;
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

type ImportCifraClubBody = {
  title: string;
  artist?: string;
  songId?: string;
};

type PreviewCifraClubBody = {
  title: string;
  artist?: string;
};

@SkipThrottle({ global: true })
@Controller("api/songs")
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("search") search?: string,
    @Query("key") key?: string,
    @Query("tags") tags?: string,
  ) {
    return this.songsService.list({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      search,
      key,
      tags,
    });
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.songsService.getById(id);
  }

  @Get(":id/charts")
  async listCharts(@Param("id") id: string) {
    return this.songsService.listCharts(id);
  }

  @Patch(":id/charts/:chartId")
  async updateChart(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("chartId") chartId: string,
    @Body() body: { rawText: string },
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.updateChart(id, chartId, body.rawText);
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
    await this.authService.assertAdminKeyOrSuperAdmin(authorization);
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

  @Post("import/cifra-club")
  async importCifraClub(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ImportCifraClubBody,
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.importFromCifraClub(body);
  }

  @Post("import/cifra-club/preview")
  async previewCifraClub(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: PreviewCifraClubBody,
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.previewCifraClub(body);
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

  // ── Tracks ────────────────────────────────────────────────────────────────

  @SkipThrottle({ global: true })
  @Get(":id/tracks")
  async listTracks(@Param("id") id: string) {
    return this.songsService.listTracks(id);
  }

  @Post(":id/tracks")
  async createTrack(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { label: string; trackType: string; driveFileId: string; driveUrl: string; order?: number },
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.createTrack(id, body);
  }

  @Post(":id/tracks/bulk")
  async bulkCreateTracks(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { files: Array<{ fileId: string; name: string; mimeType?: string }> },
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.bulkCreateTracks(id, body.files);
  }

  @Post(":id/tracks/import-folder")
  async importTracksFromFolder(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { folderUrl: string },
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.importTracksFromFolder(id, body.folderUrl);
  }

  @Delete(":id/tracks/:trackId")
  async deleteTrack(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("trackId") trackId: string,
  ) {
    await this.assertWriteAccess(authorization);
    return this.songsService.deleteTrack(id, trackId);
  }

  private async assertWriteAccess(authorization?: string): Promise<void> {
    await this.authService.assertAdminKeyOrContentManager(authorization);
  }
}
