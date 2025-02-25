"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var handlebars_1 = require("handlebars");
var template1 = "\n<h1>{{h1_content}}</h1>\n";
var template2 = "\n{{#>layout2 _title=title}}\n<h1>{{h1_content}}</h1>\n{{/layout2}}\n";
function layouts() {
    function old() {
        return handlebars_1.default.compile("\n                <!DOCTYPE html>\n    <html lang=\"en\">\n    <head>\n        <meta charset=\"UTF-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n        <title>{{layout_.title}}</title>\n        {{layout_.headcontent}}\n    </head>\n    <body>\n        {{layout_.bodycontent}}\n    </body>\n    </html>\n            ");
    }
    function _new() {
        return "\n        <!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta http-equiv=\"X-UA-Compatible\" content=\"ie=edge\">\n  <title>{{_title}}</title>\n  <link rel=\"stylesheet\" href=\"/css/main.css\">\n</head>\n\n<body>\n{{> @partial-block }}\n</body>\n</html>\n\n        ";
    }
    return { old: old, _new: _new };
}
handlebars_1.default.registerPartial("layout2", layouts()._new());
console.log("old Method", layouts().old()({
    layout_: {
        title: "Test_1",
        headcontent: "",
        bodycontent: handlebars_1.default.compile(template1)({ h1_content: "Hello, World!" })
    }
}));
console.log("new method", handlebars_1.default.compile(template2)({
    title: "Test_2",
    h1_content: "Hello, World!"
}));
