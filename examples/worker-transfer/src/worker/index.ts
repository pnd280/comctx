import { provideCounter } from '../shared'
import ProvideAdapter from './ProvideAdapter'

// Create the buffer provider service in the worker
provideCounter(new ProvideAdapter())

console.log('Buffer provider worker started')
