import uuid from '@/utils/uuid'
import setIntervalImmediate from '@/utils/setIntervalImmediate'

type MaybePromise<T> = T | Promise<T>

export interface Options {
  backup?: boolean
  waitProvide?: boolean
  waitInterval?: number
  namespace?: string
}

export interface Message {
  type: 'apply' | 'callback' | 'ping' | 'pong'
  id: string
  path: string[]
  sender: 'provide' | 'inject'
  callbackIds?: string[]
  args: any[]
  error?: string
  data?: any
  namespace: string
  timeStamp: number
}

export type OffMessage = () => MaybePromise<void>

export type OnMessage<M extends Message = Message> = (callback: (message: M) => void) => MaybePromise<OffMessage>

export type SendMessage<M extends Message = Message> = (message: M) => MaybePromise<void>

export interface Adapter<M extends Message = Message> {
  onMessage: OnMessage<M>
  sendMessage: SendMessage<M>
}

const waitProvide = async (adapter: Adapter, options: Required<Options>) => {
  await new Promise<void>((resolve, reject) => {
    const clearIntervalImmediate = setIntervalImmediate(async () => {
      try {
        const id = uuid()
        adapter.sendMessage({
          type: 'ping',
          id,
          path: [],
          sender: 'inject',
          args: [],
          namespace: options.namespace,
          timeStamp: Date.now()
        })
        const offMessage = await adapter.onMessage((message) => {
          if (message.namespace !== options.namespace) return
          if (message.sender !== 'provide') return
          if (message.type !== 'pong') return
          if (message.id !== id) return
          clearIntervalImmediate()
          resolve()
          offMessage()
        })
      } catch (error) {
        clearIntervalImmediate()
        reject(error)
      }
    }, options.waitInterval)
  })
}

const createProvide = <T extends Record<string, any>>(target: T, adapter: Adapter, options: Required<Options>) => {
  adapter.onMessage(async (message) => {
    if (message.namespace !== options.namespace) return
    if (message.sender !== 'inject') return

    switch (message.type) {
      case 'ping': {
        adapter.sendMessage({
          ...message,
          type: 'pong',
          sender: 'provide',
          namespace: options.namespace,
          timeStamp: Date.now()
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
                type: 'callback',
                sender: 'provide',
                namespace: options.namespace,
                timeStamp: Date.now()
              })
            }
          } else {
            return arg
          }
        })
        try {
          message.data = await (
            message.path.reduce((acc, key) => acc[key], target) as unknown as (...args: any[]) => any
          ).apply(target, mapArgs)
        } catch (error) {
          message.error = (error as Error).message
        }
        adapter.sendMessage({
          ...message,
          type: 'apply',
          sender: 'provide',
          namespace: options.namespace,
          timeStamp: Date.now()
        })
        break
      }
    }
  })
  return target
}

const createInject = <T extends Record<string, any>>(source: T, adapter: Adapter, options: Required<Options>) => {
  const createProxy = (target: T, path: string[]) => {
    const proxy = new Proxy<T>(target, {
      get(target, key: string) {
        return createProxy(options.backup ? target[key] : ((() => {}) as unknown as T), [...path, key] as string[])
      },
      apply(_target, _thisArg, args) {
        return new Promise<Message>(async (resolve, reject) => {
          try {
            options.waitProvide && (await waitProvide(adapter, options))

            const callbackIds: string[] = []
            const mapArgs = args.map((arg) => {
              if (typeof arg === 'function') {
                const callbackId = uuid()
                callbackIds.push(callbackId)
                adapter.onMessage((_message) => {
                  if (_message.namespace !== options.namespace) return
                  if (_message.sender !== 'provide') return
                  if (_message.type !== 'callback') return
                  if (_message.id !== callbackId) return
                  arg(..._message.data)
                })
                return callbackId
              } else {
                return arg
              }
            })

            const id = uuid()

            const offMessage = await adapter.onMessage((_message) => {
              if (_message.namespace !== options.namespace) return
              if (_message.sender !== 'provide') return
              if (_message.type !== 'apply') return
              if (_message.id !== id) return
              _message.error ? reject(new Error(_message.error)) : resolve(_message.data)
              offMessage()
            })

            adapter.sendMessage({
              type: 'apply',
              id,
              path,
              sender: 'inject',
              callbackIds,
              args: mapArgs,
              timeStamp: Date.now(),
              namespace: options.namespace
            })
          } catch (error) {
            reject(error)
          }
        })
      }
    })
    return proxy
  }
  return createProxy(source, [])
}

const provideProxy = <T extends Record<string, any>>(context: () => T, options: Required<Options>) => {
  let target: T
  return <M extends Message = Message>(adapter: Adapter<M>) =>
    (target ??= createProvide(context(), adapter as unknown as Adapter, options))
}

const injectProxy = <T extends Record<string, any>>(context: () => T, options: Required<Options>) => {
  let target: T
  return <M extends Message = Message>(adapter: Adapter<M>) =>
    (target ??= createInject(
      options.backup ? context() : ((() => {}) as unknown as T),
      adapter as unknown as Adapter,
      options
    ))
}

/**
 * Creates a pair of proxies for the provider (provide) and injector (inject) to facilitate method calls and callbacks across communication layers.
 *
 * @param context - A factory function for the context that returns the target object to be proxied:
 *   - For the provider: This object directly handles remote calls.
 *   - For the injector: When the backup option is enabled, it serves as a local fallback implementation.
 * @param options - Configuration options:
 *   - backup: Whether to use a backup implementation of the original object in the injector (default is false).
 *   - waitProvide: Whether the injector should wait for the provider to be ready (default is true).
 *   - waitInterval: The polling interval (in milliseconds, default 300) when the injector is waiting for the provider.
 *   - namespace: The communication namespace used to isolate messages between different proxy instances (default is '__comctx__').
 * @returns Returns a tuple containing two elements:
 *   [0] provideProxy: Accepts an adapter and creates a provider proxy.
 *   [1] injectProxy: Accepts an adapter and creates an injector proxy.
 *
 * @example
 * const [provide, inject] = defineProxy(() => ({
 *   add: (a, b) => a + b
 * }), { namespace: 'math' })
 *
 * // Provider
 * provide(webWorkerAdapter)
 *
 * // Injector
 * const math = inject(webWorkerAdapter)
 * await math.add(2, 3) // 5
 */
export const defineProxy = <T extends Record<string, any>>(context: () => T, options?: Options) => {
  const mergedOptions = { backup: false, waitProvide: true, waitInterval: 300, namespace: '__comctx__', ...options }
  return [provideProxy(context, mergedOptions), injectProxy(context, mergedOptions)] as const
}

export default defineProxy
