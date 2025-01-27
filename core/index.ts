export interface Message {
  path: (string | number | symbol)[]
}

export interface Adapter {
  namespace: string
  onMessage: (callback: (message: Message) => void) => void
  sendMessage: (message: Message) => void
}

const contextProxy = null

const createProxy = (
  target: object = () => {},
  path: (string | number | symbol)[],
  adapter: Adapter,
  type: 'export' | 'import'
) => {
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {},
    apply(target) {},
    construct(target) {}
  })
  return proxy
}

const exportProxy =
  (context: (...args: any[]) => object, adapter: Adapter) =>
  (...args: any[]) => {
    if (contextProxy) {
      return contextProxy
    } else {
      return createProxy(context(...args), [], adapter, 'export')
    }
  }

const importProxy = (context: () => object, adapter: Adapter) => () => {
  if (contextProxy) {
    return contextProxy
  } else {
    return createProxy(target, [], adapter, 'import')
  }
}

const defineProxy = (context: () => object, adapter: Adapter) => {
  return [exportProxy(context, adapter), importProxy(context, adapter)]
}

export default defineProxy
