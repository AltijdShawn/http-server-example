// ROUTER EXAMPLE
import Router, { IReq, IRes, IRouter, RouterClass } from "../../../lib/Router_v3";
import { Logger } from "../../../lib/shared/logger";
import { EHTTPStatus, status2CodeNStr } from "../../../lib/HTTP_Server";
import API_Test2 from "./test2";

const logger = new Logger('APIRouter');

// const APIRateLimiter = new RateLimiter(128, 60000)
// const APIRateLimiter = new RateLimiter(1, 60000)

// import { db as db_ } from "../../../index";
import { QuickDB, MemoryDriver } from "quick.db";

const db_ = new QuickDB({
    driver: new MemoryDriver()
})

const db = db_.table('API_Routes');

db.set(`recursion.iteration`, 0);

export default class Recursion {
    public router: IRouter;
    public iteration: number;

    constructor(R: IRouter) {
        this.router = R;

        this.getIteration();

        // Error handling
        this.router.setErrorHandler(this.handleError);

        // Initialize routes
        this.initializeRoutes();
    }

    private async getIteration() {
        logger.debug(`DUMP: ${this.iteration}`, await db.all());

        await db.set(
            `recursion.iteration`, 
            Number(await db.get(`recursion.iteration`) || 0) + 1
        );
        this.iteration = Number(await db.get(`recursion.iteration`));

        logger.debug(`DUMP: ${this.iteration}`, await db.all());
    }

    private initializeRoutes(): void {
        // this.router.use('/test2', API_Test2);
        
        if (this.iteration <= 10) this.router.use(`/re_${this.iteration}`, Recursion);
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
        await res.end(JSON.stringify({ message: 'API is working!' }));
    }
}
