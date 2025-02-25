// import './testApp/index'
// import './tests/V1_full/index'

import { Server } from "node:net";
import path from "node:path";
import * as fs from "node:fs";

import * as QDB from "quick.db"
import * as mime from "mime-types"
import Handlebars from "handlebars";

// import { RateLimiter } from "./lib/HTTP_1.1/V4";
import Router, { IReq, IRes, IRouter } from "./lib/Router_v3";
import fmt from "./lib/fmt";

import { Logger } from "./lib/shared/logger";

import "./layouts.hbs"
import { EHTTPStatus, status2CodeNStr } from "./lib/HTTP_Server";

import API from "./routes/api";
import Sockets from "./routes/sockets";
import API2 from "./routes/api2";

export const db = new QDB.QuickDB({
  driver: new QDB.MemoryDriver()
})

const HBSComp = function (input: any, options_?: CompileOptions) {
  const HBComp = Handlebars.compile;
  return function (context: any, options?: RuntimeOptions) {
    try {
      return HBComp(input, options_)(context, options);
    } catch (e) {
      void e;
      return HBComp(
        `${e}<hr/>(You could just define the inline partial in your page and not add any content to it if you don't need it)`,
        options_
      )(context, options);
    }
  };
};

let view_locations = {
  view: (name) => path.join(__dirname, "../", "/views", name),
  static: path.join(__dirname, "../", "/views", "/static"),
};

const appLogger = new Logger('APP')

const app = Router.createServer({
  notPreserveConfigFlags: true
})

// class ebola {
//   protected router: IRouter;
//   constructor(router) {
//     this.router = router;

//     this.router.all('/', this.Index)
//     this.router.all('/0', this.Index)
//     this.router.all('/1', this.Index)
//     this.router.all('/2', this.Index)
//     this.router.all('/3', this.Index)
//   }

//   private async Index(req: IReq, res: IRes) {
//     await res.setHeader('Content-Type', 'application/json');
//     await res.setHeader('serverside-force-content-length', 'true')
//     await res.end(JSON.stringify({
//       ebo: 'la'
//     }))
//   }
// }

// new ebola(app.router('/ebola'))

const main = app.router("/");
const core = app.router("/core")
app.use('/api', API)
app.use('/core', core)
app.use('/sockets', Sockets)
app.use('/api2', new API2().router)

app.use(async (req, res, next) => {
  await res.setHeader('x-powered-by', 'JoeMama')
  await res.setHeader('custom-logger', 'true')
  appLogger.http(`(${req.method}) ${req.url} |`, {...(req.queries)}, {...(req.params)})
  next()
})

// core.use(async (req, res, next) => {
//   console.log('core middleware')
//   await res.setStatus(status2CodeNStr(EHTTPStatus.UNAUTHORIZED).code)
//   await next()
// })

core.all('/', async (req, res) => {
  await res.setHeader('Content-Type', 'text/plain')
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end('core')
})

core.all('/_/:a/:b/:c/:d', async (req, res) => {
  await res.setHeader('Content-Type', 'application/json');
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end(String(JSON.stringify({
    ...(req.params)
  })));
})

// console.log('Registered middlewares:', app.middlewares);  // Add this
// console.log('Core router:', core);  // And this



// api.all('/', async (req, res) => {
//   await res.setHeader('Content-Type', 'application/json');
//   await res.setHeader('serverside-force-content-length', 'true')
//   await res.end(JSON.stringify({
//     code: status2CodeNStr(EHTTPStatus.OK),
//     error: ''
//   }))
// })

// // => /test/<*>/<*>
// main.post('/test/:name/:name2', async (req,res) => {
//   req.params.name;
//   req.params.name2
// })

main.post('/test/macro', async (req, res) => {
  await res.setHeader('Content-Type', 'application/json');
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end(String(JSON.stringify({
    ...(JSON.parse(req.body))
  })));
})

main.get("/test/macro", async (req, res) => {
  await res.setHeader('Content-Type', 'application/json');
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end(String(JSON.stringify({
    ...(req.queries)
  })));
})

main.all('/test/:name', async (req, res) => {
  await res.setHeader('Content-Type', 'application/json');
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end(String(JSON.stringify({
    name: req.params.name
  })));
})

// and this should register the route to /test
main.post('/test', async (req, res) => {
  await res.setHeader('Content-Type', 'application/json');
  await res.setHeader('serverside-force-content-length', 'true')
  await res.end(String(JSON.stringify({
    ...(JSON.parse(req.body))
  })));
})

let addrCount = new Map()

setInterval(() => {
  addrCount.forEach((val,key,map) => {
    addrCount.delete(key)
  })
},5000)

main.all('/', async (req,res) => {
  const doFunnyNumber: boolean = true

  await res.setHeader('Content-Type', 'text/plain')
  await res.setHeader('serverside-force-content-length', 'true')

  // console.log(req.socket.address())

  const sockAddr = req.socket.address()

  // @ts-expect-error
  if (!sockAddr.family || !sockAddr.address || !sockAddr.port) {
    await res.setStatus(EHTTPStatus.INTERNAL_SERVER_ERROR)
    await res.end(JSON.stringify({
      code: status2CodeNStr(EHTTPStatus.INTERNAL_SERVER_ERROR),
      error: 'Something went wrong :!'
    }))
    return
  }

  // @ts-expect-error
  const addr_comb = `${sockAddr.family}://${sockAddr.address}:${sockAddr.port}`

  if (!addrCount.has(addr_comb)) addrCount.set(addr_comb, 0)
  if (addrCount.get(addr_comb) > 10) {
    let responseCode = EHTTPStatus.TOO_MANY_REQUESTS 
    if(doFunnyNumber === true) responseCode = EHTTPStatus.KEEP_YOUR_CALM
    else responseCode = EHTTPStatus.TOO_MANY_REQUESTS

    await res.setStatus(responseCode)
    return await res.end(JSON.stringify({
      code: status2CodeNStr(responseCode),
      error: 'You\'re timed-out because you are sending too many requests :!'
    }))
  } else {
    await res.setStatus(EHTTPStatus.OK)
    await res.end(`Joe mama - oe na na`)
    addrCount.set(addr_comb, addrCount.get(addr_comb) + 1)
  }

})

main.get("/static", async (req, res) => {
  const page = query(req.queries, "page");
  const _page = page == "undefined" || page == "" ? "/" : page;
  const mime_t_ = mime.lookup(_page);
  const mime_t =
    mime_t_ == false
      ? "text/plain"
      : mime_t_ == "text/x-handlebars-template"
      ? "text/html"
      : mime_t_;
  let location = view_locations.static + "/" + _page;
  // if (location.endsWith('//')) location.replace('//', '/') 
  try {
    await res.setHeader("Content-Type", mime_t);
    await res.setHeader("serverside-force-content-length", "true");
    let page__:string|Buffer = "";
    if (String(_page).endsWith("/")) page__ = Folder();
    else page__ = mime_t.startsWith('text') ? fs.readFileSync(location).toString() : fs.readFileSync(location);
    function Folder() {
      
      let folder = fs.readdirSync(location);
      res.setHeader("Content-Type", "text/html");
      if (folder.includes("index.html"))
        return fs.readFileSync(location + "index.html").toString();
      else if (folder.includes("index.hbs"))
        return HBSComp(fs.readFileSync(location + "index.hbs").toString())({});
      else {
        let string = ``;
        for (const file of folder) {
          try {
            const folder2 = fs.readdirSync(path.join(location, file));
            void folder2;
            string += `<a data-link-static href="/static?page=${_page}${file}/"><div>/${file}/</div></a><hr/>`;
          } catch (e) {
            string += `<a data-link-static href="/static?page=${_page}${file}"><div>/${file}</div></a><hr/>`;
            void e;
          }
        }
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="/static?page=/assets/css/base.css">

    <script src="/static?page=/assets/setup.js" type="module" defer></script>
</head>
<body>
    ${string}
</body>
</html>`;
      }
    }
    if (String(_page).endsWith(".hbs")) await res.end(HBSComp(page__)({}));
    else await res.end(page__);
  } catch (e) {
    await res.setHeader("Content-Type", "text/plain");
    await res.setHeader("serverside-force-content-length", "true");
    await res.setStatus(404);
    await res.end(
      `CANNOT GET '${req.url}', RETURNED 404\n------------------\n${e}`
    );
  }
});

main.all('*', async (req, res) => {
  await res.setHeader('Content-Type', 'application/json')
  await res.setHeader('serverside-force-content-length', 'true')

  await res.setStatus(EHTTPStatus.NOT_FOUND)

  await res.end(JSON.stringify({
    code: status2CodeNStr(EHTTPStatus.NOT_FOUND),
    error: 'could not find the resource you were looking for :('
  }))
})

app.listen(5000).then(({port, _}: {port:number, _: Server}) => {
  console.log("server running on: ", port)
})

// app.listenH2(5001).then(({port, _}: {port:number, _: Server}) => {
//   console.log("server running on: (H2)", port)
// })




function query(queries: {[key:string]:string}, key: string) {
  let result
  // console.log(queries, key)
  if (queries == undefined) return result = "undefined"
  let q = queries[key];
  // console.log(q)
  if (q == undefined) return result = "undefined"
  else return result = q
  // return result
}