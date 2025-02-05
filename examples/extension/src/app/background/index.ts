import { provideCounter } from '@/shared'
import { defineBackground } from 'wxt/sandbox'

import ProvideAdapter from './ProvideAdapter'

export default defineBackground({
  type: 'module',
  main() {
    const counter = provideCounter(new ProvideAdapter())
    // const tabs = await browser.tabs.query({ active: true })
    counter.onChange((value) => {
      console.log('background value:', value)
    })
  }
})
