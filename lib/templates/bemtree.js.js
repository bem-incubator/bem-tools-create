'use strict';

var EOL = require('os').EOL;

module.exports = function(entity, naming) {
    return [
        "block('" + entity.block + "').content()(function() {",
        "    return;",
        "});",
        ""
    ].join(EOL);
};
