import Handlebars from "handlebars";

const template1 = `
<h1>{{h1_content}}</h1>
`
const template2 = `
{{#>layout2 _title=title}}
<h1>{{h1_content}}</h1>
{{/layout2}}
`

function layouts(): ILayouts {
    function old() {
        return Handlebars.compile(`
                <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{layout_.title}}</title>
        {{layout_.headcontent}}
    </head>
    <body>
        {{layout_.bodycontent}}
    </body>
    </html>
            `);
      }

      function _new() {
        return `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>{{_title}}</title>
  <link rel="stylesheet" href="/css/main.css">
</head>

<body>
{{> @partial-block }}
</body>
</html>

        `
      }
      return { old, _new };
}

Handlebars.registerPartial(
    "layout2",
    layouts()._new()
)

console.log("old Method", layouts().old()({
    layout_: {
        title: "Test_1",
        headcontent: "",
        bodycontent: Handlebars.compile(template1)({h1_content: "Hello, World!"})
    }
}))

console.log("new method",Handlebars.compile(template2)({
    title: "Test_2",
    h1_content: "Hello, World!"
}))

interface ILayouts {
      old: () => (context: {
        layout_: {
            title: string,
            headcontent: string,
            bodycontent: string
        },
        [key: string|number|symbol]: any
      }) => string,
      _new: () => string
  }