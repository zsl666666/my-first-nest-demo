import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostModule } from './post/post.module';
import { ModelsModule } from './models/models.module';
import { PromptsModule } from './prompts/prompts.module';
import { ChainsModule } from './chains/chains.module';
import { McpClientModule } from './mcp-client/mcp-client.module';
import { McpAgentModule } from './mcp-agent/mcp-agent.module';
import { LanggraphModule } from './langgraph/langgraph.module';


@Module({
  imports: [UserModule, PrismaModule, PostModule, ModelsModule, PromptsModule, ChainsModule, McpClientModule, McpAgentModule, LanggraphModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
