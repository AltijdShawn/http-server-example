import Router from "../../lib/Router";
import fmt from "../../lib/fmt";
import path from "node:path";
import * as fs from "node:fs";
import * as QDB from "quick.db"

import * as mime from "mime-types"

import Handlebars from "handlebars";

import "./layouts.hbs"
import { EHTTPStatus } from "../../lib/HTTP_Server";
// import { resolveLayouts } from "./layouts.hbs";

const HBSComp = function(input: any, options_?: CompileOptions) {
    const HBComp = Handlebars.compile
    return function(context: any, options?: RuntimeOptions) {
        try {
            return HBComp(input, options_)(context, options)
        } catch (e) {
            void(e);
            return HBComp(`${e}<hr/>(You could just define the inline partial in your page and not add any content to it if you don't need it)`, options_)(context, options)
        }
    }

}

const {MemoryDriver, JSONDriver, QuickDB} = QDB

const memDriver = new MemoryDriver();
const jsonDriver = new JSONDriver();

const db0 = new QuickDB({driver:memDriver});
const db1 = new QuickDB({driver:jsonDriver});

(async () => {
    await db0.init()
    await db1.init()

    // resolveLayouts()
})()

db1.set("users", {
    0: {
        id: 0,
        name: "Amy Nagtegaal",
        age: 18,
        avatar: "/static?page=default-avatar.svg",
        info: {
            job: {
                company: "DayDRM Studios Ltd.",
                title: "Owner, Lead Dev"
            }
        }
    },
    1: {
        id: 1,
        name: "Lily bloemenhuize",
        age: 18,
        avatar: "/static?page=default-avatar.svg",
        info: {
            job: {
                company: "DayDRM Studios Ltd.",
                title: "Co-Owner, Lead Designer, Manager-Creative-Dept."
            }
        }
    },
})

const app = Router.createServer()

const main = app.router("/");
const main2 = app.router("/_");
const core = app.router("/core")

let view_locations = {
    views: path.join(__dirname, "../", "/views"),
    view: (name) => path.join(__dirname, "../", "/views", name),
    index: path.join(__dirname, "../", "/views", "/index.net.html"),
    static: path.join(__dirname, "../", "/views", "/static"),
    assets: path.join(__dirname, "../", "/views", "/assets"),
    css: path.join(__dirname, "../", "/views", "/assets", "/css"),
    scss: path.join(__dirname, "../", "/views", "/assets", "/scss"),
    asset: (name, folder?) => {
        // console.log(folder)
        let path_ = "./"
        if (folder == "assets") return path_ = path.join(__dirname, "../", "/views", "/assets", name)
        else if (folder == "css") return path_ = path.join(__dirname, "../", "/views", "/assets", "/css", name)
        else if (folder == "scss") return path_ = path.join(__dirname, "../", "/views", "/assets", "/scss", name)
        else path_ = path.join(__dirname, "../", "/views", "/assets", name)
        return path_

    }
}

let views = {
    index: "NULL",
    hbtest: "NULL",
    hbtest2: "NULL"
}

function reloadAssets() {
    const assets_f = ["assets", "css", "scss"]
    console.log("[appUtils.reloader.assets]: Trying to reload Assets...")
    const assets = app.router("/assets")
    for(const folder of assets_f) {
    const assetsFolder = fs.readdirSync(view_locations[folder])

    const folder_ = folder == "assets" ? "" : folder + "/"


    // console.log(folder, view_locations.asset("base.css", folder))
    for (let asset_ of assetsFolder) {
        let mimetype = mime.lookup(asset_);
        // fs.stat(view_locations.asset(asset_, folder), (err, stats) => {})
        assets.get("/"+folder_+asset_, async (req, res) => {

            if(String(req.url).endsWith("/css") || String(req.url).endsWith("/scss")) {
                await res.setHeader('Content-Type', "text/plain");
                await res.setHeader('serverside-force-content-length', 'true')
                return await res.end("Requested file is a directory!");
            }

            if (String(asset_).endsWith("css")) mimetype = "text/css";
            if (String(asset_).endsWith("js")) mimetype = "text/javascript"

            await res.setHeader('Content-Type', <any>mimetype);
            await res.setHeader('serverside-force-content-length', 'true')
            
            let contents = fs.readFileSync(view_locations.asset(asset_, folder))

            // if(mimetype == "text/javascript") console.log(`(JS_HANDLER) Requested:`, {urlOf: req.url}, `\nAttempting to send file:`, {
            //     mimetypeOf: mimetype,
            //     nameOf: asset_,
            //     pathOf: view_locations.asset(asset_),
            //     contentsOf: contents.toString()
            // })
            await res.end(contents);
        })
        // main.remap(`/assets/${asset_}`, `/${asset_}`, "GET")
    }
    }
    console.log("[appUtils.reloader.assets]: Finished reload attempt!")
}

function reloadRoutes() {
    console.log("[appUtils.reloader]: Trying to reload Views...")
    reloadAssets()
    views = {
        index: fs.readFileSync(view_locations.index).toString(),
        hbtest: fs.readFileSync(view_locations.view("hb.test.hbs")).toString(),
        hbtest2: fs.readFileSync(view_locations.view("hb2.test.hbs")).toString()
    }
    console.log("[appUtils.reloader]: Finished reload attempt!")
    return views
}

reloadRoutes()

core.get("/reloadRoutes", async (req, res) => {
    await res.setHeader('Content-Type', 'application/json');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(String(JSON.stringify(reloadRoutes())));
})

let user_mutable = (async () => await db1.get("user_mutable"))()


main.post("/test/uwu", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end("[http://localhost:3000/test/uwu].post");
})
main.get("/test/uwu", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end("[http://localhost:3000/test/uwu].get");
})

main.get("/", async (req, res) => {

    const test_obj = {
        user_mutable: await user_mutable,
        name: "test"
    }

    await res.setHeader('Content-Type', 'text/html');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(fmt.obj(views.index, test_obj));
})

main.get("/hbtest2", async (req, res) => {
    const test_obj = {
        user_mutable: await user_mutable,
        name: "test user"
    }

    await res.setHeader('Content-Type', 'text/html');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(HBSComp(views.hbtest2)({ 
        layout_title: "hb_test", 
        test_obj, 
        people: await db1.get("users")
    }));
})

main.get("/hbtest", async (req, res) => {

    const test_obj = {
        user_mutable: await user_mutable,
        name: "test user"
    }

    await res.setHeader('Content-Type', 'text/html');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(HBSComp(views.hbtest)({ 
        layout_title: "hb_test", 
        test_obj, 
        people: [
            {
                id: 0,
                name: "Amy Nagtegaal",
                age: 18,
                avatar: "/static?page=default-avatar.svg",
                info: {
                    job: {
                        company: "DayDRM Studios Ltd.",
                        title: "Owner, Lead Dev"
                    }
                }
            },
            {
                id: 1,
                name: "Lily bloemenhuize",
                age: 18,
                avatar: "/static?page=default-avatar.svg",
                info: {
                    job: {
                        company: "DayDRM Studios Ltd.",
                        title: "Co-Owner, Lead Designer, Manager-Creative-Dept."
                    }
                }
            },
        ]
    }));
})

main.get("/static", async (req, res) => {
    const page = query(req.queries, "page")
    const _page = page == "undefined" || page == "" ? "/" : page
    const mime_t_ = mime.lookup(_page) 
    const mime_t = mime_t_ == false ? 'text/plain' : mime_t_ == "text/x-handlebars-template" ? 'text/html' : mime_t_
    const location = view_locations.static + "/" + _page
    try {
        await res.setHeader('Content-Type', mime_t);
        await res.setHeader('serverside-force-content-length', 'true')
        let page__ = ""
        if (String(_page).endsWith("/")) page__ = Folder()
        else page__ = fs.readFileSync(location).toString()
        function Folder() {
            const folder = fs.readdirSync(location);
            res.setHeader('Content-Type', "text/html");
            if (folder.includes("index.html")) return fs.readFileSync(location + "index.html").toString()
            else if (folder.includes("index.hbs")) return HBSComp(fs.readFileSync(location + "index.hbs").toString())({})
            else {
                let string = ``
                for(const file of folder) {
                    try {
                        const folder2 = fs.readdirSync(path.join(location, file));
                        void(folder2)
                        string += `<a data-link-static href="/static?page=${_page}${file}/"><div>/${file}/</div></a><hr/>`
                    } catch (e) {
                        string += `<a data-link-static href="/static?page=${_page}${file}"><div>/${file}</div></a><hr/>`
                        void(e)
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
</html>` 
            }
        }
        if (String(_page).endsWith(".hbs")) await res.end(HBSComp(page__)({}));
        else await res.end(page__);
    } catch (e) {
        await res.setHeader('Content-Type', 'text/plain');
        await res.setHeader('serverside-force-content-length', 'true')
        await res.setStatus(404)
        await res.end(`CANNOT GET '${req.url}', RETURNED 404\n------------------\n${e}`);
    }
})


main.get("/a", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end(String(view_locations.index));
})

main.get("/b", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (3)');
})

main.get("/c", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (4)');
})

main2.get("/", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (1)');
})

main2.get("/a", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (2)');
})

main2.get("/b", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (3)');
})

main2.get("/c", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.end('Hello World! (4)');
})

core.get("/setStore", async (req, res) => {
    await res.setHeader('Content-Type', 'application/json');
    await res.setHeader('serverside-force-content-length', 'true')

    // console.log(req)

    const key = query(req.queries, "key")
    const value = query(req.queries, "val")

    db1.set(key, value)

    // console.log(key,value)

    if (key == "user_mutable") user_mutable = value
    await res.end(`{key: ${key}, val: ${value}}`);
})

app.get("/static_index.html", async (req, res) => {
    const RespBodyFile = fs.readFileSync(view_locations.view("test/static_index.html")).toString()
    await res.setHeader('Content-Type', 'text/html')
    await res.setHeader('serverside-force-content-length', 'true')
    await res.setStatus(EHTTPStatus.KEEP_YOUR_CALM)
    await res.end(RespBodyFile)
})

app.all("fallback", async (req, res) => {
    await res.setHeader('Content-Type', 'text/plain');
    await res.setHeader('serverside-force-content-length', 'true')
    await res.setStatus(404)
    await res.end(`CANNOT GET '${req.url}', RETURNED 404`);
})

app.listen(5000).then(({port, _}: any) => {
    console.log("server running on: ", port)
})


function query(queries: {[key:string]:string}, key: string) {
    let result
    // console.log(queries, key)
    if (queries == undefined) return result = "undefined"
    let q = queries[key];
    // console.log(q)
    if (q == undefined) result = "undefined"
    else result = q
    return result
}