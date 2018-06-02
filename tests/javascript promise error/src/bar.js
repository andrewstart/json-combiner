const path = require('path');
const slash = require('slash');

module.exports = {
	value: [
		"a",
		"b",
		"c"
	],
	//posix style relative path to this file
	path: slash(path.relative(process.cwd(), __filename))
};