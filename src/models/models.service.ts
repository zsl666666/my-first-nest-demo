import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Response } from 'express';

@Injectable()
export class ModelsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
    think: false, // 关闭思考模式，直接返回结果
    numPredict: 256, // // 生成的结果数量，默认为1
  });

  async baseChat(message: string) {
    const response = await this.llm.invoke([
      new HumanMessage(message)
    ]);
    console.log('response', response);

    return {
      question: message,
      answer: response.content,
      usage: response?.usage_metadata, // 包含token情况
    };
  }


  async chatSystem(system: string, message: string) {
    const response = await this.llm.invoke([
      new SystemMessage(system),
      new HumanMessage(message)
    ]);
    console.log('response', response);

    return {
      system: system,
      question: message,
      answer: response.content,
      usage: response?.usage_metadata, // 包含token情况
    };
  }

  async chatStream({ system, message }: { system: string, message: string }, res: Response) {


    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    

    const stream = await this.llm.stream([
      new SystemMessage(system),
      new HumanMessage(message)
    ]);

    for await (const chunk of stream) {
      console.log('received', chunk);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}