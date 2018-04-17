'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const create = require('..');
const naming = require('@bem/naming');
const EOL = require('os').EOL;
const assert = require('assert');
const stream = require('stream');

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

function testEntityHelper(entities, levels, techs, options, expected) {
    return create(entities, levels, techs, options).then(created => {
        expected.forEach(file => {
            let actualContent;
            const createdIndex = created.indexOf(file.name);
            const relativeFileName = path.relative(initialCwd, file.name);

            if (createdIndex === -1) {
                throw new Error(`There is no ${relativeFileName} in result returned`);
            }

            if (typeof file.content === 'undefined') {
                file.content = '';
            }

            try {
                actualContent = fs.readFileSync(file.name, 'utf8');
            } catch (err) {
                throw new Error(`${relativeFileName} was not created`);
            }

            assert.equal(actualContent, file.content, `${relativeFileName} content is not correct`);

            created.splice(createdIndex, 1);
        });

        if (created.length !== 0) {
            throw new Error(`${created} should not be created but it was`);
        }
    });
}

describe('bem-tools-create', () => {
    beforeEach(() => mkdirp.sync(tmpDir));

    afterEach(() => {
        rimraf.sync(tmpDir);
        process.chdir(initialCwd);
    });

    describe('default scheme and default naming', () => {
        it('should create a block using `nested` scheme and default naming', () => {
            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'], {}, [{
                name: path.join(tmpDir, 'b', 'b.css'),
                content: templates.css('b')
            }]);
        });

        it('should create an element using `nested` scheme and default naming', () => {
            return testEntityHelper([{ block: 'b', elem: 'e' }], [tmpDir], ['css'], {}, [{
                name: path.join(tmpDir, 'b', '__e', 'b__e.css'),
                content: templates.css('b__e')
            }]);
        });

        it('should create an block modifier using `nested` scheme and default naming', () => {
            return testEntityHelper([{ block: 'b', modName: 'm', modVal: 'v' }], [tmpDir], ['css'], {}, [{
                name: path.join(tmpDir, 'b', '_m', 'b_m_v.css'),
                content: templates.css('b_m_v')
            }]);
        });

        it('should create an element modifier using `nested` scheme and default naming', () => {
            return testEntityHelper([{ block: 'b', elem: 'e', modName: 'em', modVal: 'ev' }], [tmpDir], ['css'], {}, [{
                name: path.join(tmpDir, 'b', '__e', '_em', 'b__e_em_ev.css'),
                content: templates.css('b__e_em_ev')
            }]);
        });

        it('should create a block with different techs', () => {
            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css', 'deps.js'], {}, [
                {
                    name: path.join(tmpDir, 'b', 'b.css'),
                    content: templates.css('b')
                },
                {
                    name: path.join(tmpDir, 'b', 'b.deps.js'),
                    content: ['({', '    shouldDeps: [', '        ', '    ]', '})', ''].join(EOL)
                }
            ]);
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

            return testEntityHelper([entity], [tmpDir], ['css'], { defaults: { naming: namingScheme } }, [{
                name: path.join(tmpDir, 'b', '-e1', '--m1', 'b-e1--m1_v1.css'),
                content: templates.css(entity, namingScheme)
            }]);
        });

        it('should create blocks with scheme from config', () => {
            const entity = { block: 'b', elem: 'e1', modName: 'm1', modVal: 'v1' };

            return testEntityHelper([entity], [tmpDir], ['css'], { defaults: { scheme: 'flat' } }, [{
                name: path.join(tmpDir, 'b__e1_m1_v1.css'),
                content: templates.css(entity)
            }]);
        });

        describe('levels', () => {
            it('should create a block on default levels from config', () => {
                const opts = {
                    defaults: {
                        levels: ['level1', 'level2'].map(lvl => ({
                            path: path.join(tmpDir, lvl),
                            'default': true
                        }))
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], null, ['css'], opts, [
                    {
                        name: path.join(tmpDir, 'level1', 'b', 'b.css'),
                        content: templates.css('b')
                    },
                    {
                        name: path.join(tmpDir, 'level2', 'b', 'b.css'),
                        content: templates.css('b')
                    }
                ]);
            });

            it('should create entities on levels with provided config', () => {
                const levels = [path.join(tmpDir, 'l1'), path.join(tmpDir, 'l2')];
                const entity = { block: 'b', elem: 'e1', modName: 'm1', modVal: 'v1' };
                const namingScheme = {
                    delims: {
                        elem: '-',
                        mod: { name: '--', val: '_' }
                    }
                };
                const opts = {
                    defaults: {
                        levels: [
                            {
                                path: levels[0],
                                naming: namingScheme
                            },
                            {
                                path: levels[1],
                                scheme: 'flat'
                            }
                        ]
                    }
                };

                return testEntityHelper([entity], levels, ['css'], opts, [
                    {
                        name: path.join(tmpDir, 'l1', 'b', '-e1', '--m1', 'b-e1--m1_v1.css'),
                        content: templates.css(entity, namingScheme)
                    },
                    {
                        name: path.join(tmpDir, 'l2', 'b__e1_m1_v1.css'),
                        content: templates.css(entity)
                    }
                ]);
            });

            it('should bubble to parent level when cwd is inside an entity', () => {
                const opts = {
                    defaults: {
                        levels: ['level1', 'level2'].map(lvl => ({
                            path: path.join(tmpDir, lvl),
                            'default': lvl === 'level2'
                        })),
                        root: true,
                        __source: path.join(tmpDir, '.bemrc')
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                const fakeCwd = path.join(tmpDir, 'level1', 'b1', '__e1');
                mkdirp.sync(fakeCwd);
                process.chdir(fakeCwd);

                return testEntityHelper([{ block: 'b' }], null, ['css'], opts, [
                    {
                        name: path.join(tmpDir, 'level1', 'b', 'b.css'),
                        content: templates.css('b')
                    }
                ]);
            });

            it('should create an entity on default level when cwd is not inside a level folder', () => {
                const opts = {
                    defaults: {
                        levels: ['level1', 'level2'].map(lvl => ({
                            path: path.join(tmpDir, lvl),
                            'default': true
                        }))
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                const fakeCwd = path.join(tmpDir, 'some-folder', 'cwd');
                mkdirp.sync(fakeCwd);
                process.chdir(fakeCwd);

                return testEntityHelper([{ block: 'b' }], null, ['css'], opts, [
                    {
                        name: path.join(tmpDir, 'level1', 'b', 'b.css'),
                        content: templates.css('b')
                    },
                    {
                        name: path.join(tmpDir, 'level2', 'b', 'b.css'),
                        content: templates.css('b')
                    }
                ]);
            });

            it('should create an entity on provided not default level when cwd is not inside a level folder', () => {
                const opts = {
                    defaults: { levels: [], root: true, __source: path.join(tmpDir, '.bemrc') },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                ['level1', 'level2'].forEach(function(lvl) {
                    const level = path.join(tmpDir, lvl);
                    opts.defaults.levels[level] = { 'default': lvl === 'level1' };
                });

                const fakeCwd = path.join(tmpDir, 'some-folder', 'cwd');
                mkdirp.sync(fakeCwd);
                process.chdir(fakeCwd);

                return testEntityHelper([{ block: 'b' }], 'level2', ['css'], opts, [
                    {
                        name: path.join(tmpDir, 'level2', 'b', 'b.css'),
                        content: templates.css('b')
                    }
                ]);
            });

            it('should create a block on cwd as a fallback', () => {
                const fakeCwd = path.join(tmpDir, 'cwd');
                mkdirp.sync(fakeCwd);
                process.chdir(fakeCwd);

                return testEntityHelper([{ block: 'b' }], null, ['css'], { fsRoot: tmpDir, fsHome: tmpDir }, [{
                    name: path.join(fakeCwd, 'b', 'b.css'),
                    content: templates.css('b')
                }]);
            });

            it('should create block on provided levels', () => {
                return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'], { fsRoot: tmpDir, fsHome: tmpDir }, [{
                    name: path.join(tmpDir, 'b', 'b.css'),
                    content: templates.css('b')
                }]);
            });

            describe('level config in plugin config', () => {
                it('should respect level techs', () => {
                    const createLevels = {};
                    const level = path.join(tmpDir, 'level1');
                    const opts = {
                        defaults: {
                            levels: [{ path: level }],
                            modules: {
                                'bem-tools': {
                                    plugins: {
                                        create: {
                                            techs: ['common-create-tech1', 'common-create-tech2'],
                                            levels: createLevels
                                        }
                                    }
                                }
                            }
                        },
                        fsRoot: tmpDir,
                        fsHome: tmpDir
                    };

                    createLevels[level] = {
                        techs: ['create-level-tech1'],
                        'default': true
                    };

                    return testEntityHelper([{ block: 'b' }], null, ['tech1', 'tech2'], opts, [
                        { name: path.join(level, 'b', 'b.tech1') },
                        { name: path.join(level, 'b', 'b.tech2') },
                        { name: path.join(level, 'b', 'b.create-level-tech1') }
                    ]);
                });

                it('should get default level from plugin config', () => {
                    const createLevels = {};
                    const opts = {
                        defaults: {
                            levels: [],
                            modules: {
                                'bem-tools': {
                                    plugins: {
                                        create: {
                                            techs: ['common-create-tech1', 'common-create-tech2'],
                                            levels: createLevels
                                        }
                                    }
                                }
                            }
                        },
                        fsRoot: tmpDir,
                        fsHome: tmpDir
                    };

                    const level = path.join(tmpDir, 'level1');

                    createLevels[level] = {
                        techs: ['create-level-tech1'],
                        'default': true
                    };

                    return testEntityHelper([{ block: 'b' }], null, ['tech1', 'tech2'], opts, [
                        { name: path.join(level, 'b', 'b.tech1') },
                        { name: path.join(level, 'b', 'b.tech2') },
                        { name: path.join(level, 'b', 'b.create-level-tech1') }
                    ]);
                });

                it('should respect level templates', () => {
                    const createLevels = {};
                    const opts = {
                        defaults: {
                            levels: [],
                            modules: {
                                'bem-tools': {
                                    plugins: {
                                        create: {
                                            templates: { css: path.join(__dirname, 'tech-templates', 'css') },
                                            levels: createLevels
                                        }
                                    }
                                }
                            }
                        },
                        fsRoot: tmpDir,
                        fsHome: tmpDir
                    };

                    const level = path.join(tmpDir, 'level1');

                    createLevels[level] = {
                        templates: { css: path.join(__dirname, 'tech-templates', 'css2') },
                        'default': true
                    };

                    return testEntityHelper([{ block: 'b' }], null, ['css'], opts, [
                        {
                            name: path.join(level, 'b', 'b.css'),
                            content: '.b {\n}\n'
                        }
                    ]);
                });

                it('should support glob with absolute level path', () => {
                    const createPluginLevels = {};
                    const opts = {
                        defaults: {
                            modules: {
                                'bem-tools': {
                                    plugins: {
                                        create: {
                                            techs: ['tech1', 'tech2'],
                                            levels: createPluginLevels
                                        }
                                    }
                                }
                            }
                        },
                        fsRoot: tmpDir,
                        fsHome: tmpDir
                    };

                    const level = path.join(tmpDir, '*.blocks');
                    createPluginLevels[level] = {
                        techs: ['tech4', 'tech3'],
                        'default': true
                    };

                    mkdirp.sync(path.join(tmpDir, 'common.blocks'));
                    mkdirp.sync(path.join(tmpDir, 'desktop.blocks'));

                    return testEntityHelper([{ block: 'b' }], null, null, opts, [
                        { name: path.join(tmpDir, 'common.blocks', 'b', 'b.tech3') },
                        { name: path.join(tmpDir, 'common.blocks', 'b', 'b.tech4') },
                        { name: path.join(tmpDir, 'desktop.blocks', 'b', 'b.tech3') },
                        { name: path.join(tmpDir, 'desktop.blocks', 'b', 'b.tech4') }
                    ]);
                });

                it('should support glob resolution for levels', () => {
                    const level = '*.blocks';
                    const levels = [{ path: level }];
                    const createPluginLevels = {};
                    const opts = {
                        defaults: {
                            levels,
                            modules: {
                                'bem-tools': {
                                    plugins: {
                                        create: {
                                            techs: ['tech1', 'tech2'],
                                            levels: createPluginLevels
                                        }
                                    }
                                }
                            }
                        },
                        fsRoot: tmpDir,
                        fsHome: tmpDir
                    };

                    createPluginLevels[level] = {
                        techs: ['tech4', 'tech3'],
                        'default': true
                    };

                    mkdirp.sync(path.join(tmpDir, 'common.blocks'));
                    mkdirp.sync(path.join(tmpDir, 'desktop.blocks'));
                    process.chdir(tmpDir);

                    return testEntityHelper([{ block: 'b' }], null, null, opts, [
                        { name: path.join(tmpDir, 'common.blocks', 'b', 'b.tech3') },
                        { name: path.join(tmpDir, 'common.blocks', 'b', 'b.tech4') },
                        { name: path.join(tmpDir, 'desktop.blocks', 'b', 'b.tech3') },
                        { name: path.join(tmpDir, 'desktop.blocks', 'b', 'b.tech4') }
                    ]);
                });
            });
        });

        describe('techs', () => {
            it('should create block in techs from config', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['tech1', 'tech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], null, opts, [
                    { name: path.join(tmpDir, 'b', 'b.tech1') },
                    { name: path.join(tmpDir, 'b', 'b.tech2') }
                ]);
            });

            it('should create block in techs from config and provided techs', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['tech1', 'tech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], ['tech3', 'tech4'], opts, [
                    { name: path.join(tmpDir, 'b', 'b.tech1') },
                    { name: path.join(tmpDir, 'b', 'b.tech2') },
                    { name: path.join(tmpDir, 'b', 'b.tech3') },
                    { name: path.join(tmpDir, 'b', 'b.tech4') }
                ]);
            });

            // TODO: check that it fires only twice instead of four times
            it('should create block in techs from config and the same provided techs', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['tech1', 'tech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], ['tech1', 'tech2'], opts, [
                    { name: path.join(tmpDir, 'b', 'b.tech1') },
                    { name: path.join(tmpDir, 'b', 'b.tech2') }
                ]);
            });

            it('should create block only in provided techs', () => {
                const opts = {
                    onlyTech: ['only1', 'only2'],
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['defTech1', 'defTech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], ['tech1', 'tech2'], opts, [
                    { name: path.join(tmpDir, 'b', 'b.only1') },
                    { name: path.join(tmpDir, 'b', 'b.only2') }
                ]);
            });
        });

        describe('template', () => {
            it('should create a block using templates from config', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        templates: {
                                            css: path.join(__dirname, 'tech-templates', 'css')
                                        }
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'], opts, [{
                    name: path.join(tmpDir, 'b', 'b.css'),
                    content: '.b { }'
                }]);
            });

            it('should create a block using template ID', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techsTemplates: {
                                            'bemtree.js': 'bemhtml.js'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper([{ block: 'b' }], [tmpDir], ['bemtree.js'], opts, [{
                    name: path.join(tmpDir, 'b', 'b.bemtree.js'),
                    content: [
                        "block('b').content()(function() {",
                        "    return;",
                        "});",
                        ""
                    ].join(EOL)
                }]);
            });
        });
    });

    describe('string parsing', () => {
        describe('entity parsing', () => {
            it('should parse block from string with techs from args', () => {
                return testEntityHelper('b1', tmpDir, ['t1', 't2'], {}, [
                    { name: path.join(tmpDir, 'b1', 'b1.t1') },
                    { name: path.join(tmpDir, 'b1', 'b1.t2') }
                ]);
            });

            it('should parse block from string with techs from config', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['tech1', 'tech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper('b1', tmpDir, null, opts, [
                    { name: path.join(tmpDir, 'b1', 'b1.tech1') },
                    { name: path.join(tmpDir, 'b1', 'b1.tech2') }
                ]);
            });

            it('should parse block with a tech from a string and ignore techs from config', () => {
                const opts = {
                    defaults: {
                        modules: {
                            'bem-tools': {
                                plugins: {
                                    create: {
                                        techs: ['tech1', 'tech2']
                                    }
                                }
                            }
                        }
                    },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                return testEntityHelper('b1.css', tmpDir, ['argTech'], opts, [
                    {
                        name: path.join(tmpDir, 'b1', 'b1.css'),
                        content: templates.css('b1')
                    },
                    { name: path.join(tmpDir, 'b1', 'b1.argTech') }
                ]);
            });

            it('should parse elem from string', () => {
                return testEntityHelper('b1__e1', tmpDir, ['t1'], {}, [
                    { name: path.join(tmpDir, 'b1', '__e1', 'b1__e1.t1') }
                ]);
            });

            it('should parse block mod from string', () => {
                return testEntityHelper('b1_m1', tmpDir, ['t1'], {}, [
                    { name: path.join(tmpDir, 'b1', '_m1', 'b1_m1.t1') }
                ]);
            });

            it('should parse block modVal from string', () => {
                return testEntityHelper('b1_m1_v1', tmpDir, ['t1'], {}, [
                    { name: path.join(tmpDir, 'b1', '_m1', 'b1_m1_v1.t1') }
                ]);
            });

            it('should parse elem mod from string', () => {
                return testEntityHelper('b1__e1_m1_v1', tmpDir, ['t1'], {}, [
                    { name: path.join(tmpDir, 'b1', '__e1', '_m1', 'b1__e1_m1_v1.t1') }
                ]);
            });
        });

        describe('levels from string', () => {
            it('should get level from string', () => {
                return testEntityHelper(tmpDir + '/level1/b1.t1', null, null, {}, [
                    { name: path.join(tmpDir, 'level1', 'b1', 'b1.t1') }
                ]);
            });

            it('should resolve level from string by config', () => {
                const opts = {
                    defaults: { levels: [], root: true, __source: path.join(tmpDir, '.bemrc') },
                    fsRoot: tmpDir,
                    fsHome: tmpDir
                };

                ['level1', 'level2'].forEach(function(lvl) {
                    const level = path.join(tmpDir, lvl);
                    opts.defaults.levels[level] = { 'default': lvl === 'level1' };
                });

                const fakeCwd = path.join(tmpDir, 'some-folder', 'cwd');
                mkdirp.sync(fakeCwd);
                process.chdir(fakeCwd);

                return testEntityHelper(tmpDir + '/level1/b1.t1', null, null, opts, [
                    {
                        name: path.join(tmpDir, 'level1', 'b1', 'b1.t1')
                    }
                ]);
            });
        });

        it('should expand braces', () => {
            return testEntityHelper('{b1,b2}.{t1,t2}', tmpDir, null, {}, [
                { name: path.join(tmpDir, 'b1', 'b1.t1') },
                { name: path.join(tmpDir, 'b1', 'b1.t2') },
                { name: path.join(tmpDir, 'b2', 'b2.t1') },
                { name: path.join(tmpDir, 'b2', 'b2.t2') }
            ]);
        });
    });

    describe('respect context', () => {
        it.skip('should get block from context', () => {

        });

        it.skip('should get block and elem from context', () => {

        });

        it.skip('should get modName from context', () => {

        });

        // modVal if cwd is inside mod
    });

    describe('command line arguments support', () => {
        it('should exclude tech', () => {
            const excludedTechs = ['css', 'js'];
            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css', 'js', 't1'],
                { excludeTech: excludedTechs }, [{
                    name: path.join(tmpDir, 'b', 'b.t1')
                }]
            );
        });

        it('should support custom content', () => {
            const content = 'Some testing content';
            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'],
                { fileContent: content }, [{
                    name: path.join(tmpDir, 'b', 'b.css'),
                    content: content
                }]
            );
        });

        it('should force rewrite', () => {
            const content = 'Some testing content';
            // run first time
            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'], { fsRoot: tmpDir, fsHome: tmpDir }, [{
                name: path.join(tmpDir, 'b', 'b.css'),
                content: templates.css('b')
            }])
                // run second time with force and another content
                .then(() => testEntityHelper([{ block: 'b' }], [tmpDir], ['css'],
                    { fileContent: content, forceRewrite: true }, [{
                        name: path.join(tmpDir, 'b', 'b.css'),
                        content: content
                    }])
                );
        });

        it('should support custom content with pipe', () => {
            const content = 'Some piped testing content';
            const srcStream = new stream.Readable();
            srcStream.push(content);
            srcStream.push(null);

            return testEntityHelper([{ block: 'b' }], [tmpDir], ['css'],
                { fileContent: srcStream }, [{
                    name: path.join(tmpDir, 'b', 'b.css'),
                    content: content
                }]
            );
        });

    });
});
