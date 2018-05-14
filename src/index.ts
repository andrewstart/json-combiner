//don't want to import minimist if not being used as a CLI,
//so just importing it for a type here - tsc should strip it out as unused
import MinimistType = require('minimist');
import fs = require('fs-extra');
import path = require('path');
import strip = require('strip-json-comments');
//imported on demand, and apparently the types weren't working correctly,
//so just using JSON types for it (which is all its types did anyway)
let JSON5:typeof JSON;

export function cli()
{
    //import minimist for reals
    const minimist:typeof MinimistType = require('minimist');
    
    const args = minimist(process.argv.slice(2), {
        string: ['src', 'out'],
        boolean: ['minify'],
        alias: {
            s: 'src',
            o: 'out',
            m: 'minify',
            h: 'help'
        }
    });
    
    if (args.hasOwnProperty('help') || !args.src || !args.out)
    {
        const help = `
json-combiner usage:
    -s, --src  Source to folder of files to combine
    -o, --out  Output JSON path (single file)
    -m, --minify  If the output file should be minified. Default is false.
`;
        console.log(help);
        return;
    }
    
    combine(path.join(process.cwd(), args.src))
    .then((data) =>
    {
        return save(data, path.join(process.cwd(), args.out), args.minify);
    })
    .catch((err:Error|Error[]) =>
    {
        process.exitCode = 1;
        if (Array.isArray(err))
        {
            err.forEach((e) =>
            {
                process.stderr.write(e.message);
            });
        }
        else
        {
            process.stderr.write(err.message);
        }
    });
}


export async function combine(src:string):Promise<object>
{
    return readDir(src, src);
}

async function save(data:object, out:string, minify = false):Promise<void>
{
    return fs.writeFile(out, JSON.stringify(data, null, minify ? undefined : 4));
}

async function readDir(dir:string, baseDir:string):Promise<object>
{
    const isArray = dir.endsWith('[]');
    const out: any = isArray ? [] : {};
    const errors = [];
    const files = await fs.readdir(dir);
    for (let i = 0; i < files.length; ++i)
    {
        const filePath = path.join(dir, files[i]);
        try
        {
            const ext = path.extname(files[i]);
            let filename = path.basename(files[i], ext);
            const stat = await fs.stat(filePath);
            let fileData;
            //handle folders recursively
            if (stat.isDirectory())
            {
                //if it is an array folder, pull the brackets off the name
                if (filename.endsWith('[]'))
                {
                    filename = filename.substr(0, filename.length - 2);
                }
                fileData = await readDir(filePath, baseDir);
            }
            //read JSON files, stripping out comments
            else if (ext === '.json')
            {
                fileData = await fs.readFile(filePath, 'utf8');
                fileData = strip(fileData);
                fileData = JSON.parse(fileData);
            }
            //read JSON5 files
            else if (ext === '.json5')
            {
                if (!JSON5) {
                    JSON5 = require('json5');
                }
                fileData = await fs.readFile(filePath, 'utf8');
                fileData = JSON5.parse(fileData);
            }
            //handle JS files by assuming they either are an object or will
            //return one
            else if (ext === '.js')
            {
                fileData = await fs.readFile(filePath, 'utf8');
                const firstChar = fileData[0];
                //detect object literals
                if(firstChar === '{' || firstChar === '[' || firstChar === '\"' ||
                    firstChar.match(/[0-9]/) || fileData === "false" ||
                    fileData === "true")
                {
                    fileData = eval("(function(){ return " + fileData + "})()");
                }
                //otherwise make a function out of the text and use the
                //return value
                else
                {
                    fileData = eval("(function(){" + fileData + "})()");
                }
            }
            //add to the output
            if (isArray)
            {
                //current dir is an array - push items
                out.push(fileData);
            }
            else
            {
                //if there is already a thing, we should merge it (folder + file)
                if (out.hasOwnProperty(filename))
                {
                    //can't merge arrays, because we can't guarantee an order
                    if (Array.isArray(out[filename]) || Array.isArray(fileData))
                    {
                        throw new Error(`Unable to merge arrays with name ${filename}`);
                    }
                    //can't merge strings, numbers, booleans, or null values
                    if (typeof out[filename] !== 'object' || typeof fileData !== 'object'
                        || !out[filename] || !fileData)
                    {
                        throw new Error(`Unable to merge non-object value with name ${filename}`);
                    }
                    //merge objects
                    out[filename] = Object.assign(out[filename], fileData);
                }
                else
                {
                    //just set it
                    out[filename] = fileData;
                }
            }
        }
        catch (e)
        {
            if (!e)
            {
                //dunno what might be rejecting with no value, but just in case
                errors.push(new Error(`Unknown error processing ${filePath.replace(baseDir, '')}`));
            }
            else if (Array.isArray(e))
            {
                //combine errors from lower depth folders into ours
                errors.push(...e);
            }
            else
            {
                //assume Error
                errors.push(`Error processing ${filePath.replace(baseDir, '')}: ${e.message}`);
            }
        }
    }
    if (errors.length)
    {
        throw errors;
    }
    return out;
}