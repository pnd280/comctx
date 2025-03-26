# Comctx

Cross-context RPC solution with type safety and flexible adapters.

[![version](https://img.shields.io/github/v/release/molvqingtai/comctx)](https://www.npmjs.com/package/comctx) [![workflow](https://github.com/molvqingtai/comctx/actions/workflows/ci.yml/badge.svg)](https://github.com/molvqingtai/comctx/actions) [![download](https://img.shields.io/npm/dt/comctx)](https://www.npmjs.com/package/comctx) [![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/comctx)](https://www.npmjs.com/package/comctx)

```shell
$ pnpm install comctx
```

## ✨Introduction

[Comctx](https://github.com/molvqingtai/comctx) shares the same goal as [Comlink](https://github.com/GoogleChromeLabs/comlink), but it is not reinventing the wheel. Since [Comlink](https://github.com/GoogleChromeLabs/comlink) relies on [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort), which is not supported in all environments, this project implements a more flexible RPC approach that can more easily and effectively adapt to different runtime environments.

## 💡Features

- **Environment Agnostic** - Works across Web Workers, Browser Extensions, iframes, Electron, and more

- **Bidirectional Communication** - Method calls & callback support
- **Type Safety** - Full TypeScript integration
- **Lightweight** - 1KB gzipped core
- **Fault Tolerance** - Backup implementations & connection heartbeat checks

## 🚀 Quick Start

**Define a Shared Service**

```typescript
import { defineProxy } from 'comctx'

class Counter {
  public value = 0
  async getValue() {
    return this.value
  }
  async onChange(callback: (value: number) => void) {
    let oldValue = this.value
    setInterval(() => {
      const newValue = this.value
      if (oldValue !== newValue) {
        callback(newValue)
        oldValue = newValue
      }
    })
  }
  async increment() {
    return ++this.value
  }
  async decrement() {
    return --this.value
  }
}

export const [provideCounter, injectCounter] = defineProxy(() => new Counter(), {
  namespace: '__comctx-example__'
})
```

**Provider (Service Provider)**

```typescript
// provide end, typically for service-workers, background, etc.
import type { Adapter, SendMessage, OnMessage } from 'comctx'
import { provideCounter } from './shared'

export default class ProvideAdapter implements Adapter {
  // Implement message sending
  sendMessage: SendMessage = (message) => {
    postMessage(message)
  }
  // Implement message listener
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    addEventListener('message', handler)
    return () => removeEventListener('message', handler)
  }
}

const originCounter = provideCounter(new ProvideAdapter())

originCounter.onChange(console.log)
```

**Injector (Service Injector)**

```typescript
// inject end, typically for the main page, content-script, etc.
import type { Adapter, SendMessage, OnMessage } from 'comctx'
import { injectCounter } from './shared'

export default class InjectAdapter implements Adapter {
  // Implement message sending
  sendMessage: SendMessage = (message) => {
    postMessage(message)
  }
  // Implement message listener
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    addEventListener('message', handler)
    return () => removeEventListener('message', handler)
  }
}

const proxyCounter = injectCounter(new InjectAdapter())

// Support for callbacks
proxyCounter.onChange(console.log)

// Transparently call remote methods
await proxyCounter.increment()
const count = await proxyCounter.getValue()
```

- `originCounter` and `proxyCounter` will share the same `Counter`. `proxyCounter` is a virtual proxy, and accessing `proxyCounter` will forward requests to the `Counter` on the provide side, whereas `originCounter` directly refers to the `Counter` itself.

- The inject side cannot directly use `get` and `set`; it must interact with `Counter` via asynchronous methods, but it supports callbacks.

- Since `inject` is a virtual proxy, to support operations like `Reflect.has(proxyCounter, 'value')`, you can set `backup` to `true`, which will create a static copy on the inject side that doesn't actually run but serves as a template.

- `provideCounter` and `injectCounter` require user-defined adapters for different environments that implement `onMessage` and `sendMessage` methods.

## 🔌 Adapter Interface

To adapt to different communication channels, implement the following interface:

```typescript
interface Adapter<M extends Message = Message> {
  /** Send a message to the other side */
  sendMessage: (message: M) => MaybePromise<void>

  /** Register a message listener */
  onMessage: (callback: (message?: Partial<M>) => void) => MaybePromise<OffMessage | void>
}
```

## 📖Examples

- [web-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/web-worker)
- [service-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/service-worker)
- [browser-extension-example](https://github.com/molvqingtai/comctx/tree/master/examples/browser-extension)
- [iframe-example](https://github.com/molvqingtai/comctx/tree/master/examples/iframe)

### Web Worker

This is an example of communication between the main page and an web-worker.

see: [web-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/web-worker)

**InjectAdpter.ts**

```typescript
import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  worker: Worker
  constructor(path: string | URL) {
    this.worker = new Worker(path, { type: 'module' })
  }
  sendMessage: SendMessage = (message) => {
    this.worker.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent<Message>) => callback(event.data)
    this.worker.addEventListener('message', handler)
    return () => this.worker.removeEventListener('message', handler)
  }
}
```

**ProvideAdpter.ts**

```typescript
import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

declare const self: DedicatedWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.postMessage(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent<Message>) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
```

**web-worker.ts**

```typescript
import { provideCounter } from '../shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('WebWorker Value:', value)
})
```

**main.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter(new URL('./web-worker.ts', import.meta.url)))

counter.onChange((value) => {
  console.log('WebWorker Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

### Service Worker

This is an example of communication between the main page and an service-worker.

see: [service-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/service-worker)

**InjectAdpter.ts**

```typescript
import { Workbox, WorkboxMessageEvent } from 'workbox-window'
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
  workbox: Workbox
  constructor(path: string) {
    this.workbox = new Workbox(path, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })
    this.workbox.register()
  }
  sendMessage: SendMessage = (message) => {
    this.workbox.messageSW(message)
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: WorkboxMessageEvent) => callback(event.data)
    this.workbox.addEventListener('message', handler)
    return () => this.workbox.removeEventListener('message', handler)
  }
}
```

**ProvideAdpter.ts**

```typescript
import { Adapter, SendMessage, OnMessage } from 'comctx'

declare const self: ServiceWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage(message))
    })
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: ExtendableMessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
```

**service-worker.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  console.log('ServiceWorker installed')
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  console.log('ServiceWorker activated')
  event.waitUntil(self.clients.claim())
})

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('ServiceWorker Value:', value) // 1,0
})
```

**main.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(
  new InjectAdapter(import.meta.env.MODE === 'production' ? '/service-worker.js' : '/dev-sw.js?dev-sw')
)

counter.onChange((value) => {
  console.log('ServiceWorker Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

### Browser Extension

This is an example of communication between the content-script page and an background.

see: [browser-extension-example](https://github.com/molvqingtai/comctx/tree/master/examples/browser-extension)

**InjectAdpter.ts**

```typescript
import browser from 'webextension-polyfill'
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
```

**ProvideAdapter.ts**

```typescript
import browser from 'webextension-polyfill'
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
```

**background.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('Background Value:', value) // 1,0
})
```

**content-script.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter())

counter.onChange((value) => {
  console.log('Background Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

### IFrame

This is an example of communication between the main page and an iframe.

see: [iframe-example](https://github.com/molvqingtai/comctx/tree/master/examples/iframe)

**InjectAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class InjectAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    window.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}
```

**ProvideAdapter.ts**

```typescript
import { Adapter, SendMessage, OnMessage } from 'comctx'

export default class ProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    window.parent.postMessage(message, '*')
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data)
    window.parent.addEventListener('message', handler)
    return () => window.parent.removeEventListener('message', handler)
  }
}
```

**iframe.ts**

```typescript
import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('iframe Value:', value) // 1,0
})
```

**main.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter())

counter.onChange((value) => {
  console.log('iframe Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.increment() // 1

await counter.decrement() // 0
```

## 🩷Thanks

The inspiration for this project comes from [@webext-core/proxy-service](https://webext-core.aklinker1.io/proxy-service/installation/), but [Comctx](https://github.com/molvqingtai/comctx) aims to be a better version of it.

## 📃License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/molvqingtai/comctx/blob/master/LICENSE) file for details
