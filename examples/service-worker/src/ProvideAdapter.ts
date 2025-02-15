import { Adapter, Message } from 'comctx'

declare const self: ServiceWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage(message?: Message) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage(message))
    })
  }
  onMessage(callback: (message?: Message) => void) {
    const handler = (event: ExtendableMessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
