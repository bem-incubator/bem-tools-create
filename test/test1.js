'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const proxyquire = require('proxyquire');
const naming = require('@bem/naming');
const EOL = require('os').EOL;
const assert = require('assert');
const stream = require('stream');
const sinon = require('sinon');
const spy = sinon.spy();
const tmpDir = path.join(__dirname, '..');

const createEntity = function() {
    console.log(arguments);
    spy.apply(null, arguments);
}
const create = proxyquire('../lib/create',
    {
        './create-entity': createEntity
    }
);




const templates = {
    css: require('../lib/templates/css')
};

function testEntityHelper(entities, levels, techs, options, expected, done) {
    const expectedOptions = {}; // TODO fix this

    create(entities, levels, techs, options).then(() => {
        assert.equal(spy.callCount, entities.length); // вызвана столько-то раз

        expected.forEach(
            file => assert(spy.calledWith(file.name, file.content, expectedOptions)) // вызывалась с expected параметрам
        );

        done();
    });
}

describe('bem-tools-create', () => {
    describe('default scheme and default naming', () => {
        it('should create a block using `nested` scheme and default naming', done => {
            create({ block: 'b' }, ['/tmp'], ['css']).then(() => {
                console.log(spy.calledOnce);
                assert(spy.calledOnce);
                done();
            });
        });
    });

    describe('default scheme and default naming', () => {
        it.only('should create a block using `nested` scheme and default naming', done => {
            return testEntityHelper([{ block: 'b' }], ['./'], ['css'], {}, [{
                name: path.join(tmpDir, 'b', 'b.css'),
                content: '.b {\n    \n}\n'
            }], done);
        });
    });
});
