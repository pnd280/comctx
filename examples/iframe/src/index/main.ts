import { injectCounter } from '../shared'
import { name, description } from '../../package.json'

import './style.css'

import InjectAdapter from './InjectAdapter'
import createElement from '../utils/createElement'

void (async () => {
  // Use the proxy object
  const counter = injectCounter(new InjectAdapter())

  const value = await counter.getValue()

  document.querySelector<HTMLDivElement>('#app')!.insertBefore(
    createElement(`
      <div>
        <h1>${name}</h1>
        <p>${description}</p>
        <div class="card">
          <button id="decrement" type="button">-</button>
          <div id="value">${value}</div>
          <button id="increment" type="button">+</button>
        </div>
      </div>
    `),
    document.querySelector<HTMLDivElement>('#iframe')!
  )

  document.querySelector<HTMLButtonElement>('#decrement')!.addEventListener('click', async () => {
    const value = await counter.decrement()
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
  })

  document.querySelector<HTMLButtonElement>('#increment')!.addEventListener('click', async () => {
    const value = await counter.increment()
    document.querySelector<HTMLDivElement>('#value')!.textContent = value.toString()
  })
})().catch(console.error)
