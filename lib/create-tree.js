'use strict';

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    Promise = require('pinkie-promise'),
    relativePath = function(to) { return path.relative(process.cwd(), to); };

function walk(tree, root, options) {
    return new Promise(function(rslv, rjct) {
        mkdirp(root, function(err) {
            if (err) return rjct(err);

            Promise.all(Object.keys(tree).map(function(file) {
                return new Promise(function(resolve, reject) {
                    var pathToFile = path.resolve(root, file),
                        content = tree[file];

                    if (typeof content === 'object') {
                        return walk(content, path.join(root, file), options)
                            .then(resolve)
                            .catch(reject);
                    }

                    fs.exists(pathToFile, function(exists) {
                        if (exists) {
                            options.noWarn || console.log('File ' + relativePath(pathToFile) + ' already exists.');
                            return resolve(file);
                        }

                        fs.writeFile(pathToFile, String(content), function(error) {
                            error ? reject(error) : resolve(file);
                        });
                    });
                });
            }))
                .then(rslv)
                .catch(rjct);
        });
    });
}

module.exports = walk;
