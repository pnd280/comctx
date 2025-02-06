import { browser } from 'wxt/browser'
import { Adapter, Message } from 'comctx'

export default class ProvideAdapter implements Adapter {
  async sendMessage(message: Message) {
    const tabs = await browser.tabs.query({})
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage(callback: (message: any) => void) {
    const handler = (message: any, _sender: any, sendResponse: any): true => {
      callback(message)
      sendResponse()
      return true
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
