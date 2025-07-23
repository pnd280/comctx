import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

declare const self: DedicatedWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message, transfer) => {
    // Core will automatically extract transferables and pass as second parameter
    self.postMessage(message, transfer)
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent<Message>) => {
      callback(event.data)
    }
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
