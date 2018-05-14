# json-combiner
json-combiner is a tool that ingests a folder of source files to produce a single
JSON file with the same structure as the source folder.
json-combiner will take the following types of files:
 * .json - Standard JS comments are stripped out of these files
 * .json5 - https://json5.org/
 * .js - Specialized JS files are accepted, see below.

## Usage:
    -s, --src  Source to folder of files to combine
    -o, --out  Output JSON path (single file)
    -m, --minify  If the output file should be minified. Default is false.

## Examples

Assuming we have the following source JSON files:

`src/foo/foo-en.json`:

```json
{
    "foo": {
        "title": "The Foo",
        "name":  "A wonderful component"
    }
}
```

`src/bar/bar-en.json`:

```json
{
    "bar": {
        "title": "The Bar",
        "name":  "An even more wonderful component"
    }
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

The javascript file can take two forms - either an object literal, or the contents of a function
where your return value becomes the JSON object for the file.

```js
{
    //if the first character is the first character of an object literal, then it is evaluated that
    //way. This means that if your JSON as JS is set up that way, you can't have whitespace or
    //a comment as the first text
    TWO_PI: Math.PI * 2,
    foo: "bar"
}
```

```js
//other javacript is wrapped within a function, allowing you to create your object however you like
var rtn;
for(var i = 100; i > 50; --i)
    rtn.push(i);
//The return value here is the final result, which saves us from having to make our array
//of integer values form 100 to 51 by hand.
return rtn;
```

## Credits
This was originally implemented in https://github.com/SpringRoll/grunt-concat-json