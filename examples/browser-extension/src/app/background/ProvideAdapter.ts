import { browser } from '#imports'
import { Adapter, Message, SendMessage, OnMessage } from 'comctx'

export interface MessageExtra extends Message {
  url: string
}

export default class ProvideAdapter implements Adapter<MessageExtra> {
  sendMessage: SendMessage<MessageExtra> = async (message) => {
    const tabs = await browser.tabs.query({ url: message.url })
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage: OnMessage<MessageExtra> = (callback) => {
    const handler = (message: any): undefined => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
