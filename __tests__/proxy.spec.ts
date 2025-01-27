import comctx from '../core'

class Math {
  name = 'Math'
  a: number
  b: number
  constructor(a: number, b: number) {
    this.a = a
    this.b = b
  }

  add(a: number, b: number) {
    return a + b
  }
}

const mathProxy = new Proxy(new Math(1, 2), {})

const [exportMath, importMath] = comctx(() => proxy)

exportMath()

const mathProxyProxy = importMath()
