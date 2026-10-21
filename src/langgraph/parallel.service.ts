/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleInit } from '@nestjs/common';
import {ChatOllama} from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation, MessagesAnnotation, MemorySaver, START, END , Send, Command} from '@langchain/langgraph'
import { config } from '../config'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import {ToolNode} from '@langchain/langgraph/prebuilt'
import { tool} from '@langchain/core/tools'
import {z} from 'zod'

// 主图 state： 收集所有字任务结果
const ParallelState = Annotation.Root({
  task: Annotation<string>(),
  results: Annotation<{ task: string, result: string }[]>({
    reducer: (pre, cur) => [...pre, ...cur],
    default: () => []
  }),
  finalReport: Annotation<string>(),
})

const SubState = Annotation.Root({
  task: Annotation<string>(),
})

@Injectable()
export class ParallelService implements OnModuleInit {
  private graph: ReturnType<ParallelService['createGraph']> | null = null;
  private llm: ChatOllama | null = null;
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

    // 拆分任务节点：将主任务拆分为多个子任务
    const splitTask = async (state: typeof ParallelState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`把以下任务拆成 3 个独立子任务，每个子任务单独一行，不要编号：\n\n${state.task}`)
      ])
      console.log('拆分任务结果:', res.content)
      const subTasks = (res.content as string).split('\n').map(t => t.trim()).filter(Boolean).slice(0, 3)

      subTasks.forEach((task, index) => {
        console.log(`子任务 ${index + 1}:`, task)
      })

      // 返回一个 Command 节点，指向每个子任务的处理节点
      return new Command({
        goto: subTasks.map((task, index) => new Send('processSubTask', { task }))
      })

    }

    // 处理子任务节点：每个子任务独立处理
    const processSubTask = async (state: typeof SubState.State) => {
      const res = await llm.invoke([
        new HumanMessage(`请完成以下任务, 100字以内：\n\n${state.task}`)
      ])
      console.log('子任务处理结果:', res.content)
      return { results: [{ task: state.task, result: res.content as string }] }
    }

    const mergeResults = async(state: typeof ParallelState.State) => {
      console.log('汇总子任务结果:', state.results.length)
      const text = state.results.map((r, i) => `子任务 ${i + 1}: ${r.task}\n结果: ${r.result}`).join('\n\n')
      
      const res = await llm.invoke([
        new HumanMessage(`根据以下子任务结果，生成 200 字综合报告：\n\n${text}`),
      ])
      console.log('最终报告:', res.content)
      return { finalReport: res.content as string }
    }

    return new StateGraph(ParallelState)
        .addNode('splitTask', splitTask, { ends: ['processSubTask'] })
        .addNode('processSubTask', processSubTask, { ends: ['mergeResults'] })
        .addNode('mergeResults', mergeResults)
        .addEdge(START, 'splitTask')
        .addEdge('processSubTask', 'mergeResults')
        .addEdge('mergeResults', END)
        .compile()
  }

  async parallelChat(task: string) {
    if (!this.graph) {
      throw new Error('ParallelService 尚未初始化');
    }

    const t0 = Date.now();

    const result = await this.graph.invoke({ task })
    console.log('总耗时：', (Date.now() - t0) / 1000, '秒')

    return {
      subTasks: result.results.map(r => r.task),
      results: result.results,
      finalReport: result.finalReport,
      totalTime: (Date.now() - t0) / 1000 + ' 秒',
    }
  }
}