# bem-tools-create

## Usage

### CLI

Install [bem-tools-core](https://github.com/bem-tools/bem-tools-core/) to use `bem-tools-create` via CLI.

### JS API

```js
const create = require('bem-tools-create');

create('level1/b1.{css,js}'); // will create b1.css and b1.js in level1/b1 folder
create('b1__e1.{css,js}'); // will create b1/__e1/b1__e1.css and b1/__e1/b1__d1.js on default levels or cwd
create('b1'); // will create b1 with default techs from config on default levels or cwd

create([
    { block: 'b1' },
    { block: 'b1', modName: 'm1', modVal: true },
    { block: 'b1', elem: 'e2' },
    { block: 'b1', elem: 'e2', modName: 'elemMod', modVal: true },
    { block: 'b1', modName: 'm1', modVal: 'v1' }
], ['level1', 'level2'], ['css', 'js', 'bemhtml.js']);
```

### Configuration
Use [bem-config](https://github.com/bem-sdk/bem-config/) to set up `bem-tools-create` behaviour.

```js
{
    "root": true,
    "levels": {
        "level1": {
            "scheme": "nested",
            "default": true
        },
        "level2": {
            "scheme": "nested",
            "default": true
        },
        "path/to/level3": {
            "scheme": "nested"
        }
    },
    "modules": {
        "bem-tools": {
            "plugins": {
                "create": {
                    "techs": [
                        "css", "js"
                    ],
                    "templateFolder": "/Users/tadatuta/projects/bem/bem-tools-create/lib/templates",
                    "templates": {
                        "js-ymodules": "/Users/tadatuta/projects/bem/bem-tools-create/lib/templates/js"
                    },
                    "techsTemplates": {
                        "js": "js-ymodules",
                        "bemtree.js": "bemhtml.js"
                    },
                    "levels": {
                        "path/to/level3": {
                            "techs": ["bemhtml.js"]
                        }
                    }
                }
            }
        }
    }
}
```
