import { browser } from 'wxt/browser'
import { Adapter, Message } from 'comctx'

export interface MessageExtra extends Message {
  url: string
}

export default class ProvideAdapter implements Adapter<MessageExtra> {
  async sendMessage(message: MessageExtra) {
    const tabs = await browser.tabs.query({ url: message.url })
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage(callback: (message: MessageExtra) => void) {
    const handler = (message: any): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
