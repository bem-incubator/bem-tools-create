'use strict';

var EOL = require('os').EOL;

function toCamelCase(str) {
    return str.replace(str[0], str[0].toUpperCase());
}

function normalize(str, naming) {
    return str
        .replace(naming.elemDelim, ' ')
        .replace(naming.modDelim, ' ')
        .replace(/-+/, ' ') // word delimiter
        .split(' ')
        .map(toCamelCase).join('');
}

module.exports = function(entity, naming) {
    var name = naming.stringify({
            block: entity.block,
            elem: entity.elem
        }),
        capitalName = normalize(name, naming),
        first;

    if (entity.modName) {
        var modVal = typeof entity.modVal === 'boolean' ? entity.modVal : "'" + entity.modVal + "'";

        first =  [
            "modules.define('" + name + "', function(provide, " + capitalName + ") {",
            "",
            "provide(" + capitalName + ".declMod({ modName: '" + entity.modName + "', modVal: " + modVal + " }, {"
        ];
    } else if (entity.elem) {
        first = [
            "modules.define('" + name + "', ['i-bem-dom'], function(provide, bemDom) {",
            "",
            "provide(bemDom.declElem('" + entity.block + "', '" + entity.elem + "', {"
        ];
    } else {
        first = [
            "modules.define('" + name + "', ['i-bem-dom'], function(provide, bemDom) {",
            "",
            "provide(bemDom.declBlock(this.name, {"
        ];
    }

    var second = [
        "    onSetMod: {",
        "        js: {",
        "            inited: function() {",
        "                ",
        "            }",
        "        }",
        "    }",
        "}));",
        "",
        "});",
        ""
    ];

    return first.concat(second).join(EOL);
};
