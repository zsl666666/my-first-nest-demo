import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { config } from '../config';
import { StringOutputParser } from '@langchain/core/output_parsers';


@Injectable()
export class ChainsService {

  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
    think: false, // 关闭思考模式，直接返回结果
    numPredict: 512, // // 生成的结果数量，默认为1
  });
  
  async polish(text: string) {
    // Implement the logic to polish the text here
    // For demonstration purposes, we'll just return the original text

    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', `
        你是一个技术专家，从概念，事实等角度严格审查用户输出的文本，找出其中的错误问题，并输出问题列表。请直接输出错误问题，只有完全没有问题时才输出“无问题”。
      `],
      ['human', '请分析用户提供的文本：{text}'],
    ]);

    const polishPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文本润色专家，请根据输出的问题列表对用户提供的文本进行润色，使其更加完美'],
      ['human', '请根据输出的问题列表{analysis}对用户提供的文本进行润色：{text}，最后输出问题列表，并用一句简介的润色过后的话'],
    ]);

    const analtsisChain = analysisPrompt.pipe(this.llm).pipe(new StringOutputParser())

    // 创建一个RunnableSequence，将分析和润色两个步骤串联起来
    const fullChain = RunnableSequence.from([
      {
        text: new RunnablePassthrough(), // 直接传递用户输入的文本
        analysis: analtsisChain,
      },
      polishPrompt.pipe(this.llm).pipe(new StringOutputParser()),
    ])


    const res = await fullChain.invoke({ text });

    console.log('response', res);
    
    return {
      question: text,
      answer: res,
    };
  }
}
