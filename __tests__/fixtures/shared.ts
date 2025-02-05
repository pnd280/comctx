import comctx, { Adapter, Message } from 'comctx'

class PostMessageAdapter implements Adapter {
  namespace = 'test'

  sendMessage(message: Message) {
    globalThis.postMessage(message, '*')
  }

  onMessage(callback: (message: Message) => void) {
    globalThis.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.namespace === this.namespace) {
        callback(event.data)
      }
    })
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

export const [provideCounter, injectCounter] = comctx(() => new MathProxy(), new PostMessageAdapter())
