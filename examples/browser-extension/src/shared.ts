import { defineProxy } from 'comctx'
import { browser } from 'wxt/browser'

// Proxy object that will run in the background script
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
  namespace: browser.runtime.id
})
