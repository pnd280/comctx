import { Workbox, WorkboxMessageEvent } from 'workbox-window'
import { Adapter, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  workbox: Workbox
  constructor(path: string) {
    this.workbox = new Workbox(path, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })
    this.workbox.register()
  }
  sendMessage(message: Message) {
    console.log('send', message)

    this.workbox.messageSW(message)
  }
  onMessage(callback: (message: Message) => void) {
    const handler = (event: WorkboxMessageEvent) => {
      console.log('on', event.data)
      callback(event.data)
    }
    this.workbox.addEventListener('message', handler)
    return () => this.workbox.removeEventListener('message', handler)
  }
}
