// import './tests/V1_full/index'

import { Server } from "node:net";
import path from "node:path";
import * as fs from "node:fs";

import * as QDB from "quick.db";
import * as mime from "mime-types";
import Handlebars from "handlebars";

import Router, { IReq, IRes, IRouter } from "../lib/Router";
import fmt from "../lib/fmt";

import { Logger } from "../lib/shared/logger";

import "./layouts.hbs";
import { EHTTPStatus, status2CodeNStr } from "../lib/HTTP_Server";
import { timeStamp } from "node:console";

const appLogger = new Logger("APP");

const app = Router.createServer({
  notPreserveConfigFlags: true,
});

app.use(async (req, res) => {
  await res.setHeader('x-powered-by', 'JoeMama')
  await res.setHeader('custom-logger', 'true')
  if (req.url.startsWith('/sockets')) return
  appLogger.http(`(${req.method}) ${req.url} |`, {...(req.queries)})
})

// import { resolveLayouts } from "./layouts.hbs";

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

const { MemoryDriver, JSONDriver, QuickDB } = QDB;

const memDriver = new MemoryDriver();
const jsonDriver = new JSONDriver();

const db0 = new QuickDB({ driver: memDriver });
const db1 = new QuickDB({ driver: jsonDriver });

(async () => {
  await db0.init();
  await db1.init();

  // resolveLayouts()
})();

export function findMap(array: any[], by: string, id: any) {
  console.log(by, id);

  let Target = 0;
  array.forEach((item, index) => {
    if (item["value"][by] == id) return (Target = index);
    else return;
  });
  return Target;
}

/**
 * @name "mkRandStr2"
 * @comment "Generates an random string with the given characters"
 * @author "xA_Emiloetjex"
 */
export function mkRandStr2(length: number, chars: string): string {
  let result = "";
  const characters = chars;
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const general = db0.table("general");

let uniqueStore = {
  includes: async (store: string, str: any) => {
    const arr = await general.get(store);
    if (arr === null) return false;
    else if (arr.includes(str)) return true;
    else return false;
  },
  push: async (store: string, str: any) => {
    try {
      await general.push(store, str);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },
  remove: async (store: string, item: string) => {
    try {
      const old = await general.get(store);
      let new_ = [];
      for (const _item of old) {
        if (_item !== item) new_.push(_item);
      }
      general.set(store, new_);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },
};

export async function UniqueGen(
  generator: (length: number) => string,
  length: number,
  store: string
) {
  // console.log(uniqueStore)
  const newGen = generator(length);
  if (await uniqueStore.includes(store, newGen))
    return UniqueGen(generator, length, store);
  else {
    await uniqueStore.push(store, newGen);
    return newGen;
  }
}

const main = app.router("/");
const main2 = app.router("/_");
const core = app.router("/core");

let wsQueue: {
    id: string;
    timestamp: number;
    item: { key: string; data: { [key: string]: any } };
  }[] = new Array();
class WebSockets {
  public Queue = wsQueue

  protected router: IRouter;
  constructor(router) {
    this.router = router;

    this.router.all("/polling", this.fetchPolling);

    setInterval(this.cleanUp, 2000);
  }

  public async setQueueItem(key: string, data: { [key: string]: any }) {
    const id = await UniqueGen(
      (length: number) => mkRandStr2(length, "acbdef1234567890"),
      16,
      "QueueItemIDs"
    );
    const timestamp = Date.now();
    wsQueue.push({
        id,
        timestamp,
        item: {key,data}
    })
  }

  private cleanUp() {
    const now = Date.now()
    let new_ = []
    // for (const item of this.Queue) {
    //     if (item.timestamp < now - 10000) {
    //         uniqueStore.remove('QueueItemIDs', item.id)
    //     } else new_.push(item)
    // }
    // console.log(wsQueue)
    wsQueue.forEach((item,indx)=>{
        if (item.timestamp < now - 10000) {
            uniqueStore.remove('QueueItemIDs', item.id)
        } else new_.push(item)
    })
    wsQueue = new_
  }

  private readQueue() {}

  private async fetchPolling(req: IReq, res: IRes) {
    await res.setHeader("Content-Type", "application/json");
    await res.setHeader("serverside-force-content-length", "true");
    await res.end(JSON.stringify({items: wsQueue}));
  }

  // private async Index(req: IReq, res: IRes) {
  //   await res.setHeader('Content-Type', 'application/json');
  //   await res.setHeader('serverside-force-content-length', 'true')
  //   await res.end(JSON.stringify({
  //     ebo: 'la'
  //   }))
  // }
}

const WS = new WebSockets(app.router("/sockets"));

setInterval(() => {
    // console.log(WS.Queue)
    WS.setQueueItem('test_ping', {timeStamp: Date.now()})
}, 1000)

let view_locations = {
  views: path.join(__dirname, "../", "../", "/views"),
  view: (name) => path.join(__dirname, "../", "../", "/views", name),
  index: path.join(__dirname, "../", "../", "/views", "/index.net.html"),
  static: path.join(__dirname, "../", "../", "/views", "/static"),
  assets: path.join(__dirname, "../", "../", "/views", "/assets"),
  css: path.join(__dirname, "../", "../", "/views", "/assets", "/css"),
  scss: path.join(__dirname, "../", "../", "/views", "/assets", "/scss"),
  asset: (name, folder?) => {
    // console.log(folder)
    let path_ = "./";
    if (folder == "assets")
      return (path_ = path.join(
        __dirname,
        "../",
        "../",
        "/views",
        "/assets",
        name
      ));
    else if (folder == "css")
      return (path_ = path.join(
        __dirname,
        "../",
        "../",
        "/views",
        "/assets",
        "/css",
        name
      ));
    else if (folder == "scss")
      return (path_ = path.join(
        __dirname,
        "../",
        "../",
        "/views",
        "/assets",
        "/scss",
        name
      ));
    else path_ = path.join(__dirname, "../", "../", "/views", "/assets", name);
    return path_;
  },
};

let views = {
  index: "NULL",
  hbtest: "NULL",
  hbtest2: "NULL",
  hbsIndex: 'NULL'
};

function reloadAssets() {
  const assets_f = ["assets", "css", "scss"];
  console.log("[appUtils.reloader.assets]: Trying to reload Assets...");
  const assets = app.router("/assets");
  for (const folder of assets_f) {
    const assetsFolder = fs.readdirSync(view_locations[folder]);

    const folder_ = folder == "assets" ? "" : folder + "/";

    // console.log(folder, view_locations.asset("base.css", folder))
    for (let asset_ of assetsFolder) {
      let mimetype = mime.lookup(asset_);
      // fs.stat(view_locations.asset(asset_, folder), (err, stats) => {})
      assets.get("/" + folder_ + asset_, async (req, res) => {
        if (
          String(req.url).endsWith("/css") ||
          String(req.url).endsWith("/scss")
        ) {
          await res.setHeader("Content-Type", "text/plain");
          await res.setHeader("serverside-force-content-length", "true");
          return await res.end("Requested file is a directory!");
        }

        if (String(asset_).endsWith("css")) mimetype = "text/css";
        if (String(asset_).endsWith("js")) mimetype = "text/javascript";

        await res.setHeader("Content-Type", <any>mimetype);
        await res.setHeader("serverside-force-content-length", "true");

        let contents = fs.readFileSync(view_locations.asset(asset_, folder));

        // if(mimetype == "text/javascript") console.log(`(JS_HANDLER) Requested:`, {urlOf: req.url}, `\nAttempting to send file:`, {
        //     mimetypeOf: mimetype,
        //     nameOf: asset_,
        //     pathOf: view_locations.asset(asset_),
        //     contentsOf: contents.toString()
        // })
        await res.end(contents);
      });
      // main.remap(`/assets/${asset_}`, `/${asset_}`, "GET")
    }
  }
  console.log("[appUtils.reloader.assets]: Finished reload attempt!");
}

function reloadRoutes() {
  console.log("[appUtils.reloader]: Trying to reload Views...");
  reloadAssets();
  views = {
    index: fs.readFileSync(view_locations.index).toString(),
    hbtest: fs.readFileSync(view_locations.view("hb.test.hbs")).toString(),
    hbtest2: fs.readFileSync(view_locations.view("hb2.test.hbs")).toString(),
    hbsIndex: fs.readFileSync(view_locations.view('index.hbs')).toString()
  };
  console.log("[appUtils.reloader]: Finished reload attempt!");
  return views;
}

reloadRoutes();

core.get("/reloadRoutes", async (req, res) => {
  await res.setHeader("Content-Type", "application/json");
  await res.setHeader("serverside-force-content-length", "true");
  await res.end(String(JSON.stringify(reloadRoutes())));
});

let user_mutable = (async () => await db1.get("user_mutable"))();

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
  const location = view_locations.static + "/" + _page;
  try {
    await res.setHeader("Content-Type", mime_t);
    await res.setHeader("serverside-force-content-length", "true");
    let page__ = "";
    if (String(_page).endsWith("/")) page__ = Folder();
    else page__ = fs.readFileSync(location).toString();
    function Folder() {
      const folder = fs.readdirSync(location);
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
    <link rel="stylesheet" href="/assets/css/base.css">

    <script src="/assets/setup.js" type="module" defer></script>
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

main.get("/", async (req, res) => {
    await res.setHeader('Content-Type', 'text/html');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(HBSComp(views.hbsIndex)({}));
})

app.all("fallback", async (req, res) => {
  await res.setHeader("Content-Type", "text/plain");
  await res.setHeader("serverside-force-content-length", "true");
  await res.setStatus(404);
  await res.end(`CANNOT GET '${req.url}', RETURNED 404`);
});

app.listen(5000).then(({ port, _ }: any) => {
  console.log("server running on: ", port);
});

function query(queries: { [key: string]: string }, key: string) {
  let result;
  // console.log(queries, key)
  if (queries == undefined) return (result = "undefined");
  let q = queries[key];
  // console.log(q)
  if (q == undefined) result = "undefined";
  else result = q;
  return result;
}
