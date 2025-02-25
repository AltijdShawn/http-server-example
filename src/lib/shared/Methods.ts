export enum Methods {
  GET,
  HEAD,
  POST,
  PUT,
  DELETE,
  CONNECT,
  OPTIONS,
  TRACE,
  PATCH,

  ALL
}

export const METH_REG = [
  [Methods.GET,     'GET'],
  [Methods.HEAD,    'HEAD'],
  [Methods.POST,    'POST'],
  [Methods.PUT,     'PUT'],
  [Methods.DELETE,  'DELETE'],
  [Methods.CONNECT, 'CONNECT'],
  [Methods.OPTIONS, 'OPTIONS'],
  [Methods.TRACE,   'TRACE'],
  [Methods.PATCH,   'PATCH'],
  [Methods.ALL,     'ALL'],
]

export function ParseMethod(method: Methods | string): MethodObj {
  let meth = method;
  if (typeof method === 'string')
    meth = String(method).toUpperCase();

  let state = null;

  for (const entry of METH_REG) {
    if (entry.includes(meth))
      state = {
        num: entry[0],
        str: entry[1]
      }
  }
  if (state === null) return ParseMethod(Methods.ALL);
  else return state
}

export interface MethodObj {
  num: Methods,
  str: string
}