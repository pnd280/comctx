# Comctx

Easily interoperate across different contexts.

[![version](https://img.shields.io/github/v/release/molvqingtai/comctx)](https://www.npmjs.com/package/comctx) [![workflow](https://github.com/molvqingtai/comctx/actions/workflows/ci.yml/badge.svg)](https://github.com/molvqingtai/comctx/actions) [![download](https://img.shields.io/npm/dt/comctx)](https://www.npmjs.com/package/comctx)

```shell
$ pnpm install comctx
```



## Introduction

[Comctx](https://github.com/molvqingtai/comctx) 与  [Comlink](https://github.com/GoogleChromeLabs/comlink) 有着同样的目标,但这不是重复造轮子, 由于 [Comlink](https://github.com/GoogleChromeLabs/comlink) 依赖 [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort), 并不是在所有环境中得到支持,这个项目实现了一种更灵活的方式实现 RPC,它让适配不同运行环境变得更简单.



## Setup

```typescript
import { defineProxy } from 'comctx'

class Counter {
  value = 0

  async getValue() {}

  async onChange(callback: (value: number) => void) {}

  async increment() {}

  async decrement() {}
}

export const [provideCounter, injectCounter] = defineProxy(() => new Counter(),{
  backup: false
})


// provide 端,一般是 service-worker background 等.
const originCounter = provideCounter({
    onMessage(message){},
    sendMessage(message){}
})
originCounter.onChange((data)=>{})

// inject 端,一般是 主页面 content-script 等.
const proxyCounter = provideCounter({
    onMessage(message){},
    sendMessage(message){}
})
proxyCounter.increment()
```

* originCounter 和 proxyCounter 将共享 Counter, proxyCounter 是一个虚拟的代理, 访问 proxyCounter 将转发到 provide 端的 Counter,而 originCounter则是 Counter 本身
* inject 端不能直接使用 get 和 set, 必须通过调用异步方法操作 Counter,但是支持 callback
* 因为 inject 是一个虚拟的代理, 如果要支持 Reflect.has(proxyCounter, 'value') 等操作, 可以将 backup 设置为 true, 将会在 inject 端复制一份拷贝, 它不会真正运行,仅仅是一个静态的模板.
* provideCounter/injectCounter 需要接受用户自定义不同环境的适配器,即实现 onMessage/sendMessage 方法.

 

## Examples

**shared.ts**

Counter 将会在不同的环境共享

```typescript
import { defineProxy } from 'comctx'

class Counter {
  value = 0

  async getValue() {
    return this.value
  }

  async onChange(callback: (value: number) => void) {
    let oldValue = this.value
    setInterval(() => {
      const newValue = this.value
      if (oldValue !== newValue) {
        callback(this.value)
        oldValue = newValue
      }
    })
  }

  async increment() {
    this.value++
    return this.value
  }

  async decrement() {
    this.value--
    return this.value
  }
}

export const [provideCounter, injectCounter] = defineProxy(() => new Counter(), {
  namespace: '__comctx-example__'
})

```



#### Service Worker 

This is an example of communication between the main page and an service-worker. 

[service-worker-example](https://github.com/molvqingtai/comctx/tree/master/examples/service-worker)

**InjectAdpter.ts**

```typescript
import { Workbox, WorkboxMessageEvent } from 'workbox-window'
import { Adapter, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  workbox: Workbox
  constructor(path: string) {
    this.workbox = new Workbox(path, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })
    this.workbox.register()
  }
  sendMessage(message: Message) {
    this.workbox.messageSW(message)
  }
  onMessage(callback: (message: Message) => void) {
    const handler = (event: WorkboxMessageEvent) => callback(event.data)

    this.workbox.addEventListener('message', handler)
    return () => this.workbox.removeEventListener('message', handler)
  }
}
```

**ProvideAdpter.ts**

```typescript
import { Adapter, Message } from 'comctx'

declare const self: ServiceWorkerGlobalScope

export default class ProvideAdapter implements Adapter {
  sendMessage(message: Message) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage(message))
    })
  }
  onMessage(callback: (message: Message) => void) {
    const handler = (event: ExtendableMessageEvent) => callback(event.data)
    self.addEventListener('message', handler)
    return () => self.removeEventListener('message', handler)
  }
}
```

**servie-worker.ts**

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

await counter.decrement() // 1

await counter.increment() // 0
```



#### Browser Extension

This is an example of communication between the content-script page and an background.

[browser-extension-example](https://github.com/molvqingtai/comctx/tree/master/examples/browser-extension)

**InjectAdpter.ts**

```typescript
import { browser } from 'webextension-polyfill'
import { Adapter, Message } from 'comctx'

export interface MessageExtra extends Message {
  url: string
}

export default class InjectAdapter implements Adapter<MessageExtra> {
  sendMessage(message: Message) {
    browser.runtime.sendMessage(browser.runtime.id, { ...message, url: document.location.href })
  }
  onMessage(callback: (message: MessageExtra) => void) {
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
import { browser } from 'webextension-polyfill'
import { Adapter, Message } from 'comctx'

export interface MessageExtra extends Message {
  url: string
}

export default class ProvideAdapter implements Adapter<MessageExtra> {
  async sendMessage(message: MessageExtra) {
    const tabs = await browser.tabs.query({ url: message.url })
    tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
  }

  onMessage(callback: (message: MessageExtra) => void) {
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

await counter.decrement() // 1

await counter.increment() // 0
```



### iframe

This is an example of communication between the main page and an iframe.

[iframe-example](https://github.com/molvqingtai/comctx/tree/master/examples/iframe)

**InjectAdapter.ts**

```typescript
import { Adapter, Message } from 'comctx'

export default class InjectAdapter implements Adapter {
  sendMessage(message: Message) {
    window.postMessage(message, '*')
  }
  onMessage(callback: (message: Message) => void) {
    const handler = (event: MessageEvent) => callback(event.data)
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }
}
```

**ProvideAdapter.ts**

```typescript
import { Adapter, Message } from 'comctx'

export default class ProvideAdapter implements Adapter {
  sendMessage(message: Message) {
    window.parent.postMessage(message, '*')
  }
  onMessage(callback: (message: Message) => void) {
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

**index.ts**

```typescript
import { injectCounter } from './shared'
import InjectAdapter from './InjectAdapter'

const counter = injectCounter(new InjectAdapter())
    
counter.onChange((value) => {
  console.log('iframe Value:', value) // 1,0
})

await counter.getValue() // 0

await counter.decrement() // 1

await counter.increment() // 0
```






## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/molvqingtai/comctx/blob/master/LICENSE) file for details
