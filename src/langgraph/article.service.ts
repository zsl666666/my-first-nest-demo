import { Injectable, OnModuleInit } from '@nestjs/common';
// import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { Annotation, START, END, StateGraph } from '@langchain/langgraph'
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { config } from '../config';
import { title } from 'process';

const ArticleState = Annotation.Root({
  article: Annotation<string>(),
  keywords: Annotation<string[]>(),
  summary: Annotation<string>(),
  log: Annotation<string>({
    reducer: (pre, cur) => pre + '\n\n' + cur,
    default: () => ''
  }),
})

@Injectable()
export class ArticleService implements OnModuleInit {

  private graph: any;

  onModuleInit() {
    const llm = new ChatOllama({
      model: config.ollama.chatModel, // Ollama 模型名称
      temperature: config.ollama.temperature, // 生成文本的随机程度
      baseUrl: config.ollama.host, // Ollama 服务器地址
      think: false, // 是否开启思考模式，开启后模型会先返回一个思考中的消息，等生成完成后再返回最终回答
      numPredict: 512, // 生成文本的最大 token 数量，512 是一个比较合理的值，可以根据需要调整
    })

    // 节点1: 提取关键词
    const extractKeywords = async (state: typeof ArticleState.State) => {
      const t0 = Date.now()
      const messages = [
        new SystemMessage('你是一个专业的文本分析助手，负责从文章中提取关键词。'),
        new HumanMessage(`请从以下文章中提取关键词：\n\n${state.article}\n\n只需要返回关键词列表， 从文章提前4-7个关键词，逗号分隔，不要其他内容。`)
      ]

      const res = await llm.invoke(messages)

      const keywords = (res.content as string).split(/[,，]/).map(k => k.trim()).filter(Boolean)

      return { keywords, log: `\n\n提取关键词耗时 ${(Date.now() - t0) / 1000} 秒\n\n`  }
    }

    // 节点2: 概要生成
    const generateSummary = async (state: typeof ArticleState.State) => {
      const t0 = Date.now()

      const messages = [
        new SystemMessage('你是一个专业的文本总结助手，负责根据文章内容和关键词生成摘要。'),
        new HumanMessage(`请根据以下文章内容和关键词生成摘要：\n\n文章内容：${state.article}\n\n关键词：${state.keywords.join('、')}\n\n只需要返回摘要内容， 控制在200字以内，不要其他内容。`)
      ]

      const res = await llm.invoke(messages)
      const summary = res.content

      return { summary, log: `\n\n生成摘要耗时 ${(Date.now() - t0) / 1000} 秒\n\n`  }
    }

    this.graph = new StateGraph(ArticleState)
      .addNode('extractKeywords', extractKeywords)
      .addNode('generateSummary', generateSummary)
      .addEdge(START, 'extractKeywords')
      .addEdge('extractKeywords', 'generateSummary')
      .addEdge('generateSummary', END)
      .compile()
  }

  async processArticle(article: string) {
    const res = await this.graph.invoke({ article })

    return {
      title: '文章提取关键词，生成摘要',
      keywords: res.keywords,
      summary: res.summary,
      log: res.log
    }
  }

}
