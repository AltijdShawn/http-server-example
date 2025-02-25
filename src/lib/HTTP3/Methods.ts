// import { QuickDB, MemoryDriver, JSONDriver } from "quick.db"

// import { MethodObj, Methods, ParseMethod } from "../shared/Methods"
// import { EHTTPStatus } from "./v1"
// import { IRespObj } from "./v1"

// const Store = new QuickDB({
//   driver: new MemoryDriver()
// })

// export const Routes = new Map<string, null>()

// let _get      = Store.table('_get')
// let _head     = Store.table('_head')
// let _post     = Store.table('_post')
// let _put      = Store.table('_put')
// let _delete   = Store.table('_delete')
// let _connect  = Store.table('_connect')
// let _options  = Store.table('_options')
// let _trace    = Store.table('_trace')
// let _patch    = Store.table('_patch')
// let _all      = Store.table('_all')

// let routeCounter: number = 0

// export function registerRoute(method: string | Methods, endpoint, handler: IRespObj) {
//   const ID = routeCounter;
//   const _meth = ParseMethod(method)

//   Routes.set(endpoint, null)

//   console.log(`Registering: (${method}) ${endpoint}`)

//   translate(_meth).set(endpoint, {
//     expectedStatus: handler.status,
//     handler: handler.handler,
//     method: _meth.str,
//     ID
//   })

//   routeCounter++
// }

// export async function getRoute(method: string | Methods, endpoint): Promise<RouteHandler> {
//   let r = await translate(ParseMethod(method)).get(endpoint);
//   if (r == null) r = await translate(ParseMethod('ALL')).get(endpoint)
//   return r
// }

// function translate(obj: MethodObj): QuickDB<any> {
//   switch(obj.str) {
//     case 'GET':
//       return _get
//     case 'HEAD':
//       return _head
//     case 'POST':
//       return _post
//     case 'PUT':
//       return _put
//     case 'DELETE':
//       return _delete
//     case 'CONNECT':
//       return _connect
//     case 'OPTIONS':
//       return _options
//     case 'TRACE':
//       return _trace
//     case 'PATCH':
//       return _patch
//     case 'ALL':
//       return _all
//     default:
//       return _all
//   }
// }

// export interface RouteHandler {
//   expectedStatus: EHTTPStatus | boolean,
//   handler: (req, res) => any,
//   method: string,
//   ID: number
// }