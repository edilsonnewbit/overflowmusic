import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventsService } from "./events.service";

@Injectable()
export class EventsCronService {
  private readonly logger = new Logger(EventsCronService.name);

  constructor(private readonly eventsService: EventsService) {}

  /** Expira slots vencidos e finaliza eventos passados. Roda a cada hora. */
  @Cron("0 * * * *")
  async processExpired() {
    this.logger.log("Cron: processExpiredMusicians");
    await this.eventsService.processExpiredMusicians();
  }

  /** Envia lembretes para músicos pendentes: 8h, 13h e 20h (BRT = UTC-3). */
  @Cron("0 11,16,23 * * *")
  async sendReminders() {
    this.logger.log("Cron: sendPendingReminders");
    await this.eventsService.sendPendingReminders();
  }
}
