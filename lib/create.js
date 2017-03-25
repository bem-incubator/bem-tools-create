'use strict';

var path = require('path'),
    bemConfig = require('bem-config'),
    scheme = require('bem-fs-scheme'),
    bemNaming = require('bem-naming'),
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

                        return config.level(level).then(function(levelOptions) {
                            levelOptions || (levelOptions = {});

                            var namingOpts = levelOptions.naming,
                                levelScheme = levelOptions.scheme,
                                buildPath = scheme(levelScheme).path,
                                entity = filepathOrInput,

                                pluginConfLevels = Object.keys(pluginConf.levels || {})
                                    .reduce(function(acc, relPluginConfLevel) {
                                        acc[path.resolve(rootDir, relPluginConfLevel)] =
                                            pluginConf.levels[relPluginConfLevel];

                                        return acc;
                                    }, {}),
                                pluginConfLevel = pluginConfLevels[level] || {},
                                pluginConfLevelTechs = pluginConfLevel.techs,

                                pluginTechs = pluginConf.techs || [],
                                currentTechs = uniq([].concat(pluginConfLevelTechs || pluginTechs, techs)),
                                templatesOpts = Object.assign({}, pluginConf, pluginConfLevel);

                            if (isFileGlob) {
                                var file = path.basename(filepathOrInput),
                                    splitted = file.split('.');

                                entity = bemNaming(namingOpts).parse(splitted.shift());
                                if (splitted.join('.')) {
                                    currentTechs = uniq(techs.concat(splitted.join('.')));
                                }
                            }

                            options.onlyTech && (currentTechs = options.onlyTech);

                            options.excludeTech && (currentTechs = currentTechs.filter(function(tech) {
                                return options.excludeTech.indexOf(tech) === -1;
                            }));

                            return Promise.all(currentTechs.map(function(tech) {
                                var pathToFile = buildPath(entity, tech, { naming: namingOpts }),
                                    absPathToFile = path.join(path.resolve(level), pathToFile),
                                    template = getTemplate(tech, templatesOpts);

                                return createEntity(entity, absPathToFile, template, { naming: namingOpts });
                            }));
                        });
                    });
            }));

        }));
    })).then(flatten);
};

function flatten(arr) {
    return arr.reduce(function(acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}
