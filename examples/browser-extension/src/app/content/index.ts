import { defineContentScript } from '#imports'

import { injectCounter } from '@/shared'
import { createShadowRootUi } from '#imports'
import { name, description } from '@/../package.json'
import createElement from '@/utils/createElement'

import InjectAdapter from './InjectAdapter'

import './style.css'

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  runAt: 'document_end',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const counter = injectCounter(new InjectAdapter())

    const ui = await createShadowRootUi(ctx, {
      name,
      position: 'inline',
      anchor: 'body',
      append: 'replace',
      mode: 'open',
      onMount: async (container) => {
        const initValue = await counter.getValue()

        const app = createElement(`     
          <div id="app">
            <h1>${name}</h1>
            <p>${description}</p>
            <div class="card">
              <button id="decrement" type="button">-</button>
                <div id="value">${initValue}</div>
              <button id="increment" type="button">+</button>
            </div>
            <div class="card">
              <h4 id="background-value">Background Value: ${initValue} </h4>
            </div>
          </div>`)

        app.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
          await counter.decrement()
        })

        app.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
          await counter.increment()
        })

        counter.onChange((value) => {
          app.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
          app.querySelector<HTMLDivElement>('#background-value')!.textContent = `Background Value: ${value}`
        })
        container.append(app)
      }
    })
    ui.mount()
  }
})
