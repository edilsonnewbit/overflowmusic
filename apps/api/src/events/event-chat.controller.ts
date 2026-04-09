import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { EventChatService } from "./event-chat.service";

@SkipThrottle({ global: true })
@Controller("api/events/:eventId/chat")
export class EventChatController {
  constructor(private readonly service: EventChatService) {}

  /** GET /api/events/:eventId/chat — listar mensagens */
  @Get()
  async list(
    @Param("eventId") eventId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.list(eventId, authorization);
  }

  /** POST /api/events/:eventId/chat — enviar mensagem */
  @Post()
  async send(
    @Param("eventId") eventId: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { text: string; isPrivate?: boolean; toUserId?: string },
  ) {
    return this.service.send(eventId, authorization, body);
  }

  /** DELETE /api/events/:eventId/chat/:messageId — excluir mensagem */
  @Delete(":messageId")
  async delete(
    @Param("messageId") messageId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.delete(messageId, authorization);
  }
}
