import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from '../config';
import { ChatPromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class PromptsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    baseUrl: config.ollama.host,
    temperature: config.ollama.temperature,
    think: false, // 关闭思考模式，直接返回结果
    numPredict: 256, // // 生成的结果数量，默认为1
  });

  async translate(text: string, targetLanguage: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个翻译专家，负责把用户文本翻译为指定语言。'],
      ['user', '请将以下文本翻译为 {targetLanguage}：{text}'],
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const res = await chain.invoke({ text, targetLanguage });
    console.log('response', res);
    return {
      question: text,
      targetLanguage: targetLanguage,
      answer: res,
    };
  }

  async summarize(text: string, maxLength: number) {
    const prompt = ChatPromptTemplate.fromTemplate('你是一个文本摘要专家，请将以下文本总结为不超过 {maxLength} 个字：{text}');

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const res = await chain.invoke({ text, maxLength });
    console.log('response', res);
    return {
      question: text,
      maxLength: maxLength,
      answer: res,
    };
  }

  async classify(text: string) {
    const examples = [
      { text: '我喜欢这个产品，它非常好用。', label: '正面' },
      { text: '这个产品很糟糕，我不推荐。', label: '负面' },
      { text: '这个产品还可以，但有一些缺点。', label: '中性' },
      { text: '这个产品的质量非常差，我很失望。', label: '负面' },
    ];
    const examplePrompt = PromptTemplate.fromTemplate(
      '文本：{text}\n分类：{label}',
    );
    const formattedPrompt = new FewShotPromptTemplate({
      examples, // 示例数据
      examplePrompt, // 每条示例的格式
      inputVariables: ['text'], // 本次调用需要提供的变量
      suffix: '文本：{text}\n分类：', // label 留给模型生成
      prefix: '你是一个文本分类专家，请根据以下示例将用户文本分类为正面、负面或中性：',
    });
    const chain = formattedPrompt.pipe(this.llm).pipe(new StringOutputParser());
    const res = await chain.invoke({ text });
    console.log('response', res);
    return { text, label: res };
  }
}
