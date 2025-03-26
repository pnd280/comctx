import { Adapter, SendMessage, OnMessage } from 'comctx'

declare const self: ServiceWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage(message))
    })
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: ExtendableMessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
