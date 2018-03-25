'use strict';

var path = require('path'),
    bemNaming = require('@bem/naming'),
    BemEntityName = require('@bem/entity-name'),
    braceExpansion = require('brace-expansion'),
    uniq = require('uniq'),
    bemConfig = require('bem-config');

function flatten(arr) {
    return arr.reduce(function(acc, item) {
        return acc.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
}

module.exports = function getEntityData(entities, levels, techs, options) {
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

    return flatten(entities.map(function(input) {
        var isFileGlob = typeof input === 'string';

        return (isFileGlob ? braceExpansion(input) : [input]).map(function(filepathOrInput) {
            var currentLevels = levels;

            if (typeof filepathOrInput === 'string') {
                var currentLevel = path.dirname(filepathOrInput);
                currentLevel !== '.' && (currentLevels = [currentLevel]);
            }

            return currentLevels.map(function(relLevel) {
                var rootDir = config.rootSync() || cwd,
                    level = path.resolve(rootDir, relLevel),
                    levelOptions = config.levelSync(level) || {},
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

                options.excludeTech && (currentTechs = currentTechs.filter(function(tech) {
                    return options.excludeTech.indexOf(tech) === -1;
                }));

                return currentTechs.map(function(tech) {
                    if (options.forceRewrite) {
                        levelOptions.forceRewrite = options.forceRewrite;
                    }

                    return {
                        config: config,
                        levelOptions: levelOptions,
                        tech: tech,
                        options: options,
                        entity: entity,
                        level: level
                    };
                });
            });
        });
    }));
};
