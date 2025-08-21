import type { Adapter, SendMessage, OnMessage } from 'comctx'
import { onMessage, sendMessage } from 'webext-bridge/content-script'

export default class InjectAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    console.log('Consumer (sendMessage)', message)

    sendMessage(
      'comctx:background' as any,
      {
        ...message
      },
      'background'
    )
  }
  onMessage: OnMessage = (callback) => {
    return onMessage('comctx:background' as any, (message) => {
      console.log('Consumer (onMessage)', message.data)

      callback({
        ...(message.data as any)
      })
    })
  }
}
