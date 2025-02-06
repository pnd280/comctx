import { browser, Runtime } from 'wxt/browser'
import { Adapter, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  sendMessage(message: Message) {
    browser.runtime.sendMessage(message)
  }
  onMessage(callback: (message: Message) => void) {
    const handler = (message: any, _sender: Runtime.MessageSender, sendResponse: any): true => {
      callback(message)
      sendResponse()
      return true
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
