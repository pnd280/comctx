import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    window.parent.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.parent.addEventListener('message', handler)
    return () => window.parent.removeEventListener('message', handler)
  }
}
