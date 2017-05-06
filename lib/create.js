'use strict';

var path = require('path'),
    bemConfig = require('@bem/sdk.config'),
    BemEntityName = require('@bem/entity-name'),
    BemCell = require('@bem/cell'),
    scheme = require('@bem/fs-scheme'),
    bemNaming = require('@bem/naming'),
    braceExpansion = require('brace-expansion'),
    createEntity = require('./create-entity'),
    getTemplate = require('./template'),
    uniq = require('uniq'),
    Promise = require('pinkie-promise');

module.exports = function create(entities, levels, techs, options) {
    options || (options = {});
    techs || (techs = []);
    var baseConfig = bemConfig(options),
        cwd = path.resolve(options.cwd || '');

    return baseConfig.module('bem-tools')
        .then(function(bemToolsConf) {
            var pluginConf = bemToolsConf && bemToolsConf.plugins && bemToolsConf.plugins.create || {};

            return bemConfig(Object.assign({}, options, { extendBy: pluginConf }));
        }).then(function(config) {
            if (!levels || !levels.length) {
                var levelsMap = config.levelMapSync(),
                    levelList = Object.keys(levelsMap);

                var defaultLevels = levelList.filter(function(level) {
                    return levelsMap[level].default;
                });

                var levelByCwd = levelList.filter(function(level) {
                    return cwd.indexOf(level) === 0;
                }).sort().reverse()[0];

                levels = levelByCwd || (defaultLevels.length ? defaultLevels : cwd);
            }

            Array.isArray(entities) || (entities = [entities]);
            Array.isArray(levels) || (levels = [levels]);

            return Promise.all(entities.map(function(input) {
                var isFileGlob = typeof input === 'string';

                return Promise.all((isFileGlob ? braceExpansion(input) : [input]).map(function(filepathOrInput) {
                    var currentLevels = levels;

                    if (typeof filepathOrInput === 'string') {
                        var currentLevel = path.dirname(filepathOrInput);
                        currentLevel !== '.' && (currentLevels = [currentLevel]);
                    }

                    return Promise.all(currentLevels.map(function(relLevel) {
                        var rootDir = config.rootSync() || cwd,
                            level = path.resolve(rootDir, relLevel);

                        return config.level(level).then(function(levelOptions) {
                            levelOptions || (levelOptions = {});

                            var levelScheme = levelOptions.scheme,
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
                                // make bem-entity-name happy
                                if (filepathOrInput.modName) {
                                    filepathOrInput.mod = {
                                        name: filepathOrInput.modName
                                    };

                                    filepathOrInput.mod.val = filepathOrInput.modVal ||
                                        filepathOrInput.modVal !== false;

                                    delete filepathOrInput.modName;
                                    delete filepathOrInput.modVal;
                                }

                                entity = BemEntityName.create(filepathOrInput);
                            }

                            options.onlyTech && (currentTechs = options.onlyTech);

                            options.excludeTech && (currentTechs = currentTechs.filter(function(tech) {
                                return options.excludeTech.indexOf(tech) === -1;
                            }));

                            return Promise.all(currentTechs.map(function(tech) {
                                var pathToFile = buildPath(
                                        new BemCell({ entity: entity, tech: tech }),
                                        levelOptions.schemeOptions || levelOptions),
                                    absPathToFile = path.join(path.resolve(level), pathToFile),
                                    template = options.fileContent || getTemplate(tech, levelOptions);

                                levelOptions.forceRewrite = options.forceRewrite;

                                return createEntity(entity, absPathToFile, template, levelOptions);
                            }));
                        });
                    }));

                }));
            })).then(flatten);
        });
};

function flatten(arr) {
    return arr.reduce(function(acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}
