'use strict';

var EOL = require('os').EOL;

module.exports = function(entity, naming) {
    return [
        '({',
        '    shouldDeps: [',
        '        ',
        '    ]',
        '})',
        ''
    ].join(EOL);
};
