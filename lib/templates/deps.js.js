'use strict';

var EOL = require('os').EOL;

module.exports = function() {
    return [
        '({',
        '    shouldDeps: [',
        '        ',
        '    ]',
        '})',
        ''
    ].join(EOL);
};
