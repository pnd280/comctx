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

const [exportMath, importMath] = comctx(() => Math, adapter)

// iframe page
exportMath()

// main page
const MathProxy = importMath()
