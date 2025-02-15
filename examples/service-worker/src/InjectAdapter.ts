import { Workbox, WorkboxMessageEvent } from 'workbox-window'
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
  workbox: Workbox
  constructor(path: string) {
    this.workbox = new Workbox(path, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })
    this.workbox.register()
  }
  sendMessage: SendMessage = (message) => {
    this.workbox.messageSW(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: WorkboxMessageEvent) => callback(event.data)
    this.workbox.addEventListener('message', handler)
    return () => this.workbox.removeEventListener('message', handler)
  }
}
