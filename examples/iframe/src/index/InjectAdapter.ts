import { Adapter, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  sendMessage(message?: Message) {
    window.postMessage(message, '*')
  }
  onMessage(callback: (message?: Message) => void) {
    const handler = (event: MessageEvent) => callback(event.data)
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}
