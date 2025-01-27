import { exportMath } from '../shared'

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  world: 'ISOLATED',
  main() {
    // 导出服务实例
    exportMath()
    console.log('Hello isolated.')
  }
})
