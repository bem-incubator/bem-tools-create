'use strict';

var prepareEntityData = require('./prepare-entity-data'),
    createEntity = require('./create-entity'),
    template = require('./template');

module.exports = function create(entities, levels, techs, options) {
    var createRes = prepareEntityData(entities, levels, techs, options);

    return Promise.all(createRes.map(item =>
        template.apply(item).then(tmpl => createEntity(item.path, tmpl, item.levelOptions))
    ));
};
