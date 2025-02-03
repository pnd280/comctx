import uuid from '@/utils/uuid'

export interface Message {
  type: 'apply'
  id: string
  path: string[]
  sender: 'import' | 'export'
  callbackIds?: string[]
  args: any[]
  error?: string
  data?: any
}

export interface Adapter {
  onMessage: (callback: (message: Message) => void) => void
  sendMessage: (message: Message) => void
}

const createExport = <T extends Record<string, any>>(target: T, adapter: Adapter) => {
  adapter.onMessage(async (_message) => {
    if (_message.sender !== 'import') return

    const message: Message = {
      ..._message,
      sender: 'export'
    }

    switch (_message.type) {
      case 'apply': {
        const mapArgs = _message.args.map((arg) => {
          if (_message.callbackIds?.includes(arg)) {
            return (...args: any[]) => {
              adapter.sendMessage({
                ..._message,
                id: arg,
                data: args,
                sender: 'export'
              })
            }
          } else {
            return arg
          }
        })
        try {
          message.data = await (_message.path.reduce((acc, key) => acc[key], target) as unknown as Function).apply(
            target,
            mapArgs
          )
        } catch (error) {
          message.error = (error as Error).message
        }
        break
      }
    }

    adapter.sendMessage(message)
  })
}

const createImport = <T extends Record<string, any>>(context: T, adapter: Adapter) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(_target, key: string) {
        return createProxy((() => {}) as unknown as T, [...path, key] as string[])
      },
      apply(_target, _thisArg, args) {
        return new Promise<Message>((resolve, reject) => {
          try {
            const callbackIds: string[] = []

            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((_message) => {
                  if (_message.sender !== 'export') return
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
              sender: 'import',
              callbackIds,
              args: mapArgs
            }

            adapter.onMessage((_message) => {
              if (_message.sender !== 'export') return
              if (_message.id !== message.id) return

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
  return createProxy(context, [])
}

const exportProxy =
  <T extends Record<string, any>>(context: (...args: any[]) => T, adapter: Adapter) =>
  <A>(...args: A[]) => {
    return createExport(context(...args), adapter)
  }

const importProxy =
  <T extends Record<string, any>>(_: (...args: any[]) => T, adapter: Adapter) =>
  () => {
    return createImport((() => {}) as unknown as T, adapter)
  }

const defineProxy = <T extends Record<string, any>>(context: () => T, adapter: Adapter) => {
  return [exportProxy(context, adapter), importProxy(context, adapter)] as const
}

export default defineProxy
