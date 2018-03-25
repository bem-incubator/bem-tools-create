'use strict';

const assert = require('assert');
const bemNaming = require('@bem/naming');

const expected = {
    'default': {
        'bemhtml.js': {
            block: "block('b').content()(function() {\n    return;\n});\n",
            element: "block('b').elem('e').content()(function() {\n    return;\n});\n",
            modifier: "block('b').mod('m', 'v').content()(function() {\n    return;\n});\n",
            'element modifier': "block('b').elem('e').elemMod('em', 'ev').content()(function() {\n    return;\n});\n"
        },
        'bemtree.js': {
            block: "block('b').content()(function() {\n    return;\n});\n",
            element: "block('b').elem('e').content()(function() {\n    return;\n});\n",
            modifier: "block('b').mod('m', 'v').content()(function() {\n    return;\n});\n",
            'element modifier': "block('b').elem('e').elemMod('em', 'ev').content()(function() {\n    return;\n});\n"
        },
        css: {
            block: '.b {\n    \n}\n',
            element: '.b__e {\n    \n}\n',
            modifier: '.b_m_v {\n    \n}\n',
            'element modifier': '.b__e_em_ev {\n    \n}\n'
        },
        js: {
            block: "modules.define('b', ['i-bem-dom'], function(provide, bemDom) {\n\nprovide(bemDom.declBlock(this.name, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            element: "modules.define('b__e', ['i-bem-dom'], function(provide, bemDom) {\n\nprovide(bemDom.declElem('b', 'e', {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            modifier: "modules.define('b', function(provide, B) {\n\nprovide(B.declMod({ modName: 'm', modVal: 'v' }, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            'element modifier': "modules.define('b__e', function(provide, B__e) {\n\nprovide(B__e.declMod({ modName: 'em', modVal: 'ev' }, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n"
        }
    },

    custom: {
        'bemhtml.js': {
            block: "block('b').content()(function() {\n    return;\n});\n",
            element: "block('b').elem('e').content()(function() {\n    return;\n});\n",
            modifier: "block('b').mod('m', 'v').content()(function() {\n    return;\n});\n",
            'element modifier': "block('b').elem('e').elemMod('em', 'ev').content()(function() {\n    return;\n});\n"
        },
        'bemtree.js': {
            block: "block('b').content()(function() {\n    return;\n});\n",
            element: "block('b').elem('e').content()(function() {\n    return;\n});\n",
            modifier: "block('b').mod('m', 'v').content()(function() {\n    return;\n});\n",
            'element modifier': "block('b').elem('e').elemMod('em', 'ev').content()(function() {\n    return;\n});\n"
        },
        css: {
            block: '.b {\n    \n}\n',
            element: '.b-e {\n    \n}\n',
            modifier: '.b--m_v {\n    \n}\n',
            'element modifier': '.b-e--em_ev {\n    \n}\n'
        },
        js: {
            block: "modules.define('b', ['i-bem-dom'], function(provide, bemDom) {\n\nprovide(bemDom.declBlock(this.name, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            element: "modules.define('b-e', ['i-bem-dom'], function(provide, bemDom) {\n\nprovide(bemDom.declElem('b', 'e', {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            modifier: "modules.define('b', function(provide, B) {\n\nprovide(B.declMod({ modName: 'm', modVal: 'v' }, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n",
            'element modifier': "modules.define('b-e', function(provide, BE) {\n\nprovide(BE.declMod({ modName: 'em', modVal: 'ev' }, {\n    onSetMod: {\n        js: {\n            inited: function() {\n                \n            }\n        }\n    }\n}));\n\n});\n"
        }
    }
};

const selectors = {
    block: { block: 'b' },
    element: { block: 'b', elem: 'e' },
    modifier: { block: 'b', modName: 'm', modVal: 'v' },
    'element modifier': { block: 'b', elem: 'e', modName: 'em', modVal: 'ev' }
};

const namingSchemes = {
    'default': {},
    custom: {
        delims: {
            elem: '-',
            mod: { name: '--', val: '_' }
        }
    }
};

Object.keys(namingSchemes).forEach(scheme => {
    describe(`templates with ${scheme} scheme`, () => {
        Object.keys(expected[scheme]).forEach(tmpl => {
            describe(tmpl, () => {
                const template = require(`../lib/templates/${tmpl}`);
                Object.keys(selectors).forEach(selector => {
                    it(`provides content for ${selector}`, () => {
                        assert.equal(
                            template(selectors[selector], bemNaming(namingSchemes[scheme])),
                            expected[scheme][tmpl][selector]
                        );
                    });
                });
            });
        });
    });
});

describe('deps.js', () => {
    it('provides content', () => {
        const deps = require(`../lib/templates/deps.js`);

        assert.equal(deps(), '({\n    shouldDeps: [\n        \n    ]\n})\n');
    });
});

describe('template.apply', () => {
    const template = require(`../lib/template`);

    it('should use template from templates directory', () => {
        const item = {
            levelOptions: { 'default': false },
            tech: 'css',
            options: {},
            entity: { block: 'b' }
        };

        return template.apply(item).then(content => assert.equal(content, '.b {\n    \n}\n'));
    });

    it('should use string fileContent if exists', () => {
        const item = {
            levelOptions: { 'default': false },
            tech: 'css',
            options: { fileContent: 'test' },
            entity: { block: 'b' }
        };

        return template.apply(item).then(content => assert.equal(content, 'test'));
    });

    it('should use stream fileContent if exists', () => {
        const Readable = require('stream').Readable;
        const stream = new Readable;

        const item = {
            levelOptions: { 'default': false },
            tech: 'css',
            options: { fileContent: stream },
            entity: { block: 'b' }
        };

        stream.push('test');
        stream.push(null);

        return template.apply(item).then(content => assert.equal(content, 'test'));
    });
});
