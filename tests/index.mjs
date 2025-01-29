import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const combiner = await import('../lib/index.js');

const folders = fs.readdirSync(import.meta.dirname)
.map((file) => {
    return path.join(import.meta.dirname, file);
}).filter((file) => {
    return fs.statSync(file).isDirectory();
});

describe('JSON Combiner', function() {
    describe('Specifications', function() {
        folders.forEach((folder) => {
            const name = path.basename(folder);
            it(name, function() {
                // typescript compilation takes some time
                this.slow(3500);
                this.timeout(7000);
                const expected = require(path.join(folder, 'expected.json'));
                return combiner.combine(path.join(folder, 'src'))
                .then((result) => {
                    if (name.endsWith('error')) {
                        throw new Error('Should not have resolved');
                    }
                    assert.deepEqual(result, expected, 'Combined output should match expected');
                }, (err) => {
                    if (!name.endsWith('error')) {
                        throw err;
                    }
                    const errMessage = Array.isArray(err) ? err.map(e => e.message) : err.message;
                    if (Array.isArray(errMessage)) {
                        errMessage.forEach((message, index) => {
                            assert.ok(message.startsWith(expected[index]), `Expected ${message} to start with or equal ${expected[index]}`);
                        });
                    }
                    else {
                        assert.deepEqual(errMessage, expected, 'Errors should match expected');
                    }
                });
            });
        });
    });
});