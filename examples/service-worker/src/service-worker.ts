import { provideCounter } from './shared'
import ProvideAdapter from './ProvideAdapter'

declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => self.skipWaiting())

const counter = provideCounter(new ProvideAdapter())
counter.onChange((value) => {
  console.log('ServiceWorker Value:', value)
})
