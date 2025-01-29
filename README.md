[![Build Status](https://travis-ci.org/andrewstart/json-combiner.svg?branch=master)](https://travis-ci.org/andrewstart/json-combiner)

# json-combiner
json-combiner is a tool that ingests a folder of source files to produce a single
JSON file with the same structure as the source folder.
json-combiner will take the following types of files:
 * .json - Standard JS comments are stripped out of these files
 * .json5 - https://json5.org/
 * .mjs - Uses Node's `import()` to load the file. See below.
 * .ts - Uses tsc to compile and Node's `import()` to load the file. See below.

## Installation
`npm install json-combiner`

## Usage:
    -s, --src  Source to folder of files to combine
    -o, --out  Output JSON path (single file)
    -m, --minify  If the output file should be minified. Default is false.

`json-combiner -s ./configSrc/ -o ./lib/config.json`

## Examples

Assuming we have the following source JSON files:

`src/foo.json`:

```json
{
    "title": "The Foo",
    "name":  "A wonderful component"
}
```

`src/bar.json`:

```json
{
    "title": "The Bar",
    "name":  "An even more wonderful component"
}
```

Will generate the following JSON file as output:

```json
{
    "foo": {
        "title": "The Foo",
        "name":  "A wonderful component"
    },
    "bar": {
        "title": "The Bar",
        "name":  "An even more wonderful component"
    }
}
```

### Merging of Files and Folders

If a .json file and a folder share the same name, they will be merged into one
object when the JSON is concatenated.
Assuming we have the following source JSON files:

`src/foo.json`:

```json
{
    "default": {
        "title": "The Foo",
        "name":  "A wonderful component"
    }
}
```

`src/foo/bar.json`:

```json
{
    "title": "The Bar",
    "name":  "An even more wonderful component"
}
```

Will generate the following JSON file as output:

```json
{
    "foo": {
        "default": {
            "title": "The Foo",
            "name":  "A wonderful component"
        },
        "bar": {
            "title": "The Bar",
            "name":  "An even more wonderful component"
        }
    }
}
```

### Root files
If a filename is a single underscore (`_.json` for example), it will be considered the root object of that folder.
This is primarily useful at the top level of your folder structure. The following example:
```
src/
    _.json
    foo/
        bar.json
```
will merge the `foo` property/contents onto the contents of `_.json`.

### Folder-as-Array Example

The contents of a folder can be grouped together as an array. The folder name must
end in '[]'. For the files

- `src/foo[]/foo1.json`:
- `src/foo[]/foo2.json`:
- `src/foo[]/foo3.json`:

```js
{
    "foo": [
        {
            //contents of foo1.json...
        },
        {
            //contents of foo2.json...
        },
        {
            //contents of foo3.json...
        },
    ]
}
```

Note, that the .json files in an array folder do not retain their file names as keys,
since they are now array index items.

### Handling JavaScript files

A JavaScript file will be imported (`import()`), and the module export (`export default ...`)
will be used as the object to be stringified. If the module export is a function, then that
function will be called to obtain the result - if you need to do async stuff then return a promise
from your function.

The file _must_ be an ES Module.

```js
export default {
    TWO_PI: Math.PI * 2,
    foo: "bar"
};
```

```js
export default () => {
    return new Promise((resolve) => {
        let rtn = [];
        for(let i = 100; i > 50; --i)
            rtn.push(i);
        //The return value here is the final result, which saves us from having to make our array
        //of integer values from 100 to 51 by hand.
        resolve(rtn);
    });
};
```

### Handling TypeScript files

A TypeScript file will be imported (`import()`) after being compiled using `typescript` and a temp .mjs file written, and the module export (`export default ...`)
will be used as the object to be stringified. If the module export is a function, then that
function will be called to obtain the result - if you need to do async stuff then return a promise
from your function.
*NOTE:* `typescript` is a peer dependency, you must provide the version you wish to use.

```typescript
export default {
    TWO_PI: Math.PI * 2,
    foo: "bar"
};
```

### Code as Text

If for some reason you want to have JavaScript code inserted into your JSON as a string, use a file
with a `.text.js` or `.text.ts` (must provide your version of TypeScript) extension. The JavaScript
code will be added to the output as a string instead of running the code for a result.

## Credits
This was originally implemented in https://github.com/SpringRoll/grunt-concat-json