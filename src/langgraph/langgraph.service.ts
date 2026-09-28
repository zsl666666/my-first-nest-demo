import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { MessagesAnnotation, START, END, StateGraph } from '@langchain/langgraph';
import { config } from '../config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class LanggraphService implements OnModuleInit {

  private simpleGraph: ReturnType<LanggraphService['createGraph']> | null = null;

  onModuleInit() {
    this.simpleGraph = this.createGraph();
  }

  private createGraph() {
    const llm = new ChatOpenAI({
      model:         config.langGraph.model,
      apiKey:        config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature:   config.langGraph.temperature,
    })

    // 无记忆
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await llm.invoke(state.messages);
      return { messages: [response] };
    }
    return new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile();
  }

  async simpleChat(message: string): Promise<string> {
    if (!this.simpleGraph) {
      throw new Error('LangGraph 尚未初始化');
    }

    const result = await this.simpleGraph.invoke({
      messages: [
        new SystemMessage('你是专业的 AI 助手，回答简洁清晰.'),
        new HumanMessage(message)
      ]
    });

    return (result.messages.at(-1)?.content as string) ?? '';
  }

}
