const path = require('path');
const scheme = require('@bem/fs-scheme');
const BemCell = require('@bem/cell');

module.exports = function getPath(item) {
    const levelOptions = item.config.levelSync(item.level) || {};
    const levelScheme = levelOptions.scheme;
    const buildPath = scheme(levelScheme).path;
    const pathToFile = buildPath(
        new BemCell({ entity: item.entity, tech: item.tech }),
        item.levelOptions.schemeOptions || item.levelOptions
    );

    return path.join(path.resolve(item.level), pathToFile);
};
