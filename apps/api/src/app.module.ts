import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuditService } from "./audit/audit.service";
import { AuditionsController } from "./auditions/auditions.controller";
import { AuditionsService } from "./auditions/auditions.service";
import { DecisionsController } from "./decisions/decisions.controller";
import { DecisionsService } from "./decisions/decisions.service";
import { DriveService } from "./drive/drive.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ChecklistRunsController } from "./checklist/checklist-runs.controller";
import { ChecklistRunsService } from "./checklist/checklist-runs.service";
import { ChecklistTemplatesController } from "./checklist/checklist-templates.controller";
import { ChecklistTemplatesService } from "./checklist/checklist-templates.service";
import { EmailService } from "./email/email.service";
import { EventsCronService } from "./events/events.cron";
import { EventsController } from "./events/events.controller";
import { EventsService } from "./events/events.service";
import { EventChatController } from "./events/event-chat.controller";
import { EventChatService } from "./events/event-chat.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";
import { QueueService } from "./notifications/queue.service";
import { OrganizationsController } from "./organizations/organizations.controller";
import { OrganizationsService } from "./organizations/organizations.service";
import { PrismaModule } from "./prisma/prisma.module";
import { RehearsalsController } from "./rehearsals/rehearsals.controller";
import { RehearsalsService } from "./rehearsals/rehearsals.service";
import { SetlistController } from "./setlist/setlist.controller";
import { SetlistService } from "./setlist/setlist.service";
import { SongsController } from "./songs/songs.controller";
import { SongsService } from "./songs/songs.service";

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: "global", ttl: 60000, limit: 500 }, // 500 req/min global
    ]),
  ],
  controllers: [
    AppController,
    AuditionsController,
    AuthController,
    DecisionsController,
    EventsController,
    EventChatController,
    NotificationsController,
    OrganizationsController,
    SetlistController,
    SongsController,
    RehearsalsController,
    ChecklistTemplatesController,
    ChecklistRunsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AuditService,
    AuditionsService,
    DecisionsService,
    DriveService,
    AuthService,
    EmailService,
    EventsCronService,
    EventsService,
    EventChatService,
    NotificationsService,
    QueueService,
    OrganizationsService,
    SetlistService,
    SongsService,
    RehearsalsService,
    ChecklistTemplatesService,
    ChecklistRunsService,
  ],
})
export class AppModule {}
