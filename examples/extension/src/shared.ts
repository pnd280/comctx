import comctx, { Adapter, Message } from 'comctx'

// 在 shared.ts 中添加

class PostMessageAdapter implements Adapter {
  namespace = 'test-adapter'

  sendMessage(message: Message) {
    // 添加命名空间标识后发送
    window.postMessage({ __ns: this.namespace, ...message }, '*')
  }
  onMessage(callback: (message: Message) => void) {
    const listener = (event: MessageEvent) => {
      // 过滤指定命名空间的消息
      if (event.data?.namespace === this.namespace) {
        callback(event.data)
      }
    }
    window.addEventListener('message', listener)
  }
}

// 定义数学服务
class MathService {
  add(a: number, b: number): number {
    return a + b
  }

  async calculate(callback: (result: number) => void): Promise<void> {
    setTimeout(() => callback(Math.random()), 1000)
  }
}

export const [exportMath, importMath] = comctx(() => new MathService(), new PostMessageAdapter())
