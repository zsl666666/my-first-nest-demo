/* eslint-disable @typescript-eslint/no-unsafe-call */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, MessagesAnnotation, START, END, StateGraph, MemorySaver } from '@langchain/langgraph';
import { config } from '../config';
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const RoutingState = Annotation.Root({
  userInput: Annotation<string>(),
  category: Annotation<string>(),
  response: Annotation<string>(),
})
@Injectable()
export class RoutingService implements OnModuleInit {
  
  private graph: ReturnType<RoutingService['createGraph']> | null = null;
  
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

    const classify = async (state: typeof RoutingState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`把用户问题分类，只输出类别名，不要其他内容:
          - technical(技术问题)
          - pricing(价格问题)
          - other: 其他问题
          用户问题: ${state.userInput}`)
      ])

      const val = (res.content as string).trim().toLowerCase()
      const categorys = ['technical', 'pricing', 'other']

      return { category: categorys.includes(val) ? val : 'other' }
    }

    // 路由函数：直接返回 state.category，条件边以此决定走哪个节点
    const routeByCategory = (state: typeof RoutingState.State) => {
      return state.category
    }

    const makeHandler = (cate: string) => async (state: typeof RoutingState.State) => {
      const prompt = {
        technical: `你是技术专家，给出专业的技术解答。`,
        pricing: `你是商务专员，友好回答。`,
        other: `你是专业的智能客服，友好回答用户问题`
      }
      const res = await llm.invoke([
        new HumanMessage(`${prompt[cate]}，用户问题: ${state.userInput}`)
      ])

      return { response: res.content as string }
    }

    return new StateGraph(RoutingState)
      .addNode('classify', classify)
      .addNode('technical', makeHandler('technical'))
      .addNode('pricing', makeHandler('pricing'))
      .addNode('other', makeHandler('other'))
      .addEdge(START, 'classify')
      .addConditionalEdges('classify', routeByCategory, {
        technical: 'technical',
        pricing: 'pricing',
        other: 'other'
      })
      .addEdge('technical', END)
      .addEdge('pricing', END)
      .addEdge('other', END)
      .compile();
  }

  async routeChat(userInput: string) {
    if (!this.graph) {
      throw new Error('RoutingService 尚未初始化');
    }

    const res = await this.graph.invoke({ userInput })
    
    return {
      response: res.response,
      category: res.category,
      userInput
    }
  }
}
