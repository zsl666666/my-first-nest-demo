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
  }
}