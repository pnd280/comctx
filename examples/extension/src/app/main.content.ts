import { importMath } from '../shared'

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  world: 'MAIN',
  main() {
    setTimeout(() => {
      console.log('Hello main.')
      const math = importMath()

      // 调用远程方法
      math.add(2, 3).then((result) => {
        console.log('加法结果:', result) // 5
      })

      // 使用回调函数

      // 构造函数调用示例
      // const mathInstance = new math.AdvancedMath(10)
      // mathInstance.multiply(5).then((result) => {
      //   console.log('乘法结果:', result) // 50
      // })
    }, 1000)
  }
})
