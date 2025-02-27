import * as net from "node:net";
import * as zlib from 'zlib';
import { performance } from 'perf_hooks';

import { status2CodeNStr, EHTTPStatus } from "../shared/httpStatus";
export { EHTTPStatus, status2CodeNStr }

import { registerRoute, getRoute, Routes } from "./Methods";
import { IReq, IRes, IRouter } from "../Router_v3";

import { Logger } from "../shared/logger";

const preciseTiming = true;

const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB limit
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];


const appLogger = new Logger('HTTP_1.1/v4');
// appLogger.setLevel('debug');

const confHeaders = [
  'custom-logger',
  'serverside-force-content-length'
];

function matchRoute(requestPath: string, routePath: string): {matches: boolean, params?: {[key: string]: string}} {
  // Normalize paths by removing trailing slashes
  const normalizedRequest = requestPath.replace(/\/$/, '');
  const normalizedRoute = routePath.replace(/\/$/, '');

  appLogger.debug('Matching route:', { 
    requestPath: normalizedRequest, 
    routePath: normalizedRoute 
  });

  const requestParts = normalizedRequest.split('/');
  const routeParts = normalizedRoute.split('/');

  if (requestParts.length !== routeParts.length) {
    return { matches: false };
  }

  const params: {[key: string]: string} = {};

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      // This is a parameter
      const paramName = routeParts[i].slice(1);
      params[paramName] = requestParts[i];
    } else if (routeParts[i] !== requestParts[i]) {
      return { matches: false };
    }
  }

  return { matches: true, params };
}

interface CORSOptions {
  origin?: string;
  methods?: string;
  credentials?: boolean;
  maxAge?: number;
  allowHeaders?: string;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly window: number;

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.limit = limit;
    this.window = windowMs;
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(time => now - time < this.window);
    
    if (validTimestamps.length >= this.limit) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return true;
  }
}

// const rateLimiter = new RateLimiter();

// Update middleware type to match Router_v2.ts
interface Middleware {
  handler: ((req, res, next) => any) | IRouter;
  path?: string;
}

// First, let's define TMethod if it's not already defined
type TMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'TRACE' | 'CONNECT' | 'ALL';

// Optimize regex patterns by pre-compiling them
const HEADER_REGEX = /^([^:]+):\s*(.+)$/;
const METHOD_PATH_REGEX = /^([A-Z]+)\s+([^\s]+)\s+HTTP\/(\d+\.?\d*)$/;

// Optimize parseCookies with a more efficient implementation
function parseCookies(cookieHeader: string): { [key: string]: string } {
  if (!cookieHeader) return Object.create(null); // Faster than {}
  const cookies = Object.create(null);
  let start = 0;
  let end = 0;

  while ((end = cookieHeader.indexOf(';', start)) > -1) {
    const slice = cookieHeader.slice(start, end);
    const sep = slice.indexOf('=');
    if (sep > -1) {
      cookies[slice.slice(0, sep).trim()] = slice.slice(sep + 1).trim();
    }
    start = end + 1;
  }
  
  // Handle the last cookie
  const slice = cookieHeader.slice(start);
  const sep = slice.indexOf('=');
  if (sep > -1) {
    cookies[slice.slice(0, sep).trim()] = slice.slice(sep + 1).trim();
  }

  return cookies;
}

// Optimize parseHeaders to reduce iterations
function parseHeaders(headerLines: string[]): Record<string, string> {
  const headers = Object.create(null);
  const len = headerLines.length;
  
  for (let i = 0; i < len; i++) {
    const match = HEADER_REGEX.exec(headerLines[i]);
    if (match) {
      headers[match[1].toLowerCase()] = match[2];
    }
  }
  return headers;
}

// Optimize query string parsing
function parseQueryString(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return Object.create(null);
  
  const queries = Object.create(null);
  const queryStr = url.slice(queryIndex + 1);
  let start = 0;
  let end = 0;
  
  while ((end = queryStr.indexOf('&', start)) > -1) {
    const slice = queryStr.slice(start, end);
    const sep = slice.indexOf('=');
    if (sep > -1) {
      queries[slice.slice(0, sep)] = slice.slice(sep + 1);
    }
    start = end + 1;
  }
  
  // Handle the last parameter
  const slice = queryStr.slice(start);
  const sep = slice.indexOf('=');
  if (sep > -1) {
    queries[slice.slice(0, sep)] = slice.slice(sep + 1);
  }

  return queries;
}

export async function createWebServer(requestHandlers: IRequestHandler[], middlewares: Middleware[] = [], dontPreserveConfigHeaders = false) {
  const DPCH = dontPreserveConfigHeaders;
  
  const server = net.createServer();
  server.on("connection", handleConnection);

  if (!Array.isArray(requestHandlers)) {
    throw new Error("[Failed to register requestHandlers]\n-----------\nthe parameter is not an array type\n-----------");
  }

  for (const ReqHandler_ of requestHandlers) {
    if (ReqHandler_.route == undefined || ReqHandler_.handler == undefined) {
      throw new Error(`[Failed to register requestHandler]\n-----------\nHandler of: ${ReqHandler_} is missing some parameters!\n-----------`);
    }
    const { route, status, handler, method } = ReqHandler_;
    const RespObj: IRespObj = status == undefined ? { status: false, handler, method } : { status, handler, method };
    registerRoute(method, route, RespObj);
  }

  let fallback: IRespObj;

  if (!Routes.has("*") && !Routes.has("fallback")) {
    registerRoute('ALL', '*', {
      status: EHTTPStatus.NOT_FOUND,
      handler: function (req, res) {
        appLogger.debug('Fallback route:', {
          method: req.method,
          url: req.url
        });
        // console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("serverside-force-content-length", "true");
        res.setStatus(404);
        res.end(`CANNOT GET '${req.url}', RETURNED 404`);
      },
      method: "ALL"
    });
  }

  const test_star = Routes.has("*");
  const test_fallback = Routes.has("fallback");

  if (test_star) {
    fallback = await getRoute('ALL', '*');
  } else if (test_fallback) {
    fallback = await getRoute('ALL', 'fallback');
  } else {
    console.log("testing fallback routes, failed, starting get-process");
    throw new Error("Failed to auto assign fallback, please contact the developer");
  }

  async function handleConnection(socket: net.Socket): Promise<void> {
    socket.on('error', (err) => {
      console.error('[Socket Error]:', err);
      socket.destroy();
    });
  
  
    // socket.setTimeout(60000); // 60 second timeout
    // socket.on('timeout', () => {
    //   console.warn('[Socket Timeout]: Closing connection');
    //   socket.end();
    // });
  
  
    socket.once("readable", async function () {
      let reqBuffer = Buffer.from("");
      let buf: any;
      let reqHeader: string;
      let reqBody: string;

      while (true) {
        buf = socket.read();
        if (buf === null) break;

        if (reqBuffer.length + buf.length > MAX_REQUEST_SIZE) {
          socket.end('HTTP/1.1 413 Payload Too Large\r\n\r\n');
          return;
        }

        reqBuffer = Buffer.concat([reqBuffer, buf]);
        let marker = reqBuffer.indexOf("\r\n\r\n");
        
        if (marker !== -1) {
          let remaining = reqBuffer.slice(marker + 4);
          reqHeader = reqBuffer.slice(0, marker).toString();
          socket.unshift(remaining);
          reqBody = remaining.toString();
          break;
        }
      }

      if (reqHeader == undefined) return;

      const reqHeaders = reqHeader.split("\r\n");
      const reqLine = reqHeaders.shift().split(" ");
      const headers = reqHeaders.reduce((acc: any, currentHeader: string) => {
        const [key, value] = currentHeader.split(":");
        return {
          ...acc,
          [key.trim().toLowerCase()]: value.trim(),
        };
      }, {});

      if (reqLine.length !== 3 || !reqLine[2].startsWith('HTTP/')) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
      }

      if (!VALID_METHODS.includes(reqLine[0])) {
        socket.end('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
        return;
      }

      function parseQueries(): {[key:string]: string} {
        const url_ = reqLine[1];
        const QueryLine = url_.split("?")[1];
        if (QueryLine == undefined) return;
        
        const queries = QueryLine.split("&");
        let keyval_store: {[key:string]: string} = {};

        for (const query of queries) {
          const [key, val] = query.split("=");
          keyval_store[key] = val;
        }

        return keyval_store;
      }

      const queries = parseQueries();
      const request = {
        method: reqLine[0] as TMethod,  // Cast the string to TMethod
        url: reqLine[1].split("?")[0],
        queries,
        params: {},
        httpVersion: reqLine[2].split("/")[1],
        headers,
        body: reqBody,
        socket,
        cookies: () => parseCookies(headers['cookie'] || ''),
      };

      const stat_ok = status2CodeNStr(200);
      let status = stat_ok.code;
      let statusText = stat_ok.status;
      let headersSent = false;
      let isChunked = false;

      const responseHeaders: Record<string, string | number> = {
        server: "DDRM_NETLIB_HTTP.js",
      };

      const hiddenHeaders: Record<string, string|number> = {};

      function setHeader(key: string, value: string | number) {
        if (DPCH && confHeaders.includes(key)) {
          hiddenHeaders[key.toLowerCase()] = value;
        } else {
          responseHeaders[key.toLowerCase()] = value;
        }
      }

      function sendHeaders() {
        if (!headersSent) {
          headersSent = true;
          response.headersSent = true;
          setHeader("date", new Date().toUTCString());
          socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);

          for (const key of Object.keys(responseHeaders)) {
            socket.write(`${key}: ${responseHeaders[key]}\r\n`);
          }
        }
      }

      const response = {
        headersSent: false,
        
        async write(chunk) {
          if (!headersSent) {
            if (responseHeaders["serverside-force-content-length"] == "true" || hiddenHeaders['serverside-force-content-lenght'] == 'true') {
              setHeader("content-length", chunk ? chunk.length + 1 : 0);
            } else if (!responseHeaders["content-length"]) {
              isChunked = true;
              setHeader("transfer-encoding", "chunked");
            }
            sendHeaders();
          }

          if (isChunked) {
            try {
              const size = chunk.length.toString(16);
              await socket.write(`${size}\r\n`);
              await socket.write(chunk);
              await socket.write("\r\n");
            } catch (e) {
              console.log(e);
            }
          } else {
            await socket.write(chunk);
          }
        },

        async end(chunk) {
          if (!headersSent) {
            if (!responseHeaders["content-length"]) {
              setHeader("content-length", chunk ? chunk.length : 0);
            }
            sendHeaders();
          }

          if (isChunked) {
            if (chunk) {
              const size = chunk.length.toString(16);
              await socket.write(`${size}\r\n`);
              await socket.write(chunk);
              await socket.write("\r\n");
            }
            await socket.end(`0\r\n\r\n`);
          } else {
            await socket.write(`\r\n`);
            await socket.end(chunk);
          }
        },

        setHeader,
        
        setStatus(newStatus: EHTTPStatus | number | string) {
          const stat_ = status2CodeNStr(newStatus);
          status = stat_.code;
          statusText = stat_.status;
        },

        async json(data) {
          if (headersSent) {
            throw new Error("Headers are already sent, cannot send JSON");
          }
          const json = Buffer.from(JSON.stringify(data));
          setHeader("content-type", "application/json; charset=utf-8");
          setHeader("content-length", json.length);
          sendHeaders();
          await socket.end(json);
        },

        setCORS(options: CORSOptions = {}) {
          const {
            origin = '*',
            methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials = false,
            maxAge = 86400,
            allowHeaders = 'Content-Type,Authorization'
          } = options;

          setHeader('Access-Control-Allow-Origin', origin);
          setHeader('Access-Control-Allow-Methods', methods);
          
          if (credentials) {
            setHeader('Access-Control-Allow-Credentials', 'true');
          }
          
          setHeader('Access-Control-Max-Age', maxAge);
          setHeader('Access-Control-Allow-Headers', allowHeaders);
        },

        // Add security headers
        setSecurityHeaders() {
          setHeader('X-Content-Type-Options', 'nosniff');
          setHeader('X-Frame-Options', 'DENY');
          setHeader('X-XSS-Protection', '1; mode=block');
          setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
          setHeader('Content-Security-Policy', "default-src 'self'");
        },

        // Add compression support
        async compress(data: Buffer | string) {
          const acceptEncoding = request.headers['accept-encoding'] || '';
          
          if (acceptEncoding.includes('gzip')) {
            setHeader('Content-Encoding', 'gzip');
            return zlib.gzipSync(data);
          } else if (acceptEncoding.includes('deflate')) {
            setHeader('Content-Encoding', 'deflate');
            return zlib.deflateSync(data);
          }
          
          return data;
        }
      };
      
      // Process middlewares and routes into a single stack
      const stack = [];

      // Add global middlewares first
      middlewares.forEach(mw => {
        if (typeof mw.handler === 'function') {
          stack.push({
            path: '/',  // Global middlewares should match all paths
            handler: mw.handler
          });
        }
      });

      // Then add router middlewares
      middlewares.forEach(mw => {
        if ('routes' in mw.handler) {
          stack.push({
            path: mw.path || '/',
            handler: mw.handler
          });
        }
      });

      let currentMiddlewareIndex = 0;

      const next = async (err?: Error) => {
        if (currentMiddlewareIndex < stack.length) {
          const middleware = stack[currentMiddlewareIndex];
          currentMiddlewareIndex++;

          appLogger.debug('Processing middleware:', {
            index: currentMiddlewareIndex,
            type: typeof middleware.handler,
            isRouter: 'routes' in middleware.handler,
            path: middleware.path,
            requestUrl: request.url
          });

          try {
            await processMiddleware(middleware, request, response, next);
          } catch (err) {
            if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') {
              throw err;
            }
            // Response already sent, stop processing
            return;
          }
        } else {
          // After all middleware, handle the route
          try {
            let matchedRoute = false;
            for (const [route] of Routes.entries()) {
              if (response.headersSent) break;
              
              const match = matchRoute(request.url, route);
              if (match.matches) {
                const r_ = await getRoute(request.method, route);
                if (r_ != null) {
                  request.params = match.params;
                  await r_.handler(request, response);
                  matchedRoute = true;
                  break;
                }
              }
            }
            
            if (!matchedRoute && !response.headersSent) {
              await fallback.handler(request, response);
            }
          } catch (err) {
            if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') {
              throw err;
            }
            // Response already sent, do nothing
          }
        }
      };

      // Start middleware chain
      await next();
    });
  }

  return {
    listen: (port: number, cb: (port: number, _: net.Server) => void) =>
      cb(port, server.listen(port)),
  };
}

export interface IRequestHandler extends IRespObj {
  route: string;
}

export interface IRespObj {
  status?: EHTTPStatus | boolean;
  handler: (req: IReq, res: IRes) => any;
  method: string;
  errorHandler?: (req: IReq, res: IRes, err?: Error) => Promise<void>;
}

interface IPrefKeys {
  get: string;
  post: string;
  all: string;
}

async function processMiddleware(
  middleware: { 
    handler: any, 
    path?: string 
  }, 
  request: IReq, 
  response: IRes, 
  next: () => Promise<void>
) {
  if ('routes' in middleware.handler) {
    const routerBase = middleware.path || '/';
    appLogger.debug('Router debug:', {
      routerBase,
      originalUrl: request.url,
      routes: middleware.handler.routes,
      middlewares: middleware.handler.middlewares
    });
    
    if (request.url.startsWith(routerBase)) {
      try {
        // Process router's own middlewares first
        if (middleware.handler.middlewares) {
          for (const mw of middleware.handler.middlewares) {
            if (response.headersSent) break;
            
            if (typeof mw.handler === 'function') {
              await new Promise<void>((resolve) => {
                mw.handler(request, response, () => {
                  resolve();  // Always resolve, let the middleware decide if it wants to end the response
                });
              });
            } else if ('routes' in mw.handler) {
              // Handle nested router middleware
              await processMiddleware(mw, request, response, () => Promise.resolve());
            }
          }
        }

        if (response.headersSent) return;

        // For route matching, use relative URL
        const relativeUrl = request.url.slice(routerBase.length) || '/';
        
        appLogger.debug('Router matching:', {
          originalUrl: request.url,
          routerBase,
          relativeUrl
        });

        // Check if this router has a nested router that matches the path
        const nestedRoutes = middleware.handler.routes.filter(r => 'use' in r.handler);
        for (const route of nestedRoutes) {
          const routePath = `${routerBase}${route.route}`;
          appLogger.debug('Checking nested router:', {
            routePath,
            requestUrl: request.url
          });
          
          if (request.url.startsWith(routePath)) {
            appLogger.debug('Matched nested router:', {
              routePath,
              requestUrl: request.url
            });
            const nestedRouter = {
              handler: new route.handler(middleware.handler),
              path: routePath
            };
            await processMiddleware(nestedRouter, request, response, next);
            return;
          }
        }

        // If no nested router matched, try regular routes
        const regularRoutes = middleware.handler.routes.filter(r => !('use' in r.handler));
        for (const route of regularRoutes) {
          if (response.headersSent) break;
          
          // Add the base path to the relative URL for matching
          const fullRequestPath = routerBase + relativeUrl;
          const match = matchRoute(fullRequestPath, route.route);
          appLogger.debug('Matching route:', { 
            requestPath: fullRequestPath,  // Changed from relativeUrl
            routePath: route.route 
          });
          
          if (match.matches && (route.method === request.method || route.method === 'ALL')) {
            request.params = match.params;
            appLogger.debug('Route matched:', { 
              requestPath: fullRequestPath,  // Changed from relativeUrl
              routePath: route.route 
            });
            
            try {
              await route.handler(request, response);
              break;
            } catch (err) {
              if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') {
                throw err;
              }
              return;
            }
          }
        }
        
        if (!response.headersSent) {
          await next();
        }
      } catch (err) {
        appLogger.error('Router middleware error:', err);
        if (!response.headersSent) {
          await next();
        }
      }
    } else {
      if (!response.headersSent) {
        await next();
      }
    }
  } else if (typeof middleware.handler === 'function') {
    try {
      if (!response.headersSent) {
        await middleware.handler(request, response, next);
      }
    } catch (err) {
      if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') {
        throw err;
      }
    }
  } else if (!response.headersSent) {
    await next();
  }
}

