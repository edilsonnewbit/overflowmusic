import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ChecklistRunsController } from "./checklist/checklist-runs.controller";
import { ChecklistRunsService } from "./checklist/checklist-runs.service";
import { ChecklistTemplatesController } from "./checklist/checklist-templates.controller";
import { ChecklistTemplatesService } from "./checklist/checklist-templates.service";
import { EventsController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { PrismaModule } from "./prisma/prisma.module";
import { SetlistController } from "./setlist/setlist.controller";
import { SetlistService } from "./setlist/setlist.service";
import { SongsController } from "./songs/songs.controller";
import { SongsService } from "./songs/songs.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    AppController,
    AuthController,
    EventsController,
    SetlistController,
    SongsController,
    ChecklistTemplatesController,
    ChecklistRunsController,
  ],
  providers: [AuthService, EventsService, SetlistService, SongsService, ChecklistTemplatesService, ChecklistRunsService],
})
export class AppModule {}
