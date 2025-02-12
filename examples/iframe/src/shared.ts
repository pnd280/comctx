import { defineProxy } from 'comctx'

// Proxy object that will run in the iframe
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
        callback(this.value)
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
  namespace: '__iframe-example__'
})
