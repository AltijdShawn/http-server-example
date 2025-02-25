import Handlebars from "handlebars";
import * as fs from "node:fs";
import path from "node:path";


Handlebars.registerPartial(
  "layout_global_imports",
  `
  <link rel="stylesheet" href="/static?page=/assets/css/base.css">
<script src="/static?page=/assets/setup.js" type="module" defer></script>
`
);


const layouts_ = path.join(__dirname, "../", "/views", "/layouts")

export function resolveLayouts() {
  const contents = fs.readdirSync(layouts_);
  // console.log(contents)
  for (const layout of contents) {
  //   console.log("Endswith layout", layout.endsWith(".layout.hbs"))
  //   console.log("Endswith tpl", layout.endsWith(".tpl.hbs"))
    if(!layout.endsWith(".layout.hbs") && !layout.endsWith(".tpl.hbs")) return;
    const name = "tpl_" + layout.replace(".layout.hbs", "").replace(".tpl.hbs", "").replace(".", "_")
    const tpl_content = fs.readFileSync(layouts_ + "/" + layout).toString()

    console.log(`Registering layout of '${layout}' as '${name}'`)
    Handlebars.registerPartial(
      name,
      tpl_content
    )
  }
}


resolveLayouts()