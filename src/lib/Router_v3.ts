// 1. Imports
import fs from "fs";
import tls from "tls";
import { Socket, Server } from "net";
import * as HTTP11 from "./HTTP_1.1/V4";
import * as HTTP2 from "./HTTP_2/V1";
import { Routes, registerRoute } from './HTTP_1.1/Methods';
import { Logger } from "./shared/logger";

// 2. Types & Interfaces
export type TMethod = 
    | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' 
    | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH' | 'ALL';

export type RouterHandler = 
    | string 
    | ((req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>) 
    | IRouter 
    | (new (router: IRouter) => { router: IRouter })
    | typeof RouterClass;

export interface IReq {
    method: TMethod;
    url: string;
    queries: { [key: string]: string; }
    httpVersion: string;
    headers: any | { [key: string]: string | number; };
    body: string;
    params: { [key: string]: any };
    socket: Socket;
    cookies: () =>{ [key: string]: string };
}

export interface IRes {
    headersSent?: boolean;
    write(chunk: any): Promise<void>;
    end(chunk: any): Promise<void>;
    setHeader: (key: string, value: string | number) => void;
    setStatus(newStatus: HTTP11.EHTTPStatus | number | string): void;
    json(data: any): Promise<void>;
}

export interface IRouteEntry {
    method: TMethod,
    route: string,
    handler: (req: IReq, res: IRes) => any
}

export interface _RouterClass {
    new (router: IRouter): { router: IRouter };
}

export interface IRouter {
    routes: Array<{
        method: string, 
        route: string, 
        handler: (req: IReq, res: IRes) => any,
        isRouted?: boolean
    }>;
    middlewares: Array<{
        handler: ((req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>) | IRouter,
        path?: string
    }>;
    mounted?: boolean;
    isSubRouter?: boolean;
    errorHandler: (req: IReq, res: IRes, err?: Error) => Promise<void>;
    remap: (endpoint: string, route: string, method: TMethod) => void;
    use: (pathOrHandler: RouterHandler, handler?: IRouter | (new (router: IRouter) => { router: IRouter })) => IRouter;
    get: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    head: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    post: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    put: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    _delete: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    connect: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    options: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    trace: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    patch: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    all: (route: string, handler: (req: IReq, res: IRes) => any) => void;
    setErrorHandler: (handler: (req: IReq, res: IRes, err?: Error) => Promise<void>) => void;
}

// 3. Global Variables & Constants
const logger = new Logger('RouterUtils');
let routes: IRouteEntry[] = [];
let routesCopy: IRouteEntry[] = [];
let middlewares: {
    handler: ((req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>) | IRouter,
    path?: string
}[] = [];
const mountedPaths = new Set<string>();

// 4. Helper Classes
class Layer {
    method: string;
    path: string;
    handler: (req: IReq, res: IRes) => any;

    constructor(method: string, path: string, handler: (req: IReq, res: IRes) => any) {
        this.method = method;
        this.path = path.startsWith('/') ? path : '/' + path;
        this.handler = handler;
    }

    match(method: string, path: string): boolean {
        return this.method === method && (
            this.path === path || 
            (this.path === '*') ||
            (path.startsWith(this.path) && (this.path.endsWith('/') || path[this.path.length] === '/'))
        );
    }
}

// 5. Base Router Class
export class RouterClass {
    public router: IRouter;
    remap: IRouter['remap'];
    use: IRouter['use'];
    get: IRouter['get'];
    head: IRouter['head'];
    post: IRouter['post'];
    put: IRouter['put'];
    _delete: IRouter['_delete'];
    connect: IRouter['connect'];
    options: IRouter['options'];
    trace: IRouter['trace'];
    patch: IRouter['patch'];
    all: IRouter['all'];

    constructor(protected R: IRouter) {
        this.router = R;
        Object.assign(this, this.router);
        this.use = this.router.use.bind(this.router);
        this.get = this.router.get.bind(this.router);
        this.post = this.router.post.bind(this.router);
        this.head = this.router.head.bind(this.router);
        this.put = this.router.put.bind(this.router);
        this._delete = this.router._delete.bind(this.router);
        this.connect = this.router.connect.bind(this.router);
        this.options = this.router.options.bind(this.router);
        this.trace = this.router.trace.bind(this.router);
        this.patch = this.router.patch.bind(this.router);
        this.all = this.router.all.bind(this.router);
    }   
}

// 6. Core Router Functions
function add(method: TMethod, route: string, handler: (req: IReq, res: IRes) => any) {
    routes.push({ method, route, handler });
}

function mw_add(handlerOrRouter: any, path?: string) {
    if (typeof handlerOrRouter === 'function') {
        if (handlerOrRouter.prototype?.router) {
            // Router class constructor
            const instance = new handlerOrRouter(router(path || '/'));
            middlewares.push(...(instance.router.middlewares || []));
            routes.push(...instance.router.routes);
        } else {
            // Middleware function
            middlewares.push({
                handler: handlerOrRouter,
                path
            });
        }
    } else if (typeof handlerOrRouter === 'object') {
        // Router instance - add it directly as middleware
        middlewares.push({
            handler: handlerOrRouter,
            path
        });
    }
}

export function use(
    pathOrHandler: RouterHandler,
    handler?: IRouter | (new (router: IRouter) => { router: IRouter })
) {
    if (typeof pathOrHandler === 'string' && handler) {
        if (typeof handler === 'function' && 'prototype' in handler) {
            let c = {} 
            // Create new router instance with the prefixed base path
            c['instance'] = new handler(router(pathOrHandler));
            mw_add(c['instance'].router, pathOrHandler);
            delete c['instance']
        } else {
            // It's a regular router
            mw_add(handler, pathOrHandler);
        }
    } else if (typeof pathOrHandler === 'function') {
        if ('prototype' in pathOrHandler && pathOrHandler.prototype?.router) {
            // It's a router class constructor
            const instance = new (pathOrHandler as new (router: IRouter) => { router: IRouter })(router('/'));
            middlewares.push({ handler: instance.router });
        } else {
            // It's a regular middleware function
            middlewares.push({ 
                handler: pathOrHandler as ((req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>)
            });
        }
    }
    return router('/');
}

// 7. Router Factory Function
export function router(base: string = '/'): IRouter {
    const routes: Array<{method: string, route: string, handler: (req: IReq, res: IRes) => any}> = [];
    const middlewares: Array<{
        handler: ((req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>) | IRouter,
        path?: string
    }> = [];
    let errorHandler: (req: IReq, res: IRes, err?: Error) => Promise<void>;

    function setErrorHandler_(handler: (req: IReq, res: IRes, err?: Error) => Promise<void>) {
        errorHandler = handler;
    }

    function registerMethod(method: TMethod, route: string, handler: (req: IReq, res: IRes) => any) {
        // Normalize the route path
        route = route.startsWith('/') ? route : '/' + route;
        // route = base === '/' ? route : base + route;
        // If this is a subrouter (base is not '/'), prefix all routes with the base path
        if (base !== '/') {
            // Remove any duplicate slashes and ensure proper path joining
            // ? To prevent things like this:
            // * '/api//v1/.../
            // ?       ^
            const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
            const cleanRoute = route.startsWith('/') ? route : '/' + route;
            route = cleanBase + cleanRoute;
        }

        routes.push({ method, route, handler });
        
        logger.debug(method, route);
        registerRoute(method, route === '/*' ? '*' : route, {
            handler,
            method,
            status: false,
            errorHandler
        });
    }

    function get_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('GET', route, handler);
    }

    function head_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('HEAD', route, handler);
    }

    function post_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('POST', route, handler);
    }

    function put_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('PUT', route, handler);
    }

    function delete_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('DELETE', route, handler);
    }

    function connect_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('CONNECT', route, handler);
    }

    function options_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('OPTIONS', route, handler);
    }

    function trace_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('TRACE', route, handler);
    }

    function patch_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('PATCH', route, handler);
    }

    function all_(route: string, handler: (req: IReq, res: IRes) => any) {
        registerMethod('ALL', route, handler);
    }

    function use_(
        pathOrHandler: RouterHandler,
        handler?: IRouter | (new (router: IRouter) => { router: IRouter })
    ): IRouter {
        if (typeof pathOrHandler === 'string' && handler) {
            const path = pathOrHandler.startsWith('/') ? pathOrHandler : '/' + pathOrHandler;
            
            if (typeof handler === 'function' && 'prototype' in handler) {
                // Class constructor case
                const instance = new handler(router(base + path));
                // Add the router's routes with the correct path prefix
                if (instance.router.routes) {
                    routes.push(...instance.router.routes.map(route => {
                        const routePath = route.route.startsWith('/') ? route.route : '/' + route.route;
                        // Remove any duplicate base paths before concatenating
                        const cleanRoutePath = routePath.replace(base, '').replace(path, '');
                        return {
                            ...route,
                            route: base + path + cleanRoutePath
                        };
                    }));
                }
                middlewares.push({
                    handler: instance.router,
                    path: base + path
                });
            } else {
                // Router instance case
                if ((handler as IRouter).routes) {
                    routes.push(...(handler as IRouter).routes.map(route => {
                        const routePath = route.route.startsWith('/') ? route.route : '/' + route.route;
                        // Remove any duplicate base paths before concatenating
                        const cleanRoutePath = routePath.replace(base, '').replace(path, '');
                        return {
                            ...route,
                            route: base + path + cleanRoutePath
                        };
                    }));
                }
                middlewares.push({
                    handler: handler as IRouter,
                    path: base + path
                });
            }
        } else if (typeof pathOrHandler === 'function') {
            if ('prototype' in pathOrHandler && pathOrHandler.prototype?.router) {
                // Router class constructor without path
                const instance = new (pathOrHandler as new (router: IRouter) => { router: IRouter })(router(base));
                if (instance.router.middlewares) {
                    middlewares.push(...instance.router.middlewares);
                }
                if (instance.router.routes) {
                    routes.push(...instance.router.routes.map(route => ({
                        ...route,
                        route: base + (route.route.startsWith('/') ? route.route : '/' + route.route)
                    })));
                }
            } else {
                // Middleware function
                middlewares.push({
                    handler: pathOrHandler as (req: IReq, res: IRes, next: () => Promise<void>) => Promise<void>
                });
            }
        }

        // Add debug logging for middlewares
        logger.debug('Router middlewares:', {
            base,
            middlewares: middlewares.map(mw => ({
                type: typeof mw.handler === 'function' ? 'function' : 'router',
                path: mw.path || '/',
                isRouter: 'routes' in mw.handler
            }))
        });

        return router(base);
    }

    return {
        routes,
        middlewares,
        errorHandler,
        remap,
        use: use_,
        get: get_,
        head: head_,
        post: post_,
        put: put_,
        _delete: delete_,
        connect: connect_,
        options: options_,
        trace: trace_,
        patch: patch_,
        all: all_,
        setErrorHandler: setErrorHandler_
    };
}
// 8. Route Method Exports
export function get(route: string, handler: (req:IReq, res:IRes) => any) {add('GET', route, handler)}
export function head(route: string, handler: (req:IReq, res:IRes) => any) {add('HEAD', route, handler)}
export function post(route: string, handler: (req:IReq, res:IRes) => any) {add('POST', route, handler)}
export function put(route: string, handler: (req:IReq, res:IRes) => any) {add('PUT', route, handler)}
export function _delete(route: string, handler: (req:IReq, res:IRes) => any) {add('DELETE', route, handler)}
export function connect(route: string, handler: (req:IReq, res:IRes) => any) {add('CONNECT', route, handler)}
export function options(route: string, handler: (req:IReq, res:IRes) => any) {add('OPTIONS', route, handler)}
export function trace(route: string, handler: (req:IReq, res:IRes) => any) {add('TRACE', route, handler)}
export function patch(route: string, handler: (req:IReq, res:IRes) => any) {add('PATCH', route, handler)}
export function all(route: string, handler: (req:IReq, res:IRes) => any) {add('ALL', route, handler)}

// 9. Utility Functions
export function remap(endpoint:string, route:string, method: TMethod) {
    for (const _base of routes) {
        if (_base.route == endpoint) {
            routes.push({ route, handler: _base.handler, method });
            logger.debug(`Remaped '${endpoint}' to '${route}'`);
        }
    }
}

// 10. Server Creation
export function createServer(config?: { notPreserveConfigFlags: boolean }) {
    let notPreserve = false;
    if (!config || !config.notPreserveConfigFlags) notPreserve = false;
    else notPreserve = config.notPreserveConfigFlags;

    return {
        middlewares,
        router, 
        use,
        get,
        head,
        post,
        put,
        _delete,
        connect,
        options,
        trace,
        patch,
        all, 
        listen: (port) => {
            return new Promise(async (res, rej) => {
                try {
                    const server = await HTTP11.createWebServer(routes, middlewares, notPreserve);
                    server.listen(port, (port:number, _) => res({port, _}));
                } catch(e) {
                    console.log(e);
                    rej(e);
                }
            });
        },
        listenSync: async (port: number, cb: (port: number, _) => void) => {
            const server = await HTTP11.createWebServer(routes, middlewares, notPreserve);
            server.listen(port, cb);
        },
        listenH2: (port) => {
            const sslOptions = {
                key: fs.readFileSync('./cert/key.pem'),
                cert: fs.readFileSync('./cert/cert.pem')
            };
            return new Promise(async (res, rej) => {
                try {
                    const server = await HTTP2.createWebServer(routes, middlewares, notPreserve);
                    server.listen(port, (port:number, _) => res({port, _}));
                } catch(e) {
                    console.log(e);
                    rej(e);
                }
            });
        },
        listenSyncH2: async (port: number, cb: (port: number, _) => void) => {
            const sslOptions = {
                key: fs.readFileSync('./cert/key.pem'),
                cert: fs.readFileSync('./cert/cert.pem')
            };
            const server = await HTTP2.createWebServer(routes, middlewares, notPreserve);
            server.listen(port, cb);
        }
    };
}

// 11. Default Export
export const Router = {createServer};
export default Router;