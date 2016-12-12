'use strict';

var create = require('./');

function noOp() {};

var action = function(opts, args) {
    var options = {};
    args.entities = args.entities || [];

    args.entities.forEach(function(file) {
        braceExpansion(file).forEach(function(file) {
            var splitted = file.split('.'),
                entity = naming.parse(splitted.shift()),
                tech = splitted.join('.'),
                techs = [];

            if (tech) {
                techs = [tech];
            } else if (opts.addTech) {
                techs = opts.addTech;
            }

            create(entity, opts.level, techs, options);
        });
    });

    var techs = opts.addTech || [];
    if (opts.forceTech) {
        options.onlyTech = opts.forceTech;
    }

    if (!opts.block) {
        return reject('Block name required');
    }

    var result = create([{
        block: opts.block[0],
        elem: opts.elem && opts.elem[0],
        modName: opts.mod && opts.mod[0],
        modVal: opts.val && opts.val[0]
    }], opts.level, techs, options);

    result.catch(reject);
};

var reject = function(err) {
    console.log('Not created:', err);
};

module.exports = function() {
    this
        .title('Create BEM entity').helpful()
        .opt()
            .name('level').short('l').long('level')
            .title('level directory path')
            .end()
        .opt()
            .name('block').short('b').long('block')
            .title('block name, required')
            .arr()
            .end()
        .opt()
            .name('elem').short('e').long('elem')
            .title('element name')
            .arr()
            .end()
        .opt()
            .name('mod').short('m').long('mod')
            .title('modifier name')
            .arr()
            .end()
        .opt()
            .name('val').short('v').long('val')
            .title('modifier value')
            .arr()
            .end()
        .opt()
            .name('addTech').short('t').long('add-tech')
            .title('add tech')
            .arr()
            .end()
        .opt()
            .name('forceTech').short('T').long('force-tech')
            .title('use only specified tech')
            .arr()
            .end()
        .opt()
            .name('noTech').short('n').long('no-tech')
            .title('exclude tech')
            .arr()
            .end()
        .opt()
            .name('content').short('c').long('content')
            .title('the content of the file')
            .arr()
            .end()
        .opt()
            .name('contentFile').short('cf').long('content-file')
            .title('path to the template to use as a content of created file')
            .arr()
            .end()
        .opt()
            .name('force').short('f').long('force')
            .title('force files creation')
            .flag()
            .end()
        .arg()
            .name('entities').title('Entities')
            .arr()
            .end()
        .act(function(opts, args) {
            var options = {},
                techs = opts.addTech || [];

            if (opts.forceTech) {
                options.onlyTech = opts.forceTech;
            }

            if (args.entities) {
                return create(args.entities, opts.level, techs, options).then(noOp);
            };

            opts.block && create([{
                block: opts.block[0],
                elem: opts.elem && opts.elem[0],
                modName: opts.mod && opts.mod[0],
                modVal: opts.val && opts.val[0]
            }], opts.level, techs, options).then(noOp);
        })
        .end();
};
