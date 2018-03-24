'use strict';

var path = require('path'),
    bemConfig = require('bem-config'),
    BemEntityName = require('@bem/entity-name'),
    BemCell = require('@bem/cell'),
    scheme = require('@bem/fs-scheme'),
    bemNaming = require('@bem/naming'),
    braceExpansion = require('brace-expansion'),
    createEntity = require('./create-entity'),
    getTemplate = require('./template'),
    uniq = require('uniq'),
    Promise = require('pinkie-promise'),
    stream = require('stream');

module.exports = function create(entities, levels, techs, options) {
    options || (options = {});
    techs || (techs = []);
    var baseConfig = bemConfig(options),
        cwd = path.resolve(options.cwd || ''),

        bemToolsConf = baseConfig.moduleSync('bem-tools'),

        pluginConf = bemToolsConf && bemToolsConf.plugins && bemToolsConf.plugins.create || {},

        config = bemConfig(Object.assign({}, options, { extendBy: pluginConf }));

    if (!levels || !levels.length) {
        var levelsMap = config.levelMapSync(),
            levelList = Object.keys(levelsMap);

        var defaultLevels = levelList.filter(function (level) {
            return levelsMap[level].default;
        });

        var levelByCwd = levelList.filter(function (level) {
            return cwd.indexOf(level) === 0;
        }).sort().reverse()[0];

        levels = levelByCwd || (defaultLevels.length ? defaultLevels : cwd);
    }

    Array.isArray(entities) || (entities = [entities]);
    Array.isArray(levels) || (levels = [levels]);

    return flatten(entities.map(function (input) {
        var isFileGlob = typeof input === 'string';

        return (isFileGlob ? braceExpansion(input) : [input]).map(function (filepathOrInput) {
            var currentLevels = levels;

            if (typeof filepathOrInput === 'string') {
                var currentLevel = path.dirname(filepathOrInput);
                currentLevel !== '.' && (currentLevels = [currentLevel]);
            }

            return currentLevels.map(function (relLevel) {
                var rootDir = config.rootSync() || cwd,
                    level = path.resolve(rootDir, relLevel),
                    levelOptions = config.levelSync(level) || {},
                    levelScheme = levelOptions.scheme,
                    buildPath = scheme(levelScheme).path,
                    currentTechs = uniq([].concat(levelOptions.techs || [], techs)),
                    entity;

                if (isFileGlob) {
                    var file = path.basename(filepathOrInput),
                        // split for entity key and tech (by first dot)
                        match = file.match(/^([^.]+)(?:\.(.+))?$/);

                    entity = bemNaming(levelOptions.naming).parse(match[1]);
                    if (match[2]) {
                        currentTechs = uniq(techs.concat(match[2]));
                    }
                } else {
                    entity = BemEntityName.create(filepathOrInput);
                }

                options.onlyTech && (currentTechs = options.onlyTech);

                options.excludeTech && (currentTechs = currentTechs.filter(function (tech) {
                    return options.excludeTech.indexOf(tech) === -1;
                }));

                return currentTechs.map(function (tech) {
                    var pathToFile = buildPath(
                        new BemCell({ entity: entity, tech: tech }),
                        levelOptions.schemeOptions || levelOptions),
                        absPathToFile = path.join(path.resolve(level), pathToFile),
                        template = options.fileContent || getTemplate(tech, levelOptions);

                    if (options.forceRewrite) levelOptions.forceRewrite = options.forceRewrite;

                    var contentR = typeof template === 'string' ?
                        template : template(entity, bemNaming(levelOptions.naming));

                    return {
                        path: absPathToFile,
                        content: contentR,
                        options: levelOptions
                    };
                });
            });
        });
    }));
};

function flatten(arr) {
    return arr.reduce(function (acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}
