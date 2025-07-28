# Comctx: A Better Cross-Context Communication Library Than Comlink

[Comlink](https://github.com/GoogleChromeLabs/comlink) performs great for [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) communication, which is its main design goal. However, when you want to use it in other environments, you'll find the adaptation work extremely difficult.

I developed [Comctx](https://github.com/molvqingtai/comctx) to solve this problem. It maintains [Comlink](https://github.com/GoogleChromeLabs/comlink)'s simple API while making environment adaptation easy through an adapter pattern.

## What Problem Does It Solve

[Comlink](https://github.com/GoogleChromeLabs/comlink) is primarily designed for [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). While theoretically it can be adapted to other environments, the actual implementation is very difficult.

For example, in browser extensions, Content Script and Background Script can only communicate through the `chrome.runtime` API. If you want to use [Comlink](https://github.com/GoogleChromeLabs/comlink), you need to somehow wrap this API into [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort) format, which is complex and error-prone. You have to rewrite [Comlink](https://github.com/GoogleChromeLabs/comlink)'s adapter code [issue(438)](https://github.com/GoogleChromeLabs/comlink/issues/438).

Similar problems exist in Electron and certain restricted environments. Every time you encounter a new environment, you need to do a complex set of adaptation work.

[Comctx](https://github.com/molvqingtai/comctx)'s approach is simple:

- Don't restrict specific communication methods
- Provide an adapter interface that lets you tell it how to send and receive messages
- Handle all the RPC logic for you

This way, the same service code can be reused across various environments.

## Where You Can Use It

#### 1. Browser Extension Development

```typescript
// Shared storage service
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

// Background Script (service provider)
class BackgroundAdapter {
  sendMessage = (message) => chrome.runtime.sendMessage(message)
  onMessage = (callback) => chrome.runtime.onMessage.addListener(callback)
}
provideStorage(new BackgroundAdapter())

// Content Script (service consumer)
const storage = injectStorage(new BackgroundAdapter())
await storage.set('userPrefs', { theme: 'dark' })
const prefs = await storage.get('userPrefs')
```

#### 2. Web Worker Computation Tasks

```typescript
// Image processing service
class ImageProcessor {
  async processImage(imageData, filters) {
    // Complex image processing algorithm
    return processedData
  }
  
  async onProgress(callback) {
    // Progress callback
  }
}

const [provideProcessor, injectProcessor] = defineProxy(() => new ImageProcessor())

// Worker side
class WorkerAdapter {
  sendMessage = (message) => postMessage(message)
  onMessage = (callback) => addEventListener('message', event => callback(event.data))
}
provideProcessor(new WorkerAdapter())

// Main thread
const processor = injectProcessor(new WorkerAdapter())
// Progress callback
processor.onProgress(progress => updateUI(progress))
// Processing result
const result = await processor.processImage(imageData, filters)
```

#### 3. iframe Cross-Domain Communication

```typescript
// Payment service (running in secure iframe)
class PaymentService {
  async processPayment(amount, cardInfo) {
    // Secure payment processing logic
    return paymentResult
  }
  
  async validateCard(cardNumber) {
    return isValid
  }
}

// Payment service inside iframe
class IframeAdapter {
  sendMessage = (message) => parent.postMessage(message, '*')
  onMessage = (callback) => addEventListener('message', event => callback(event.data))
}
provide(new IframeAdapter())

// Main page calling payment service
const payment = inject(new IframeAdapter())
const result = await payment.processPayment(100, cardInfo)
```

#### 4. Electron Inter-Process Communication

```typescript
// File operation service (providing file system access in main process)
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

// Main process
class MainProcessAdapter {
  sendMessage = (message) => webContents.send('ipc-message', message)
  onMessage = (callback) => ipcMain.on('ipc-message', (_, data) => callback(data))
}
provide(new MainProcessAdapter())

// Renderer process
class RendererAdapter {
  sendMessage = (message) => ipcRenderer.send('ipc-message', message)
  onMessage = (callback) => ipcRenderer.on('ipc-message', (_, data) => callback(data))
}
const fileService = inject(new RendererAdapter())
const content = await fileService.readFile('/path/to/file')
```

#### 5. Micro-Frontend Architecture

```typescript
// Shared user authentication service
class AuthService {
  async login(credentials) { /* ... */ }
  async logout() { /* ... */ }
  async getCurrentUser() { /* ... */ }
  async onAuthStateChange(callback) { /* ... */ }
}

// Main app provides authentication service
class MicroFrontendAdapter {
  sendMessage = (message) => window.postMessage({ ...message, source: 'main-app' }, '*')
  onMessage = (callback) => {
    window.addEventListener('message', event => {
      if (event.data.source === 'micro-app') callback(event.data)
    })
  }
}

// All micro-frontend apps can use the same authentication service
const auth = inject(new MicroFrontendAdapter())
const user = await auth.getCurrentUser()
```

Through these examples, you can see that regardless of the underlying communication mechanism, your business code remains the same. This is the benefit of the adapter pattern.

## Improvements Over Comlink

Besides solving environment limitation issues, [Comctx](https://github.com/molvqingtai/comctx) has made optimizations in other areas:

**Smaller Bundle Size**
Thanks to the minimalist design of the core code, [Comctx](https://github.com/molvqingtai/comctx) is only 1KB+, while [Comlink](https://github.com/GoogleChromeLabs/comlink) is 4KB+

**Automatic Transferable Objects Handling**
When you transfer large objects like [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) and [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData), [Comctx](https://github.com/molvqingtai/comctx) can automatically extract them for [transfer](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects). [Comlink](https://github.com/GoogleChromeLabs/comlink) requires manual handling.

**Better Connection Management**
[Comctx](https://github.com/molvqingtai/comctx) has built-in heartbeat detection that can automatically wait for remote services to be ready. This solves the common timing issues in [Comlink](https://github.com/GoogleChromeLabs/comlink) — sometimes when you call a method, the other side isn't ready to receive messages.

**Type Safety**
[TypeScript](https://www.typescriptlang.org/) support is as good as [Comlink](https://github.com/GoogleChromeLabs/comlink), with all the type inference you expect.

## Design Philosophy Differences

[Comlink](https://github.com/GoogleChromeLabs/comlink) and [Comctx](https://github.com/molvqingtai/comctx) have fundamentally different design approaches:

**Comlink's Approach**

```typescript
// Directly wrap the entire worker
const api = Comlink.wrap(worker)
await api.someMethod()
```

This approach is straightforward, but the problem is it hardcodes the communication mechanism. The Worker object must support [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort), and it won't work in other environments.

**Comctx's Approach**

```typescript
// First define the service
const [provide, inject] = defineProxy(() => new Service())

// Server side: publish service
provide(adapter)

// Client side: use service
const service = inject(adapter)
```

The key here is the `adapter`. It tells [Comctx](https://github.com/molvqingtai/comctx) how to send and receive messages without restricting the specific method. This achieves separation between communication methods and business logic.

Additionally, [Comctx](https://github.com/molvqingtai/comctx) has a heartbeat detection mechanism to ensure the connection is alive. This solves the common connection timing issues in [Comlink](https://github.com/GoogleChromeLabs/comlink).

## Summary

The motivation behind developing [Comctx](https://github.com/molvqingtai/comctx) is simple: make RPC communication environment-agnostic.

If you're just using [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), [Comlink](https://github.com/GoogleChromeLabs/comlink) is sufficient. But if your project involves browser extensions, iframes, Electron, or other custom communication scenarios, [Comctx](https://github.com/molvqingtai/comctx) would be a better choice.

It not only solves environment adaptation problems but also improves bundle size, performance, and reliability. Most importantly, the API design maintains [Comlink](https://github.com/GoogleChromeLabs/comlink)'s simplicity with almost zero learning curve.

### Related Resources

- 📚 [GitHub Repository](https://github.com/molvqingtai/comctx) - Complete source code and examples
- 📦 [NPM Package](https://www.npmjs.com/package/comctx) - Install and use immediately  
- 📖 [Online Documentation](https://deepwiki.com/molvqingtai/comctx) - Detailed usage guide