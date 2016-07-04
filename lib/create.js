'use strict'

var path = require('path'),
    createEntity = require('./create-entity'),
    bemConfig = require('bem-config'),
    scheme = require('bem-fs-scheme'),
    getTemplate = require('./template'),
    uniq = require('uniq'),
    get = require('lodash.get'),
    Promise = require('pinkie-promise');

module.exports = function create(entities, levels, techs, options) {
    options || (options = {});
    techs || (techs = []);
    var config = bemConfig(options);

    if (!levels || !levels.length) {
        var levelsMap = config.levelMapSync();
        var defaultLevels = Object.keys(levelsMap).filter(function(level) {
            return level.default;
        });

        levels = defaultLevels.length ? defaultLevels : process.cwd();
    }

    Array.isArray(entities) || (entities = [entities]);
    Array.isArray(levels) || (levels = [levels]);

    return Promise.all(entities.map(function(entity) {
        return Promise.all(levels.map(function(level) {
            return config.module('bem-tools')
                .then(function(bemToolsConf) {
                    var pluginConf = get(bemToolsConf, 'plugins.create') || {};

                    return config.level(level).then(function(levelOptions) {
                        var levelScheme = get(levelOptions, 'scheme'),
                            buildPath = scheme(levelScheme).path,
                            pluginTechs = get(pluginConf) || [],
                            levelTechs = get(options, 'onlyTech') || uniq([].concat(pluginTechs, techs));

                        if (!levelTechs || !levelTechs.length) {
                            return Promise.reject('levelTechs required');
                        }

                        return Promise.all(levelTechs.map(function(tech) {
                            var naming = get(levelOptions, 'naming') || '',
                                pathToFile = buildPath(entity, tech, { naming: naming }),
                                absPathToFile = path.join(path.resolve(level), pathToFile),
                                template = getTemplate(tech, pluginConf);

                            return createEntity(entity, absPathToFile, template, { naming: naming });
                        }));
                    });
                });
        }));
    }));
};
