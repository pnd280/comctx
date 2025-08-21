import type { Adapter, Message, SendMessage, OnMessage } from 'comctx'
import type { Endpoint } from 'webext-bridge'

import { onMessage, sendMessage } from 'webext-bridge/background'

export interface MessageExtra extends Message {
  webextBridgeSender: Endpoint
}

export default class ProvideAdapter implements Adapter<MessageExtra> {
  sendMessage: SendMessage<MessageExtra> = (message) => {
    console.log('Provider (sendMessage)', message)

    sendMessage(
      'comctx:background',
      {
        ...message
      } as any,
      buildDestination({
        context: message.webextBridgeSender.context,
        tabId: message.webextBridgeSender.tabId,
        frameId: message.webextBridgeSender.frameId
      })
    )
  }

  onMessage: OnMessage<MessageExtra> = (callback) => {
    return onMessage('comctx:background', (message) => {
      console.log('Provider (onMessage)', message.data)

      callback({
        ...(message.data as any),
        webextBridgeSender: { ...message.sender }
      })
    })
  }
}

function buildDestination({ context, tabId, frameId }: { context: string; tabId?: number; frameId?: number }): string {
  if (tabId == null || isNaN(tabId)) {
    return context
  }

  if (frameId == null && tabId != null) {
    return `${context}@${tabId}`
  }

  return `${context}@${tabId}.${frameId}`
}
