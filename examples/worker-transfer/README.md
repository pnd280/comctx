# Web Worker Transfer Objects Example

This example demonstrates how to use Comctx with Web Workers to receive transferable objects created in the worker, showcasing automatic transfer handling.

## Features

- **Automatic Transfer Handling**: Objects created in worker are automatically transferred (not cloned) to main thread
- **Multiple Object Types**: ReadableStream, ArrayBuffer, and TransformStream examples
- **Zero Configuration**: No manual transfer list management required
- **Developer Experience**: Transparent object transfer with full type safety

## Key Components

### StreamFactory Service (`shared.ts`)

- `createTextStream()`: Creates ReadableStream objects in the worker
- `createLargeBuffer()`: Creates large ArrayBuffer objects in the worker
- `createTransformStream()`: Creates TransformStream objects in the worker
- `processTextStream()`: Legacy method for processing streams (kept for compatibility)

### Transfer-enabled Adapters

- **InjectAdapter**: Handles transfer parameter in sendMessage
- **ProvideAdapter**: Mirror functionality in the worker context

### Automatic Transfer Detection

The framework automatically detects and transfers objects including:

- `ArrayBuffer` - Large binary data
- `ReadableStream` - Streaming data sources
- `WritableStream` - Streaming data destinations
- `TransformStream` - Data transformation pipelines
- `MessagePort`, `ImageBitmap`, `OffscreenCanvas`, etc.

## Usage Examples

### Get ReadableStream from Worker

```typescript
// Worker creates stream, automatically transferred to main thread
const textStream = await factory.createTextStream('hello world from worker')
const reader = textStream.getReader()
```

### Get Large ArrayBuffer from Worker

```typescript
// Worker creates 1MB buffer, transferred (not copied) to main thread
const largeBuffer = await factory.createLargeBuffer(1024 * 1024)
console.log('Buffer size:', largeBuffer.byteLength)
```

### Get TransformStream from Worker

```typescript
// Worker creates transform, can be used in main thread pipelines
const transformer = await factory.createTransformStream()
await inputStream.pipeThrough(transformer).pipeTo(outputStream)
```

## Developer Benefits

- **Simplified API**: No need to manually specify transfer lists
- **Error Prevention**: Locked streams automatically filtered out
- **Type Safety**: Full TypeScript support for transferred objects
- **Performance**: Automatic zero-copy transfer for large objects

## Configuration

Enable automatic transfer in proxy definition:

```typescript
export const [provide, inject] = defineProxy(() => new StreamFactory(), {
  namespace: '__example__',
  transfer: true // Enable automatic transferable objects handling
})
```

## Running the Example

```bash
cd examples/worker-transfer
npm install
npm run dev
```

Open browser and click the buttons to test different transferable object types. Check console for detailed transfer logs.

## Browser Support

Requires modern browsers with:

- Transferable Objects support in postMessage
- ReadableStream/WritableStream/TransformStream APIs
- Web Workers support

The example gracefully handles unsupported environments by logging appropriate messages.
