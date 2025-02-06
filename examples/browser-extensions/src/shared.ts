import comctx from 'comctx'

// Proxy object that will run in the background script
class Counter {
  value = 0

  async getValue() {
    return this.value
  }

  async onChange(callback: (value: number) => void) {
    let oldValue = await this.getValue()
    setInterval(async () => {
      const newValue = await this.getValue()
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

export const [provideCounter, injectCounter] = comctx(() => new Counter())
