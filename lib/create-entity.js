'use strict';

var fs = require('fs'),
    path = require('path'),
    bemNaming = require('@bem/naming'),
    Promise = require('pinkie-promise'),
    mkdirp = require('mkdirp'),
    createTree = require('./create-tree'),
    relativePath = function(to) { return path.relative(process.cwd(), to); };

module.exports = function(entity, fileName, template, options) {
    return new Promise(function(resolve, reject) {
        var content = template(entity, bemNaming(options.naming)),
            isFile = typeof content !== 'object';

        fs.exists(fileName, function(exists) {
            if (isFile && exists) {
                options.noWarn || console.log('File ' + relativePath(fileName) + ' already exists.');
                return resolve(fileName);
            }

            mkdirp(path.dirname(fileName), function(err) {
                if (err) return reject(err);

                if (isFile) {
                    fs.writeFile(fileName, template(entity, bemNaming(options.naming)), function(error) {
                        error ? reject(error) : resolve(fileName);
                    });

                    return;
                }

                createTree(content, fileName, options).then(resolve).catch(reject);
            });
        });
    });
};
