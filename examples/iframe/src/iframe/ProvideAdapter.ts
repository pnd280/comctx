import { Adapter, Message } from 'comctx'

export default class ProvideAdapter implements Adapter {
  sendMessage(message: Message) {
    window.parent.postMessage(message, '*')
  }
  onMessage(callback: (message?: Message) => void) {
    const handler = (event: MessageEvent) => callback(event.data)
    window.parent.addEventListener('message', handler)
    return () => window.parent.removeEventListener('message', handler)
  }
}
