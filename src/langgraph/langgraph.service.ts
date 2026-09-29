import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { MessagesAnnotation, START, END, StateGraph, MemorySaver } from '@langchain/langgraph';
import { config } from '../config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class LanggraphService implements OnModuleInit {

  private llm: ChatOpenAI | null = null;
  private simpleGraph: ReturnType<LanggraphService['createGraph']> | null = null;
  private memoryGraph: ReturnType<LanggraphService['createMemoryGraph']> | null = null;

  onModuleInit() {
    this.llm = new ChatOpenAI({
      model:         config.langGraph.model,
      apiKey:        config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature:   config.langGraph.temperature,
    })

    this.simpleGraph = this.createGraph();

    this.memoryGraph = this.createMemoryGraph();
  }

  private createGraph() {
    // const llm = new ChatOpenAI({
    //   model:         config.langGraph.model,
    //   apiKey:        config.langGraph.apiKey,
    //   configuration: { baseURL: config.langGraph.baseURL },
    //   temperature:   config.langGraph.temperature,
    // })

    // 无记忆
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await this.llm?.invoke(state.messages);
      return { messages: [response] };
    }
    return new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile();
  }

  private createMemoryGraph() {
    // 有记忆
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        new SystemMessage('你是专业的 AI 助手，回答简洁清晰，请记住之前的对话内容。'),
        ...state.messages,
      ]
      const response = await this.llm?.invoke(messages);
      return { messages: [response] };
    }
    return new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile({ checkpointer: new MemorySaver() }); // 开启 checkpoint 功能，允许在不同的对话线程中保存和恢复状态
  }

  // 无记忆简单问答
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

  // 有记忆简单问答， 通过 threadId 来区分不同的对话线程，check
  async memoryChat(message: string, threadId: string): Promise<string> {
    const result = await this.memoryGraph?.invoke(
      {messages: [new HumanMessage(message)]},
      { configurable: { thread_id: threadId } }
    );

    // console.log('huida',result);

    return (result?.messages.at(-1)?.content as string) ?? '';
  }

  // 获取对话历史
  async getHistory(threadId: string) {
    if (!this.memoryGraph) {
      throw new Error('LangGraph 尚未初始化');
    }
    const result = await this.memoryGraph.getState({ configurable: { thread_id: threadId } });

    const state = result.values as Partial<typeof MessagesAnnotation.State>;
    return (state.messages ?? []).map((item) => ({
      type: item.type === 'human' ? 'user' : 'assistant',
      content: item.content,
    }))
  }

}
