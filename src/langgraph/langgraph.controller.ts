import { Body, Controller, Post } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';

@Controller('langgraph')
export class LanggraphController {
  constructor(private readonly langgraphService: LanggraphService) {}
  // 在这里可以添加处理请求的方法，例如 GET、POST 等
  @Post('simple-chat')
  simpleChat(@Body() body: { message: string }) {
    return this.langgraphService.simpleChat(body.message).then(answer => {
      return { answer };
    });
  }
}
