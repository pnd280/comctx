import { importMath } from '../shared'

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  world: 'MAIN',
  async main() {
    setTimeout(() => {
      const math = importMath()
      math.foo.bar.baz().then((result) => {
        console.log('deep baz:', result) // baz
      })

      math.add(2, 3).then((result) => {
        console.log('add:', result) // 5
      })

      math.callbackAdd(2, 3, (result) => {
        console.log('add callback:', result) // 5
      })
    }, 1000)
  }
})
