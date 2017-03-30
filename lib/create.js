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
    Promise = require('pinkie-promise');

module.exports = function create(entities, levels, techs, options) {
    options || (options = {});
    techs || (techs = []);
    var config = bemConfig(options),
        cwd = path.resolve(options.cwd || '');

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

                return config.module('bem-tools')
                    .then(function(bemToolsConf) {
                        var pluginConf = bemToolsConf && bemToolsConf.plugins && bemToolsConf.plugins.create || {};

                        config = bemConfig(Object.assign({}, options, { extendBy: pluginConf }));

                        return config.level(level).then(function(levelOptions) {
                            levelOptions || (levelOptions = {});

                            var levelScheme = levelOptions.scheme,
                                buildPath = scheme(levelScheme).path,
                                currentTechs = uniq([].concat(levelOptions.techs || [], techs)),
                                entity,
                                pathInLevel,
                                fullPathPrefix,
                                namingPrefix;

                            if (isFileGlob) {
                                var file = path.basename(filepathOrInput),
                                    // split for entity key and tech (by first dot)
                                    match = file.match(/^([^.]+)(?:\.(.+))?$/),
                                    namingOpts = levelOptions.naming;

                                // parse string to entity
                                entity = bemNaming(namingOpts).parse(match[1]);

                                // if not parsed and we are inside level directory
                                if (!entity && cwd.indexOf(level) === 0) {
                                    // first two parts of path prefix in level
                                    pathInLevel = path.relative(level, cwd).split(path.sep).slice(0, 2);
                                    fullPathPrefix = pathInLevel.join('');

                                    // parse only full prefix
                                    namingPrefix = bemNaming(namingOpts).parse(fullPathPrefix);
                                    // if prefix parsed and elem was found in (elem must be in second dir)
                                    if (namingPrefix && namingPrefix.elem) {
                                        // then parse string with prefix (to add something in block's elem)
                                        entity = bemNaming(namingOpts).parse(fullPathPrefix + match[1]);
                                    }
                                    // if was unsuccessfull then try to add into block only (first part)
                                    entity || (entity = bemNaming(namingOpts).parse(pathInLevel[0] + match[1]));
                                }

                                if (match[2]) {
                                    currentTechs = uniq(techs.concat(match[2]));
                                }
                            } else {
                                // if block was not set and we are inside level directory
                                if (!filepathOrInput.block && cwd.indexOf(level) === 0) {
                                    // first two parts of path prefix in level
                                    pathInLevel = path.relative(level, cwd).split(path.sep).slice(0, 2);
                                    // if we are not set elem
                                    if (!filepathOrInput.elem) {
                                        namingPrefix = bemNaming(namingOpts).parse(pathInLevel.join(''));
                                        // if prefix parsed and elem was found in (there must be elem in two dirs)
                                        if (namingPrefix && namingPrefix.elem) {
                                            filepathOrInput.block = namingPrefix.block;
                                            filepathOrInput.elem = namingPrefix.elem;
                                        }
                                    }
                                    if (!filepathOrInput.block) {
                                        namingPrefix = bemNaming(namingOpts).parse(pathInLevel[0]);
                                        namingPrefix && (filepathOrInput.block = namingPrefix.block);
                                    }
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
                                        levelOptions),
                                    absPathToFile = path.join(path.resolve(level), pathToFile),
                                    template = options.fileContent || getTemplate(tech, levelOptions);

                                levelOptions.forceRewrite = options.forceRewrite;

                                return createEntity(entity, absPathToFile, template, levelOptions);
                            }));
                        });
                    });
            }));

        }));
    }))
        .then(flatten)
        .catch(err => {
            console.log('Error occured: ', err);
        });
};

function flatten(arr) {
    return arr.reduce(function(acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}
