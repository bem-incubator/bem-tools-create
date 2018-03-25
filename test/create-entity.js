'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const naming = require('@bem/naming');
const EOL = require('os').EOL;
const assert = require('assert');
const createEntity = require('../lib/create-entity');

const tmpDir = path.join(__dirname, 'tmp');
const initialCwd = process.cwd();

const templates = {
    css: function(entity, namingScheme) {
        const className = typeof entity === 'string' ? entity : naming(namingScheme).stringify(entity);

        return [
            '.' + className + ' {',
            '    ',
            '}',
            ''
        ].join(EOL);
    }
};

function testEntityHelper(fileName, content, options) {
    return createEntity(fileName, content, options).then(() => {
        let actualContent;
        const relativeFileName = path.relative(initialCwd, fileName);

        if (typeof content === 'undefined') {
            content = '';
        }

        try {
            actualContent = fs.readFileSync(fileName, 'utf8');
        } catch (err) {
            throw new Error(`${relativeFileName} was not created`);
        }

        assert.equal(actualContent, content, `${relativeFileName} content is not correct`);
    });
}

describe('bem-tools-create', () => {
    beforeEach(() => mkdirp.sync(tmpDir));

    afterEach(() => {
        rimraf.sync(tmpDir);
        process.chdir(initialCwd);
    });

    describe('default scheme and default naming', () => {
        it('should create a block using `nested` scheme and default naming', done => {
            testEntityHelper(
                path.join(tmpDir, 'b', 'b.css'),
                templates.css('b'),
                {}
            ).then(done);
        });

        it('should create an element using `nested` scheme and default naming', done => {
            testEntityHelper(
                path.join(tmpDir, 'b', '__e', 'b__e.css'),
                templates.css('b__e'),
                {}
            ).then(done);
        });

        it('should create an block modifier using `nested` scheme and default naming', done => {
            testEntityHelper(
                path.join(tmpDir, 'b', '_m', 'b_m_v.css'),
                templates.css('b_m_v'),
                {}
            ).then(done);
        });

        it('should create an element modifier using `nested` scheme and default naming', done => {
            testEntityHelper(
                path.join(tmpDir, 'b', '__e', '_em', 'b__e_em_ev.css'),
                templates.css('b__e_em_ev'),
                {}
            ).then(done);
        });
    });

    describe('custom options', () => {
        it('should create entities with naming from config', () => {
            const entity = { block: 'b', elem: 'e1', modName: 'm1', modVal: 'v1' };
            const namingScheme = {
                delims: {
                    elem: '-',
                    mod: { name: '--', val: '_' }
                }
            };

            return testEntityHelper(
                path.join(tmpDir, 'b', '-e1', '--m1', 'b-e1--m1_v1.css'),
                templates.css(entity, namingScheme),
                {}
            );
        });

        it('should create blocks with scheme from config', () => {
            const entity = { block: 'b', elem: 'e1', modName: 'm1', modVal: 'v1' };

            return testEntityHelper(
                path.join(tmpDir, 'b__e1_m1_v1.css'),
                templates.css(entity),
                {}
            );
        });
    });
});
