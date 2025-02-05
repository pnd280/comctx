const setIntervalImmediate = (handler: Function, delay: number, ...args: any[]) => {
  let timer = setTimeout(() => {
    clearTimeout(timer)
    handler(...args)
    timer = setInterval(handler, delay, ...args)
  }, 0)
  return () => clearInterval(timer)
}

export default setIntervalImmediate
