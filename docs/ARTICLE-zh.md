# Comctx：比 Comlink 更好的跨上下文通信库

[Comlink](https://github.com/GoogleChromeLabs/comlink) 在 Web Worker 通信方面表现很棒，这也是它的主要设计目标。但当你想在其他环境中使用时，就会发现适配工作异常困难。

我开发 [Comctx](https://github.com/molvqingtai/comctx) 就是为了解决这个问题。它保持了 [Comlink](https://github.com/GoogleChromeLabs/comlink) 的简洁 API，但通过适配器模式让环境适配变得简单。

## 具体解决了什么问题

[Comlink](https://github.com/GoogleChromeLabs/comlink) 主要是为 [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) 设计的，虽然理论上可以适配其他环境，但实际操作起来非常困难。

比如在浏览器扩展中，Content Script 和 Background Script 之间只能通过 `chrome.runtime` API 通信。你要用 [Comlink](https://github.com/GoogleChromeLabs/comlink) 的话，得想办法把这套 API 包装成 [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort) 的形式，这个过程很复杂，你必须重写 [Comlink](https://github.com/GoogleChromeLabs/comlink) 的适配器代码 [issuse(438)](https://github.com/GoogleChromeLabs/comlink/issues/438)。

类似的问题在 Electron、某些受限的环境中都存在。每次遇到新环境，你都得做一套复杂的适配工作。

[Comctx](https://github.com/molvqingtai/comctx) 的思路很简单：

-   不限定具体的通信方式
-   提供一个适配器接口，让你告诉它怎么发消息、怎么收消息
-   剩下的 RPC 逻辑都帮你处理好

这样，同一套服务代码就能在各种环境中复用了。

## 看看能在哪些地方用

#### 1. 浏览器扩展开发

```TypeScript
// 共享的存储服务
class StorageService {
  async get(key) {
    const result = await chrome.storage.local.get(key)
    return result[key]
  }
  
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value })
  }
  
  async onChanged(callback) {
    chrome.storage.onChanged.addListener(callback)
  }
}

const [provideStorage, injectStorage] = defineProxy(() => new StorageService())

// Background Script (服务提供方)
class BackgroundAdapter {
  sendMessage = (message) => chrome.runtime.sendMessage(message)
  onMessage = (callback) => chrome.runtime.onMessage.addListener(callback)
}
provideStorage(new BackgroundAdapter())

// Content Script (服务使用方)
const storage = injectStorage(new BackgroundAdapter())
await storage.set('userPrefs', { theme: 'dark' })
const prefs = await storage.get('userPrefs')
```

#### 2. Web Worker 计算任务

```TypeScript
// 图像处理服务
class ImageProcessor {
  async processImage(imageData, filters) {
    // 复杂的图像处理算法
    return processedData
  }
  
  async onProgress(callback) {
    // 处理进度回调
  }
}

const [provideProcessor, injectProcessor] = defineProxy(() => new ImageProcessor())

// Worker 端
class WorkerAdapter {
  sendMessage = (message) => postMessage(message)
  onMessage = (callback) => addEventListener('message', event => callback(event.data))
}
provideProcessor(new WorkerAdapter())

// 主线程
const processor = injectProcessor(new WorkerAdapter())
// 进度回调
processor.onProgress(progress => updateUI(progress))
// 处理结果
const result = await processor.processImage(imageData, filters)
```

#### 3. iframe 跨域通信

```TypeScript
// 支付服务（在安全的 iframe 中运行）
class PaymentService {
  async processPayment(amount, cardInfo) {
    // 安全的支付处理逻辑
    return paymentResult
  }
  
  async validateCard(cardNumber) {
    return isValid
  }
}

// iframe 内的支付服务
class IframeAdapter {
  sendMessage = (message) => parent.postMessage(message, '*')
  onMessage = (callback) => addEventListener('message', event => callback(event.data))
}
provide(new IframeAdapter())

// 主页面调用支付服务
const payment = inject(new IframeAdapter())
const result = await payment.processPayment(100, cardInfo)
```

#### 4. Electron 进程间通信

```
// 文件操作服务（在主进程中提供文件系统访问）
class FileService {
  async readFile(path) {
    return fs.readFileSync(path, 'utf8')
  }
  
  async writeFile(path, content) {
    fs.writeFileSync(path, content)
  }
  
  async watchFile(path, callback) {
    fs.watchFile(path, callback)
  }
}

// 主进程
class MainProcessAdapter {
  sendMessage = (message) => webContents.send('ipc-message', message)
  onMessage = (callback) => ipcMain.on('ipc-message', (_, data) => callback(data))
}
provide(new MainProcessAdapter())

// 渲染进程
class RendererAdapter {
  sendMessage = (message) => ipcRenderer.send('ipc-message', message)
  onMessage = (callback) => ipcRenderer.on('ipc-message', (_, data) => callback(data))
}
const fileService = inject(new RendererAdapter())
const content = await fileService.readFile('/path/to/file')
```

#### 5. 微前端架构

```TypeScript
// 共享的用户认证服务
class AuthService {
  async login(credentials) { /* ... */ }
  async logout() { /* ... */ }
  async getCurrentUser() { /* ... */ }
  async onAuthStateChange(callback) { /* ... */ }
}

// 主应用提供认证服务
class MicroFrontendAdapter {
  sendMessage = (message) => window.postMessage({ ...message, source: 'main-app' }, '*')
  onMessage = (callback) => {
    window.addEventListener('message', event => {
      if (event.data.source === 'micro-app') callback(event.data)
    })
  }
}

// 各个微前端应用都可以使用同一个认证服务
const auth = inject(new MicroFrontendAdapter())
const user = await auth.getCurrentUser()
```

通过这些例子可以看出，不管底层用的是什么通信机制，你的业务代码都是一样的。这就是适配器模式的好处。

## 相比 Comlink 有什么改进

除了解决环境限制问题，[Comctx](https://github.com/molvqingtai/comctx) 在其他方面也做了一些优化：

**包体积更小** 得益于核心代码的极简设计，[Comctx](https://github.com/molvqingtai/comctx) 只有 1KB+，而 [Comlink](https://github.com/GoogleChromeLabs/comlink) 是 4KB+

**自动处理 Transferable Objects** 当你传输 [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)、[ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData) 这些大对象时，[Comctx](https://github.com/molvqingtai/comctx) 可以自动提取为 [transfer](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)。[Comlink](https://github.com/GoogleChromeLabs/comlink) 需要你手动处理。

**更好的连接管理** [Comctx](https://github.com/molvqingtai/comctx) 内置了心跳检测，能自动等待远程服务准备好。这解决了 [Comlink](https://github.com/GoogleChromeLabs/comlink) 中常见的时序问题——有时候你调用方法时，对方还没准备好接收消息。

**类型安全** [TypeScript](https://www.typescriptlang.org/) 支持和 [Comlink](https://github.com/GoogleChromeLabs/comlink) 一样好，该有的类型推导都有。

## 设计思路上的差异

[Comlink](https://github.com/GoogleChromeLabs/comlink) 和 [Comctx](https://github.com/molvqingtai/comctx) 的设计思路有本质区别：

**Comlink 的做法**

```TypeScript
// 直接包装整个 worker
const api = Comlink.wrap(worker)
await api.someMethod()
```

这种方式很直接，但问题是它把通信机制写死了。Worker 对象必须支持 [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort)，换个环境就不行了。

**Comctx 的做法**

```TypeScript
// 先定义服务
const [provide, inject] = defineProxy(() => new Service())

// 服务端：发布服务
provide(adapter)

// 客户端：使用服务
const service = inject(adapter)
```

这里的关键是 `adapter`。它告诉 [Comctx](https://github.com/molvqingtai/comctx) 怎么收发消息，但不限制具体用什么方式。这样就做到了通信方式和业务逻辑的分离。

另外，[Comctx](https://github.com/molvqingtai/comctx) 有心跳检测机制，确保连接是活的。这解决了 [Comlink](https://github.com/GoogleChromeLabs/comlink) 中常见的连接时序问题。

## 总结

开发 [Comctx](https://github.com/molvqingtai/comctx) 的初衷很简单：让 RPC 通信不再受环境限制。

如果你只是在 [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) 里用用，[Comlink](https://github.com/GoogleChromeLabs/comlink) 够了。但如果你的项目涉及浏览器扩展、iframe、Electron，或者其他自定义通信场景，[Comctx](https://github.com/molvqingtai/comctx) 会是更好的选择。

它不仅解决了环境适配问题，在包体积、性能、可靠性方面也有所改进。最重要的是，API 设计保持了 [Comlink](https://github.com/GoogleChromeLabs/comlink) 的简洁性，学习成本几乎为零。

### 相关资源

-   📚 [GitHub 仓库](https://github.com/molvqingtai/comctx) - 完整源码和示例
-   📦 [NPM 包](https://www.npmjs.com/package/comctx) - 立即安装使用
-   📖 [在线文档](https://deepwiki.com/molvqingtai/comctx) - 详细使用指南
