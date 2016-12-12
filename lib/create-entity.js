'use strict';

var fs = require('fs'),
    path = require('path'),
    bemNaming = require('bem-naming'),
    Promise = require('pinkie-promise'),
    mkdirp = require('mkdirp');

module.exports = function(entity, fileName, template, options) {
    return new Promise(function(resolve, reject) {
        fs.exists(fileName, function(exists) {
            if (exists) return resolve(fileName);

            mkdirp(path.dirname(fileName), function(err) {
                if (err) return reject(err);

                fs.writeFile(fileName, template(entity, bemNaming(options.naming)), function(err) {
                    err ? reject(err) : resolve(fileName);
                });
            });
        });
    });
};
