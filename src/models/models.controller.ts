import { Controller, Post, Body, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import type { Response } from 'express';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post('chat')
  baseChat(@Body() { message }: { message: string }) {
    return this.modelsService.baseChat(message);
  }

  @Post('chat-system')
  chatSystem(@Body() { message, system }: { message: string, system: string }) {
    return this.modelsService.chatSystem(system, message);
  }

  @Post('chat-stream')
  async chatStream(@Body() { message, system }: { message: string, system: string }, @Res() res: Response) {
    return this.modelsService.chatStream({ system, message }, res);
  }
}
