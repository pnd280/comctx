import uuid from '@/utils/uuid'

type MaybePromise<T> = T | Promise<T>

export interface Message {
  type: 'apply' | 'ping' | 'pong'
  id: string
  path: string[]
  sender: 'provide' | 'inject'
  callbackIds?: string[]
  args: any[]
  error?: string
  data?: any
}

export type OffMessage = () => MaybePromise<void>

export type OnMessage = (callback: (message: Message) => void) => MaybePromise<OffMessage | void>

export type SendMessage = (message: Message) => MaybePromise<void>

export interface Adapter {
  onMessage: OnMessage
  sendMessage: SendMessage
}

const waitProvide = async (adapter: Adapter) => {
  const offMessage = await new Promise<OffMessage | void>((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const id = uuid()
        adapter.sendMessage({
          type: 'ping',
          id,
          path: [],
          sender: 'inject',
          args: []
        })
        const offMessage = await adapter.onMessage((message) => {
          if (message.sender !== 'provide') return
          if (message.type !== 'pong') return
          if (message.id !== id) return
          clearInterval(timer)
          offMessage?.()
          resolve(offMessage)
        })
      } catch (error) {
        clearInterval(timer)
        reject(error)
      }
    })
  })
  offMessage?.()
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter) => {
  adapter.onMessage(async (message) => {
    if (message.sender !== 'inject') return

    switch (message.type) {
      case 'ping': {
        adapter.sendMessage({
          ...message,
          type: 'pong',
          sender: 'provide'
        })
        break
      }
      case 'apply': {
        const mapArgs = message.args.map((arg) => {
          if (message.callbackIds?.includes(arg)) {
            return (...args: any[]) => {
              adapter.sendMessage({
                ...message,
                id: arg,
                data: args,
                type: 'apply',
                sender: 'provide'
              })
            }
          } else {
            return arg
          }
        })
        try {
          message.data = await (message.path.reduce((acc, key) => acc[key], target) as unknown as Function).apply(
            target,
            mapArgs
          )
        } catch (error) {
          message.error = (error as Error).message
        }
        adapter.sendMessage({
          ...message,
          type: 'apply',
          sender: 'provide'
        })
        break
      }
    }
  })
  return target
}

const createInject = <T extends Record<string, any>>(source: T | null, adapter: Adapter) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(target, key: string) {
        return createProxy(source ? target[key] : ((() => {}) as unknown as T), [...path, key] as string[])
      },
      apply(_target, _thisArg, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            await waitProvide(adapter)

            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((_message) => {
                  if (_message.sender !== 'provide') return
                  if (_message.type !== 'apply') return
                  if (_message.id !== callbackId) return
                  arg(..._message.data)
                })
                return callbackId
              } else {
                return arg
              }
            })
            const message: Message = {
              type: 'apply',
              id: uuid(),
              path,
              sender: 'inject',
              callbackIds,
              args: mapArgs
            }

            const offMessage = await adapter.onMessage((_message) => {
              if (_message.sender !== 'provide') return
              if (_message.type !== 'apply') return
              if (_message.id !== message.id) return
              offMessage?.()
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data)
            })
            adapter.sendMessage(message)
          } catch (error) {
            reject(error)
          }
        })
      }
    })
    return proxy
  }
  return createProxy(source ?? ((() => {}) as unknown as T), [])
}

const provideProxy = <T extends Record<string, any>>(context: () => T) => {
  let target: T
  return (adapter: Adapter) => (target ??= createProvide(context(), adapter))
}

const injectProxy = <T extends Record<string, any>>(context: (() => T) | null) => {
  let target: T
  return (adapter: Adapter) => (target ??= createInject(context?.() ?? null, adapter))
}

const defineProxy = <T extends Record<string, any>>(context: () => T, backup: boolean = false) => {
  return [provideProxy(context), injectProxy(backup ? context : null)] as const
}

export default defineProxy
