import { provideCounter } from '../shared'
import ProvideAdapter from './ProvideAdapter'

const counter = provideCounter(new ProvideAdapter())

counter.onChange((value) => {
  console.log('SharedWorker Value:', value)
})
