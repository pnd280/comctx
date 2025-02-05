import { provideCounter } from '@/shared'
import { defineBackground } from 'wxt/sandbox'

import ProvideAdapter from './ProvideAdapter'

export default defineBackground({
  type: 'module',
  main() {
    const counter = provideCounter(new ProvideAdapter())

    counter.onChange((value) => {
      console.log('Background Value:', value)
    })
  }
})
