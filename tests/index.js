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
            it(path.basename(folder), function() {
                const expected = require(path.join(folder, 'expected.json'));
                return combiner.combine(path.join(folder, 'src'))
                .then((result) => {
                    assert.deepEqual(result, expected, 'Combined output should match expected');
                });
            });
        });
    });
});