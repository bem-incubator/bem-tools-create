'use strict';

var fs = require('fs'),
    path = require('path'),
    stream = require('stream'),
    bemNaming = require('@bem/naming'),
    Promise = require('pinkie-promise'),
    mkdirp = require('mkdirp'),
    createTree = require('./create-tree'),
    relativePath = function(to) { return path.relative(process.cwd(), to); };

module.exports = function(entity, fileName, template, options) {
    return new Promise(function(resolve, reject) {
        function onEnd(error) {
            error ? reject(error) : resolve(fileName);
        }

        var isPiped = template instanceof stream.Readable,
            content = (isPiped || typeof template === 'string') ? template :
                template(entity, bemNaming(options.naming)),
            isFile = isPiped || (typeof content !== 'object');

        fs.exists(fileName, function(exists) {
            if (isFile && exists && !options.forceRewrite) {
                options.noWarn || console.log('File ' + relativePath(fileName) + ' already exists.');
                return resolve(fileName);
            }

            mkdirp(path.dirname(fileName), function(err) {
                if (err) return reject(err);

                if (isPiped) {
                    const output = fs.createWriteStream(fileName, { flags: 'w' });
                    output.on('finish', onEnd);
                    output.on('error', onEnd);
                    content.pipe(output);

                    return;
                }

                if (isFile) {
                    fs.writeFile(fileName, content, onEnd);

                    return;
                }

                createTree(content, fileName, options).then(resolve).catch(reject);
            });
        });
    });
};
