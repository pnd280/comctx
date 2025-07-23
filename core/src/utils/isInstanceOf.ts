const isInstanceOf = (value: any, constructor: new (...args: any[]) => any) => {
  return typeof constructor !== 'undefined' && value instanceof constructor
}

export default isInstanceOf
