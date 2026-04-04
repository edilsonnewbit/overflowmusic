import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuditService } from "./audit/audit.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ChecklistRunsController } from "./checklist/checklist-runs.controller";
import { ChecklistRunsService } from "./checklist/checklist-runs.service";
import { ChecklistTemplatesController } from "./checklist/checklist-templates.controller";
import { ChecklistTemplatesService } from "./checklist/checklist-templates.service";
import { EventsController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";
import { OrganizationsController } from "./organizations/organizations.controller";
import { OrganizationsService } from "./organizations/organizations.service";
import { PrismaModule } from "./prisma/prisma.module";
import { SetlistController } from "./setlist/setlist.controller";
import { SetlistService } from "./setlist/setlist.service";
import { SongsController } from "./songs/songs.controller";
import { SongsService } from "./songs/songs.service";

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [
    AppController,
    AuthController,
    EventsController,
    NotificationsController,
    OrganizationsController,
    SetlistController,
    SongsController,
    ChecklistTemplatesController,
    ChecklistRunsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AuditService,
    AuthService,
    EventsService,
    NotificationsService,
    OrganizationsService,
    SetlistService,
    SongsService,
    ChecklistTemplatesService,
    ChecklistRunsService,
  ],
})
export class AppModule {}
