import { provideCounter } from '@/shared'
import { browser, defineBackground } from '#imports'

import ProvideAdapter from './ProvideAdapter'

export default defineBackground({
  type: 'module',
  main() {
    // This allows the service-worker to remain resident in the background.
    browser.webNavigation.onHistoryStateUpdated.addListener(() => {
      console.log('background active')
    })

    const counter = provideCounter(new ProvideAdapter())

    counter.onChange((value) => {
      console.log('Background Value:', value)
    })
  }
})
