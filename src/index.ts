//don't want to import minimist if not being used as a CLI,
//so just importing it for a type here - tsc should strip it out as unused
import MinimistType from 'minimist';
import fs from 'fs-extra';
import path from 'path';
import strip from 'strip-json-comments';
//imported on demand, just importing types
import JSON5Type from 'json5';
let JSON5:typeof JSON5Type;

// import type only so it can be compiled out - actual require is on demand
import * as typescript from 'typescript';
let ts:typeof typescript;
let tsRequired:boolean = false;

export const Settings = {
    justTranspileTS: false,
};

async function compileTypescript(filename:string, basePath:string):Promise<string>
{
    if (!tsRequired) {
        ts = await import('typescript');
    }
    const configPath = ts.findConfigFile(filename, f => ts.sys.fileExists(f));
    const opts:typescript.CompilerOptions = configPath ?
        ts.convertCompilerOptionsFromJson(ts.readConfigFile(configPath, f => ts.sys.readFile(f)).config.compilerOptions, basePath).options :
        ts.getDefaultCompilerOptions();
    // disable source map & declaration output because they interfere with our ability to get
    // simple JS output.
    opts.sourceMap = false;
    opts.declaration = false;
    opts.noEmit = false;

    if (Settings.justTranspileTS)
    {
        // just read and transpile the file - actual compilation isn't working correctly when importing outside things
        const text = await fs.readFile(filename, 'utf8');
        return ts.transpileModule(text, { compilerOptions: opts }).outputText;
    }

    let host = ts.createCompilerHost(opts);

    // append output to a string
    let output = '';
    host.writeFile = (_filename, text) => output += text;

    let prog = ts.createProgram([filename], opts, host);

    // convert base path to play nice with error stripping
    basePath = basePath.replace(/\\/g, '/') + '/';

    let errs = [
        ...prog.getSyntacticDiagnostics().map(err => {
            // TODO: add `:${err.start}`, but converted to be actual line number & character, instead of overall character in file
            return new Error(`Syntax error in ${err.file.fileName.replace(basePath, '')} - ${err.messageText as string}`);
        }),
        ...prog.getSemanticDiagnostics().map(err => {
            // TODO: add `:${err.start}`, but converted to be actual line number & character, instead of overall character in file
            return new Error(`Semantic error in ${err.file.fileName.replace(basePath, '')} - ${err.messageText as string}`);
        })
    ];
    if (errs.length) {
        throw errs;
    }

    prog.emit();

    return output;
}

export async function cli()
{
    //import minimist for reals
    const minimist:typeof MinimistType = (await import('minimist')).default;

    const args = minimist(process.argv.slice(2), {
        string: ['src', 'out'],
        boolean: ['minify', 'transpile'],
        alias: {
            s: 'src',
            o: 'out',
            m: 'minify',
            h: 'help',
            t: 'transpile',
        }
    });

    if (args.hasOwnProperty('help') || !args.src || !args.out)
    {
        const help = `
json-combiner usage:
    -s, --src  Source to folder of files to combine
    -o, --out  Output JSON path (single file)
    -m, --minify  If the output file should be minified. Default is false.
    -t, --transpile  If typescript files should be transpiled without type checking. Default is false.
`;
        console.log(help);
        return;
    }

    try
    {
        if (args.transpile)
        {
            Settings.justTranspileTS = true;
        }
        const data = await combine(path.join(process.cwd(), args.src));
        await save(data, path.join(process.cwd(), args.out), args.minify);
    }
    catch(err)
    {
        process.exitCode = 1;
        if (Array.isArray(err))
        {
            err.forEach((e) =>
            {
                process.stderr.write(e.message + '\n');
            });
        }
        else
        {
            process.stderr.write(err.message + '\n');
        }
    }
}


export async function combine(src:string):Promise<object>
{
    return readDir(src, src);
}

async function save(data:object, out:string, minify = false):Promise<void>
{
    return fs.writeFile(out, JSON.stringify(data, null, minify ? undefined : 4));
}

const ROOT_MERGE_FILENAME = '_';

async function readDir(dir:string, baseDir:string):Promise<object>
{
    const isArray = dir.endsWith('[]');
    const out: any = isArray ? [] : {};
    const errors = [];
    const files = await fs.readdir(dir);
    for (let i = 0; i < files.length; ++i)
    {
        const filePath = path.join(dir, files[i]);
        let tempPath =  null;
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
                    filename = filename.substring(0, filename.length - 2);
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
                    JSON5 = (await import('json5')).default;
                }
                fileData = await fs.readFile(filePath, 'utf8');
                fileData = JSON5.parse(fileData);
            }
            //handle JS files by assuming they either are an object or will
            //return one
            else if (ext === '.js' || ext === '.mjs')
            {
                if (filePath.endsWith('.text.js') || filePath.endsWith('.text.mjs'))
                {
                    filename = path.basename(files[i], '.text.js');
                    fileData = await fs.readFile(filePath, 'utf8');
                }
                else
                {
                    //require file
                    fileData = (await import('file://'+filePath)).default;
                    //if they exported a function, assume that that function
                    //returns a promise, and await that
                    if (typeof fileData === 'function')
                    {
                        fileData = await fileData();
                    }
                }
            }
            else if (ext === '.ts')
            {
                if (filePath.endsWith('.text.ts'))
                {
                    filename = path.basename(files[i], '.text.ts');
                    fileData = await compileTypescript(filePath, baseDir);
                }
                else
                {
                    // compile and write a temp file
                    const compiled = await compileTypescript(filePath, baseDir);
                    tempPath = filePath.substring(0, filePath.length - 2) + 'mjs';
                    await fs.writeFile(tempPath, compiled);
                    //require file
                    fileData = (await import('file://' + tempPath)).default;
                    //if they exported a function, assume that that function
                    //returns a promise, and await that
                    if (typeof fileData === 'function')
                    {
                        fileData = await fileData();
                    }
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
                // if the filename is the special root name, merge the whole thing
                if (filename === ROOT_MERGE_FILENAME)
                {
                    Object.assign(out, fileData);
                }
                //if there is already a thing, we should merge it (folder + file)
                else if (out.hasOwnProperty(filename))
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
                const relative = filePath.replace(baseDir, '').replace(/^(\\|\/)/, '');
                //assume Error
                errors.push(new Error(`Error processing ${relative}: ${e.message || e}`));
            }
        }
        finally
        {
            if (tempPath)
            {
                await fs.remove(tempPath);
            }
        }
    }
    if (errors.length)
    {
        throw errors;
    }
    return out;
}