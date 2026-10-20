import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { ArticleService } from './article.service';
import { ReactAgentService } from './react-agent.service';
import { RoutingService } from './routing.service';

@Controller('langgraph')
export class LanggraphController {
  constructor(
    private readonly langgraphService: LanggraphService,
    private readonly articleService: ArticleService,
    private readonly reactAgentService: ReactAgentService,
    private readonly routingService: RoutingService
  ) {}


  // 在这里可以添加处理请求的方法，例如 GET、POST 等
  @Post('simple-chat')
  simpleChat(@Body() body: { message: string }) {
    return this.langgraphService.simpleChat(body.message).then(answer => {
      return { answer };
    });
  }

  // 有记忆简单问答
  @Post('memory-chat')
  memoryChat(@Body() body: { message: string, threadId: string }) {
    return this.langgraphService.memoryChat(body.message, body.threadId).then(answer => {
      return { answer };
    });
  }

  // 获取对话历史
  @Get('history/:threadId')
  getHistory(@Param('threadId') threadId: string) {
    return this.langgraphService.getHistory(threadId);
  }

  // 文章摘要工作流
  @Post('article')
  processArticle(@Body() body: { article: string }) {
    return this.articleService.processArticle(body.article);
  }

  // 路由工作流
  @Post('react-agent')
  reactChat(@Body() body: { threadId: string, message: string }) {
    return this.reactAgentService.chat({ threadId: body.threadId, message: body.message }).then(answer => {
      return { answer };
    });
  }

  // 路由工作流
  @Post('route')
  routeChat(@Body() body: {userInput: string }) {
      return this.routingService.routeChat(body.userInput);
  }
}
