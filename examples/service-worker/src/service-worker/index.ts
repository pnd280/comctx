import { provideCounter } from '../shared'
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
  console.log('ServiceWorker Value:', value)
})
