import { defineProxy } from 'comctx'

// Proxy object that will run in the background script
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

export const [provideCounter, injectCounter] = defineProxy(() => new Counter())
