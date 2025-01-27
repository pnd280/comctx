import { defineConfig } from 'wxt'
import path from 'node:path'

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  srcDir: path.resolve('src'),
  entrypointsDir: 'app',
  runner: {
    startUrls: ['http://www.example.com/'],
    openConsole: true
  }
})
