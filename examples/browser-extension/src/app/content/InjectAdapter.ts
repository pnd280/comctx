import { browser } from 'wxt/browser'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageExtra extends Message {
  url: string
}

export default class InjectAdapter implements Adapter<MessageExtra> {
  sendMessage: SendMessage<MessageExtra> = (message) => {
    browser.runtime.sendMessage(browser.runtime.id, { ...message, url: document.location.href })
  }
  onMessage: OnMessage<MessageExtra> = (callback) => {
    const handler = (message: any): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
