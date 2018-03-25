const getEntityData = require('./get-entity-data');
const getPath = require('./get-path');
const template = require('./template');
const createEntity = require('./create-entity');

module.exports = function create(entities, levels, techs, options) {
    var entityData = getEntityData(entities, levels, techs, options);

    return Promise.all(entityData.map(item =>
        template.apply(item)
            .then(content =>
                createEntity(getPath(item), content, item.levelOptions)
            )
        )
    );
};
