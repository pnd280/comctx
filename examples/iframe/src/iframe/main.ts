import { provideCounter } from '../shared'
import './style.css'

import ProvideAdapter from './ProvideAdapter'

// Register the proxy object

void (async () => {
  const counter = provideCounter(new ProvideAdapter())

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div>
      <h1>I am an iframe page</h1>
      <div class="card">
        <h4 id="value">value: ${counter.value} </h4>
      </div>
    </div>
  `

  counter.onChange((value) => {
    document.querySelector<HTMLSpanElement>('#value')!.textContent = `value: ${value}`
  })
})().catch(console.error)
