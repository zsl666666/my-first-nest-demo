/* eslint-disable @typescript-eslint/no-unsafe-call */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { MessagesAnnotation, START, END, StateGraph, MemorySaver } from '@langchain/langgraph';
import { config } from '../config';
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { HumanMessage, AIMessage } from '@langchain/core/messages';


// 定义一个计算器工具
const calculatorTool = tool(
  ({ expression }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-implied-eval
      const result = Function(`'use strict'; return (${expression})`)();
      return `计算结果： ${expression} = ${result}`;
    } catch (e: unknown) {
      return `计算错误：${(e as Error).message}`;
    }
  },
  {
    name: 'calculator',
    description: '计算数学表达式，例如：(2 + 3) * 4',
    schema: z.object({
      expression: z.string().describe('合法的 JS 数学表达式，例如：(2 + 3) * 4'),
    }),
  }
)

const weatherTool = tool(
  ({ city }) => {
    const mock: Record<'北京' | '上海' | '武汉' | '广州', string> = {
      '北京': '晴，25°C，东北风 3 级',
      '上海': '多云，28°C，东风 2 级',
      '武汉': '晴，30°C，南风 1 级',
      '广州': '雷阵雨，32°C，南风 2 级',
    }
    return mock[city] ? `查询城市：${city} 的天气是：${mock[city]}` : `查询城市：${city} 的天气信息未找到，请输入 北京、上海、武汉、广州 中的一个`;
  },
  {
    name: 'get_weather',
    description: '查询指定城市的当前天气',
    schema: z.object({
      city: z.string().describe('城市名称，例如：北京'),
    }),
  }
)

const tools = [calculatorTool, weatherTool]

@Injectable()
export class ReactAgentService implements OnModuleInit {
  private graph: ReturnType<ReactAgentService['createGraph']> | null = null;

  onModuleInit() {
    this.graph = this.createGraph();
  }

  private createGraph() {
    const llm = new ChatOpenAI({
      model:         config.langGraph.model,
      apiKey:        config.langGraph.apiKey,
      configuration: { baseURL: config.langGraph.baseURL },
      temperature:   config.langGraph.temperature,
    })

    // bindTools：把工具的 name/description/schema 注入 LLM
      // LLM 推理时知道有哪些工具可以调，需要时自动生成 tool_calls
    const llmWithTools = llm.bindTools(tools)

    // ToolNode：封装"执行 LLM 返回的 tool_calls"的完整逻辑
    const toolNode = new ToolNode(tools)

    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [
        `你是专业助手，可用工具：
        - calculator：计算数学表达式，例如：(2 + 3) * 4
        - get_weather：查询天气，例如：北京、上海、武汉、广州
        你可根据问题决定是否调用工具`,
        ...state.messages,
      ]
      const res = await llmWithTools.invoke(messages)
      return { messages: [res] }
    }

    // // 路由函数：检查最后一条消息是否包含 tool_calls
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const last = state.messages.at(-1) as AIMessage
      return (last.tool_calls?.length ?? 0) > 0 ? 'tools' : 'end'
    }

    return new StateGraph(MessagesAnnotation)
      .addNode('callModel', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'callModel')
      .addConditionalEdges('callModel', shouldContinue, {
        tools: 'tools',
        end: END
      })
      .addEdge('tools', 'callModel') // tools 节点执行完后，返回 大模型callModel 节点
      .compile({ checkpointer: new MemorySaver() }); // 开启 checkpoint 功能，允许在不同的对话线程中保存和恢复状态
  }

  async chat({ threadId, message }: { threadId: string, message: string}): Promise<string> {
    if (!this.graph) {
      throw new Error('React Agent 尚未初始化');
    }

    const result = await this.graph.invoke(
      { messages: [new HumanMessage(message)] },
      {
        configurable: { thread_id: threadId },
        recursionLimit: 10,   // 最多循环 10 次工具调用，防止死循环
      }
    )

    const content = result.messages.at(-1)?.content;
    return typeof content === 'string' ? content : '';
  }
}
