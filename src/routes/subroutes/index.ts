// // ROUTER EXAMPLE

// import Router, { IReq, IRes, IRouter } from "../../lib/Router";
// import { Logger } from "../../lib/shared/logger";
// import { EHTTPStatus, status2CodeNStr } from "../../lib/HTTP_Server";
// import { RouterClass } from "../../lib/Router_v2";
// import { IRouter as IRouterV2 } from "../../lib/Router_v2";

// const logger = new Logger('APIRouter');

// export default class API implements RouterClass {
//     public router: IRouterV2;

//     remap: IRouterV2['remap'];
//     use: IRouterV2['use'];
//     get: IRouterV2['get'];
//     head: IRouterV2['head'];
//     post: IRouterV2['post'];
//     put: IRouterV2['put'];
//     _delete: IRouterV2['_delete'];
//     connect: IRouterV2['connect'];
//     options: IRouterV2['options'];
//     trace: IRouterV2['trace'];
//     patch: IRouterV2['patch'];
//     all: IRouterV2['all'];

//     constructor(protected R: IRouterV2) {
//         this.router = R;

//         Object.assign(this, this.router);
//         // Middleware
//         // this.router.use(this.logRequest);
//         this.router.use(async (req, res, next) => {
//             console.log('/api')
//             await next()
//         })
//         // Error handling
//         this.router.setErrorHandler(this.handleError);

//         // Initialize routes
//         this.initializeRoutes();
//     }

//     private initializeRoutes(): void {
//         // Add your routes here
//         this.router.get('/example', this.exampleRoute);
//         // this.router.post('/auth', this.handleAuth);
//         // etc...
//     }

//     private async handleError(req: IReq, res: IRes, err?: Error,): Promise<void> {
//         logger.error(`API Error: ${err.message}`);

//         const { code, status, EHTTPStatus_val } = status2CodeNStr(EHTTPStatus.INTERNAL_SERVER_ERROR);
//         await res.setHeader('content-type', 'application/json')
//         await res.setStatus(EHTTPStatus.INTERNAL_SERVER_ERROR)
//         await res.end(JSON.stringify({
//             error: {
//                 code,
//                 status: status,
//                 message: err ? err.message : 'Internal Server Error'
//             }
//         }))
//     }

//     // Example route handler
//     private async exampleRoute(req: IReq, res: IRes): Promise<void> {
//         await res.setHeader('content-type', 'application/json')
//         // res.json({ message: 'API is working!' });
//         await res.end(JSON.stringify({ message: 'API is working!' }));
//     }
// }
