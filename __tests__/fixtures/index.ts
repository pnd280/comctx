// tests/fixtures/contextFixtures.ts
import { test as base, Page, Frame } from '@playwright/test'

type TestFixtures = {
  parentPage: Page
  childFrame: Frame
}

export const test = base.extend<TestFixtures>({
  // 构造父页面 fixture
  parentPage: async ({ page }, use) => {
    // 父页面引入共享库（同样假设 shared.ts 已打包为 shared.bundle.js）
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="/shared.bundle.js"></script>
          <script>
            // 上下文 B：作为 import 端，获得代理对象
            window.injectCounter = injectCounter();
          </script>
        </head>
        <body>
          父页面（import 端）
          <iframe id="childFrame" src="/child.html" style="width:600px; height:300px;"></iframe>
        </body>
      </html>
    `)
    await use(page)
  },

  // 提取 iframe（子页面）引用
  childFrame: async ({ parentPage }, use) => {
    // 根据 iframe 的 src 或 id 获取 frame 对象
    const frame = await parentPage.frame({ url: /child\.html/ })
    if (!frame) {
      throw new Error('未能获取到 childFrame')
    }
    await use(frame)
  }
})
