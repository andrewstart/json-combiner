const fs = require('fs');
const path = require('path');
const assert = require('assert');

const combiner = require('../');

const folders = fs.readdirSync(__dirname)
.map((file) => {
    return path.join(__dirname, file);
}).filter((file) => {
    return fs.statSync(file).isDirectory();
});

describe('JSON Combiner', function() {
    describe('Specifications', function() {
        folders.forEach((folder) => {
            const name = path.basename(folder);
            it(name, function() {
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
                    assert.deepEqual(errMessage, expected, 'Errors should match expected');
                });
            });
        });
    });
});