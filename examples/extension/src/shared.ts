import comctx, { Adapter, Message } from 'comctx'

class PostMessageAdapter implements Adapter {
  sendMessage(message: Message) {
    globalThis.postMessage(message, '*')
  }
  onMessage(callback: (message: Message) => void) {
    globalThis.addEventListener('message', (event: MessageEvent) => callback(event.data))
  }
}

class MathProxy {
  foo = {
    bar: {
      async baz() {
        return 'baz'
      }
    }
  }
  async add(a: number, b: number) {
    return a + b
  }

  async callbackAdd(a: number, b: number, callback: (result: number) => void) {
    callback(await this.add(a, b))
  }
}

export const [exportMath, importMath] = comctx(() => new MathProxy(), new PostMessageAdapter())
