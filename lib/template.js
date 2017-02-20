'use strict';

var fs = require('fs'),
    path = require('path');

function defaultTemplate() {
    return '';
}

module.exports = function getTemplate(tech, options) {
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
};
