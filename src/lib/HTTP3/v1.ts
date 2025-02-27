// import * as net from "node:net";
// import * as zlib from 'zlib';
// import { QUICServer, QUICSocket, QUICStream } from '@matrixai/quic';
// import { EventEmitter } from '@matrixai/events';
// import { performance } from 'perf_hooks';

// import { status2CodeNStr, EHTTPStatus } from "../shared/httpStatus";
// export { EHTTPStatus, status2CodeNStr }

// import { registerRoute, getRoute, Routes } from "./Methods";

// const preciseTiming = true;

// const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB limit
// const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];


// const confHeaders = [
//   'custom-logger',
//   'serverside-force-content-length'
// ];

// function matchRoute(requestPath: string, routePath: string): {matches: boolean, params?: {[key: string]: string}} {
//   const requestParts = requestPath.split('/');
//   const routeParts = routePath.split('/');

//   if (requestParts.length !== routeParts.length) {
//     return { matches: false };
//   }

//   const params: {[key: string]: string} = {};

//   for (let i = 0; i < routeParts.length; i++) {
//     if (routeParts[i].startsWith(':')) {
//       // This is a parameter
//       const paramName = routeParts[i].slice(1);
//       params[paramName] = requestParts[i];
//     } else if (routeParts[i] !== requestParts[i]) {
//       return { matches: false };
//     }
//   }

//   return { matches: true, params };
// }

// interface CORSOptions {
//   origin?: string;
//   methods?: string;
//   credentials?: boolean;
//   maxAge?: number;
//   allowHeaders?: string;
// }

// export class RateLimiter {
//   private requests: Map<string, number[]> = new Map();
//   private readonly limit: number;
//   private readonly window: number;

//   constructor(limit: number = 100, windowMs: number = 60000) {
//     this.limit = limit;
//     this.window = windowMs;
//   }

//   isAllowed(ip: string): boolean {
//     const now = Date.now();
//     const timestamps = this.requests.get(ip) || [];
    
//     // Remove old timestamps
//     const validTimestamps = timestamps.filter(time => now - time < this.window);
    
//     if (validTimestamps.length >= this.limit) {
//       return false;
//     }
    
//     validTimestamps.push(now);
//     this.requests.set(ip, validTimestamps);
//     return true;
//   }
// }

// // const rateLimiter = new RateLimiter();

// // Add new HTTP/3 specific constants
// const HTTP3_ALPN = 'h3';
// const DEFAULT_IDLE_TIMEOUT = 30000;

// // Modify createWebServer to support both HTTP/1.1 and HTTP/3
// export async function createWebServer(
//   requestHandlers: IRequestHandler[], 
//   middlewares: any[] = [], 
//   options: {
//     dontPreserveConfigHeaders?: boolean,
//     cert?: Buffer,
//     key?: Buffer,
//     http3?: boolean
//   } = {}
// ) {
//   const DPCH = options.dontPreserveConfigHeaders;
  
//   // Create both HTTP/1.1 and HTTP/3 servers if needed
//   const http1Server = net.createServer();
//   let http3Server: QUICServer | null = null;

//   if (options.http3 && options.cert && options.key) {
//     http3Server = new QUICServer({
//       key: options.key,
//       cert: options.cert,
//       alpn: [HTTP3_ALPN],
//       idleTimeout: DEFAULT_IDLE_TIMEOUT
//     });

//     // Handle HTTP/3 connections
//     http3Server.on('connection', async (quicSocket: QUICSocket) => {
//       quicSocket.on('stream', async (stream: QUICStream) => {
//         await handleHttp3Stream(stream);
//       });
//     });
//   }

//   if (!Array.isArray(requestHandlers)) {
//     throw new Error("[Failed to register requestHandlers]\n-----------\nthe parameter is not an array type\n-----------");
//   }

//   for (const ReqHandler_ of requestHandlers) {
//     if (ReqHandler_.route == undefined || ReqHandler_.handler == undefined) {
//       throw new Error(`[Failed to register requestHandler]\n-----------\nHandler of: ${ReqHandler_} is missing some parameters!\n-----------`);
//     }
//     const { route, status, handler, method } = ReqHandler_;
//     const RespObj: IRespObj = status == undefined ? { status: false, handler, method } : { status, handler, method };
//     registerRoute(method, route, RespObj);
//   }

//   let fallback: IRespObj;

//   if (!Routes.has("*") && !Routes.has("fallback")) {
//     registerRoute('ALL', '*', {
//       status: EHTTPStatus.NOT_FOUND,
//       handler: function (req, res) {
//         console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
//         res.setHeader("Content-Type", "text/plain");
//         res.setHeader("serverside-force-content-length", "true");
//         res.setStatus(404);
//         res.end(`CANNOT GET '${req.url}', RETURNED 404`);
//       },
//       method: "ALL"
//     });
//   }

//   const test_star = Routes.has("*");
//   const test_fallback = Routes.has("fallback");

//   if (test_star) {
//     fallback = await getRoute('ALL', '*');
//   } else if (test_fallback) {
//     fallback = await getRoute('ALL', 'fallback');
//   } else {
//     console.log("testing fallback routes, failed, starting get-process");
//     throw new Error("Failed to auto assign fallback, please contact the developer");
//   }

//   // New HTTP/3 stream handler
//   async function handleHttp3Stream(stream: QUICStream): Promise<void> {
//     // Create HTTP/3 frame parser
//     const frameParser = new EventEmitter();
    
//     stream.on('data', (data) => {
//       // Parse HTTP/3 frames and emit corresponding events
//       // This is a simplified version - you'll need proper HTTP/3 frame parsing
//       try {
//         const request = parseHttp3Request(data);
//         handleRequest(request, createHttp3Response(stream));
//       } catch (err) {
//         console.error('[HTTP/3 Parse Error]:', err);
//         stream.end();
//       }
//     });
//   }

//   // Modify existing handleConnection for HTTP/1.1
//   async function handleConnection(socket: net.Socket): Promise<void> {
//     socket.on('error', (err) => {
//       console.error('[Socket Error]:', err);
//       socket.destroy();
//     });
  
  
//     // socket.setTimeout(60000); // 60 second timeout
//     // socket.on('timeout', () => {
//     //   console.warn('[Socket Timeout]: Closing connection');
//     //   socket.end();
//     // });
  
  
//     socket.once("readable", async function () {
//       let reqBuffer = Buffer.from("");
//       let buf: any;
//       let reqHeader: string;
//       let reqBody: string;

//       while (true) {
//         buf = socket.read();
//         if (buf === null) break;

//         if (reqBuffer.length + buf.length > MAX_REQUEST_SIZE) {
//           socket.end('HTTP/1.1 413 Payload Too Large\r\n\r\n');
//           return;
//         }

//         reqBuffer = Buffer.concat([reqBuffer, buf]);
//         let marker = reqBuffer.indexOf("\r\n\r\n");
        
//         if (marker !== -1) {
//           let remaining = reqBuffer.slice(marker + 4);
//           reqHeader = reqBuffer.slice(0, marker).toString();
//           socket.unshift(remaining);
//           reqBody = remaining.toString();
//           break;
//         }
//       }

//       if (reqHeader == undefined) return;

//       const reqHeaders = reqHeader.split("\r\n");
//       const reqLine = reqHeaders.shift().split(" ");
//       const headers = reqHeaders.reduce((acc: any, currentHeader: string) => {
//         const [key, value] = currentHeader.split(":");
//         return {
//           ...acc,
//           [key.trim().toLowerCase()]: value.trim(),
//         };
//       }, {});

//       if (reqLine.length !== 3 || !reqLine[2].startsWith('HTTP/')) {
//         socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
//         return;
//       }

//       if (!VALID_METHODS.includes(reqLine[0])) {
//         socket.end('HTTP/1.1 405 Method Not Allowed\r\n\r\n');
//         return;
//       }

//       function parseQueries(): {[key:string]: string} {
//         const url_ = reqLine[1];
//         const QueryLine = url_.split("?")[1];
//         if (QueryLine == undefined) return;
        
//         const queries = QueryLine.split("&");
//         let keyval_store: {[key:string]: string} = {};

//         for (const query of queries) {
//           const [key, val] = query.split("=");
//           keyval_store[key] = val;
//         }

//         return keyval_store;
//       }

//       const queries = parseQueries();
//       const request = {
//         method: reqLine[0],
//         url: reqLine[1].split("?")[0],
//         queries,
//         params: {},
//         httpVersion: reqLine[2].split("/")[1],
//         headers,
//         body: reqBody,
//         socket,
//       };

//       const stat_ok = status2CodeNStr(200);
//       let status = stat_ok.code;
//       let statusText = stat_ok.status;
//       let headersSent = false;
//       let isChunked = false;

//       const responseHeaders: Record<string, string | number> = {
//         server: "DDRM_NETLIB_HTTP",
//       };

//       const hiddenHeaders: Record<string, string|number> = {};

//       function setHeader(key: string, value: string | number) {
//         if (DPCH && confHeaders.includes(key)) {
//           hiddenHeaders[key.toLowerCase()] = value;
//         } else {
//           responseHeaders[key.toLowerCase()] = value;
//         }
//       }

//       function sendHeaders() {
//         if (!headersSent) {
//           headersSent = true;
//           setHeader("date", new Date().toUTCString());
//           socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);

//           for (const key of Object.keys(responseHeaders)) {
//             socket.write(`${key}: ${responseHeaders[key]}\r\n`);
//           }
//         }
//       }

//       const response = {
//         async write(chunk) {
//           if (!headersSent) {
//             if (responseHeaders["serverside-force-content-length"] == "true" || hiddenHeaders['serverside-force-content-lenght'] == 'true') {
//               setHeader("content-length", chunk ? chunk.length + 1 : 0);
//             } else if (!responseHeaders["content-length"]) {
//               isChunked = true;
//               setHeader("transfer-encoding", "chunked");
//             }
//             sendHeaders();
//           }

//           if (isChunked) {
//             try {
//               const size = chunk.length.toString(16);
//               await socket.write(`${size}\r\n`);
//               await socket.write(chunk);
//               await socket.write("\r\n");
//             } catch (e) {
//               console.log(e);
//             }
//           } else {
//             await socket.write(chunk);
//           }
//         },

//         async end(chunk) {
//           if (!headersSent) {
//             if (!responseHeaders["content-length"]) {
//               setHeader("content-length", chunk ? chunk.length : 0);
//             }
//             sendHeaders();
//           }

//           if (isChunked) {
//             if (chunk) {
//               const size = chunk.length.toString(16);
//               await socket.write(`${size}\r\n`);
//               await socket.write(chunk);
//               await socket.write("\r\n");
//             }
//             await socket.end(`0\r\n\r\n`);
//           } else {
//             await socket.write(`\r\n`);
//             await socket.end(chunk);
//           }
//         },

//         setHeader,
        
//         setStatus(newStatus: EHTTPStatus | number | string) {
//           const stat_ = status2CodeNStr(newStatus);
//           status = stat_.code;
//           statusText = stat_.status;
//         },

//         async json(data) {
//           if (headersSent) {
//             throw new Error("Headers are already sent, cannot send JSON");
//           }
//           const json = Buffer.from(JSON.stringify(data));
//           setHeader("content-type", "application/json; charset=utf-8");
//           setHeader("content-length", json.length);
//           sendHeaders();
//           await socket.end(json);
//         },

//         setCORS(options: CORSOptions = {}) {
//           const {
//             origin = '*',
//             methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
//             credentials = false,
//             maxAge = 86400,
//             allowHeaders = 'Content-Type,Authorization'
//           } = options;

//           setHeader('Access-Control-Allow-Origin', origin);
//           setHeader('Access-Control-Allow-Methods', methods);
          
//           if (credentials) {
//             setHeader('Access-Control-Allow-Credentials', 'true');
//           }
          
//           setHeader('Access-Control-Max-Age', maxAge);
//           setHeader('Access-Control-Allow-Headers', allowHeaders);
//         },

//         // Add security headers
//         setSecurityHeaders() {
//           setHeader('X-Content-Type-Options', 'nosniff');
//           setHeader('X-Frame-Options', 'DENY');
//           setHeader('X-XSS-Protection', '1; mode=block');
//           setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
//           setHeader('Content-Security-Policy', "default-src 'self'");
//         },

//         // Add compression support
//         async compress(data: Buffer | string) {
//           const acceptEncoding = request.headers['accept-encoding'] || '';
          
//           if (acceptEncoding.includes('gzip')) {
//             setHeader('Content-Encoding', 'gzip');
//             return zlib.gzipSync(data);
//           } else if (acceptEncoding.includes('deflate')) {
//             setHeader('Content-Encoding', 'deflate');
//             return zlib.deflateSync(data);
//           }
          
//           return data;
//         }
//       };
      
//       let currentMiddlewareIndex = 0;

//       const next = async () => {
//         if (currentMiddlewareIndex < middlewares.length) {
//           const middleware = middlewares[currentMiddlewareIndex];
//           currentMiddlewareIndex++;
//           await middleware.handler(request, response, next);
//         } else {
//           // After all middleware, handle the route
//           let matchedRoute = false;
//           for (const [route] of Routes.entries()) {
//             const match = matchRoute(request.url, route);
//             if (match.matches) {
//               const r_ = await getRoute(request.method, route);
//               if (r_ != null) {
//                 request.params = match.params;
//                 await r_.handler(request, response);
//                 matchedRoute = true;
//                 break;
//               }
//             }
//           }
          
//           if (!matchedRoute) {
//             await fallback.handler(request, response);
//           }
//         }
//       };

//       // Start middleware chain
//       await next();
//     });
//   }

//   // Helper to create HTTP/3 response object
//   function createHttp3Response(stream: QUICStream) {
//     return {
//       async write(chunk) {
//         // Implement HTTP/3 specific write logic
//         await stream.write(chunk);
//       },
      
//       async end(chunk) {
//         if (chunk) await stream.write(chunk);
//         await stream.end();
//       },

//       // ... rest of response methods adapted for HTTP/3 ...
//     };
//   }

//   // Return both servers
//   return {
//     listen: async (port: number, cb: (port: number, servers: any) => void) => {
//       const servers = {
//         http1: http1Server.listen(port),
//         http3: options.http3 ? await http3Server.listen(port + 1) : null
//       };
//       cb(port, servers);
//     },
    
//     close: async () => {
//       await new Promise(resolve => http1Server.close(resolve));
//       if (http3Server) {
//         await http3Server.close();
//       }
//     }
//   };
// }

// export interface IRequestHandler extends IRespObj {
//   route: string;
// }

// export interface IRespObj {
//   status?: EHTTPStatus | boolean;
//   handler: (req, res) => any;
//   method: string;
// }

// interface IPrefKeys {
//   get: string;
//   post: string;
//   all: string;
// }

// // Add HTTP/3 specific types and helpers
// interface Http3Frame {
//   type: number;
//   payload: Buffer;
// }

// function parseHttp3Request(data: Buffer) {
//   // Implement HTTP/3 frame parsing
//   // This is a placeholder - you'll need proper HTTP/3 frame parsing logic
//   return {
//     // ... parsed request object
//   };
// }