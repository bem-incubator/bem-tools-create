var PATH = require('path'),
    naming = require('bem-naming'),
    braceExpansion = require('brace-expansion'),
    create = require('./');

/**
 * Search for the nearest level recursively from the specified
 * directory to the filesystem root.
 *
 * @param {String} path  Path to start search from.
 * @param {String[]|String|Undefined} [types]  Level type to search.
 * @param {String} [startPath]
 * @return {String}  Found level path or specified path if not found.
 */
// function findLevel(path, types, startPath) {
//     var createLevel = require('./level').createLevel;

//     if (types && !Array.isArray(types)) types = [types];
//     startPath = startPath || path;

//     // Check for level and level type if applicable
//     if (exports.isLevel(path) &&
//         (!types || exports.containsAll(createLevel(path).getTypes(), types))) return path;

//     // Check for fs root
//     if (PATH.isRoot(path)) return startPath;

//     return findLevel(PATH.dirname(path), types, startPath);
// };

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
    // var def = findLevel(process.cwd()),
    var def = process.cwd(),
        rel = PATH.relative(process.cwd(), def);

    this
        .title('Create BEM entity').helpful()
        .opt()
            .name('level').short('l').long('level')
            .def(def)
            .title(['level directory path, default: ',
                !rel? '.' : rel, PATH.dirSep].join(''))
            // .val(function(l) {
            //     return typeof l === 'string'? require('./level').createLevel(l) : l;
            // })
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
        // .opt()
        //     .name('dir').short('C').long('chdir')
        //     .title('change process working directory, cwd by default; to specify level use --level, -l option instead')
        //     .def(process.cwd())
        //     .val(function(d) {
        //         return PATH.join(PATH.resolve(d), PATH.dirSep);
        //     })
        //     .act(function(opts) {
        //         process.chdir(opts.dir);
        //     })
        //     .end()
        .act(action)
        .end();
};
