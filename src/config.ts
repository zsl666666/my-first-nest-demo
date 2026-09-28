export const config = {
  ollama: {
    // ollama API 地址，默认是 http://localhost:11434
    host: 'http://localhost:11434',
    // 这里的 chatModel 是 Ollama 上已经安装好的模型名称，embedModel 是用于向量化的模型名称
    // ollama 模型名称，默认是 qwen3.5:0.8b
    chatModel: 'qwen3.5:0.8b',
    // ollama 嵌入模型名称，默认是 mxbai-embed-large:latest    
    embedModal: "mxbai-embed-large:latest",
    // 这里的 temperature 是生成文本的随机程度，值越大生成的文本越随机，值越小生成的文本越确定
    temperature: 0.3,
  },
  langGraph: {
    model:       process.env.LANGGRAPH_MODEL  || 'qwen3.5:0.8b',
    baseURL:     process.env.OLLAMA_BASE_URL  || 'http://localhost:11434/v1',
    apiKey:      'ollama',    // Ollama 不校验 apiKey，随便填个占位符即可
    temperature: 0.7,
  },
}