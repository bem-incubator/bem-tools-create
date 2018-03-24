'use strict';

var fs = require('fs'),
    path = require('path'),
    bemNaming = require('@bem/naming'),
    stream = require('stream'),
    streamToPromise = require('stream-to-promise');

function defaultTemplate() {
    return '';
}

module.exports = {
    get: function(tech, options) {
        var templateFolder = options.templateFolder,
            techId = (options.techsTemplates && options.techsTemplates[tech]) || tech,
            templatePath = options.templates && options.templates[techId] && path.resolve(options.templates[techId]),
            possiblePaths = [path.join(__dirname, 'templates')];

        templateFolder && possiblePaths.unshift(templateFolder);

        if (!templatePath) {
            for (var i = 0; i < possiblePaths.length; i++) {
                var possibleTemplatePath = path.resolve(possiblePaths[i], techId + '.js');

                if (fs.existsSync(possibleTemplatePath)) {
                    templatePath = possibleTemplatePath;
                    break;
                }
            }
        }

        return templatePath ? require(templatePath) : defaultTemplate;
    },

    apply: function(item) {
        var template = item.options.fileContent || this.get(item.tech, item.levelOptions),
            isPiped = template instanceof stream.Readable;

        return isPiped ? streamToPromise(template) : Promise.resolve(
            typeof template === 'string' ? template : template(item.entity, bemNaming(item.levelOptions.naming))
        );
    }
};
