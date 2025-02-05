// tests/parent-child.spec.ts
import { expect } from '@playwright/test'
import { test } from '../fixtures'

test('父页面 injectCounter 与子 iframe provideCounter 通信测试', async ({ parentPage }) => {
  // 通过父页面调用 injectCounter 代理对象的方法
  // 1. 测试深层方法 math.foo.bar.baz()
  const resultBaz = await parentPage.evaluate(async () => {
    return await window.injectCounter.foo.bar.baz()
  })
  expect(resultBaz).toBe('baz')

  // 2. 测试普通方法 math.add(2, 3)
  const resultAdd = await parentPage.evaluate(async () => {
    return await window.injectCounter.add(2, 3)
  })
  expect(resultAdd).toBe(5)

  // 3. 测试带回调的方法 math.callbackAdd(2, 3, callback)
  const resultCallback = await parentPage.evaluate(() => {
    return new Promise<number>((resolve) => {
      window.injectCounter.callbackAdd(2, 3, (result: number) => {
        resolve(result)
      })
    })
  })
  expect(resultCallback).toBe(5)
})
