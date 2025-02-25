import Router, { IReq, IRes, IRouter, RouterClass } from "../../../lib/Router_v3";
import { Logger } from "../../../lib/shared/logger";
import { EHTTPStatus, status2CodeNStr } from "../../../lib/HTTP_Server";

const logger = new Logger('APIRouter');

export default class API_Test2 {
    public router: IRouter;

    private mw: Test2_Middleware;
    private routes: Test2_Routes;

    constructor(R: IRouter) {
        this.router = R;

        this.mw = new Test2_Middleware(this.router);
        this.routes = new Test2_Routes(this.router);

        // this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
        //     await this.corsMiddleware(req, res, next);
        // });

        // this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
        //     await this.RateLimiter(req, res, next);
        // });

        // this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
        //     console.log('/api/test/test2');
        //     await res.setStatus(500);
        //     await next();
        // });

        // this.router.use(this.mw.mw1);

        // Error handling
        this.router.setErrorHandler(this.handleError);

        // Initialize routes
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.routes.index);
        this.router.get('/example', this.exampleRoute);
    }

    private async handleError(req: IReq, res: IRes, err?: Error,): Promise<void> {
        logger.error(`API Error: ${err.message}`);

        const { code, status, EHTTPStatus_val } = status2CodeNStr(EHTTPStatus.INTERNAL_SERVER_ERROR);
        await res.setHeader('content-type', 'application/json')
        await res.setStatus(code)
        await res.end(JSON.stringify({
            error: {
                code,
                status: status,
                message: err ? err.message : 'Internal Server Error'
            }
        }))
    }

    // Example route handler
    private async exampleRoute(req: IReq, res: IRes): Promise<void> {
        await res.setHeader('content-type', 'application/json')
        // res.json({ message: 'API is working!' });
        await res.end(JSON.stringify({ message: 'API is working!dfhdfhfdh' }));
    }
}

export class Test2_Middleware {
    public router: IRouter;

    constructor(R: IRouter) {
        this.router = R;
    }

    // public async mw1(req: IReq, res: IRes, next: () => Promise<void>): Promise<void> {
    //     console.log('mw1');
    //     await next();
    // }
}

export class Test2_Routes {
    public router: IRouter;

    constructor(R: IRouter) {
        this.router = R;
    }

    public async index(req: IReq, res: IRes): Promise<void> {
        await res.setHeader('content-type', 'application/json')
        await res.end(JSON.stringify({ message: 'api.test.test2.index!' }));
    }
}