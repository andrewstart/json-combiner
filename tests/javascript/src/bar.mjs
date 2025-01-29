import path from 'path';
import slash from 'slash';

export default {
	value: [
		"a",
		"b",
		"c"
	],
	//posix style relative path to this file
	path: slash(path.relative(process.cwd(), import.meta.filename))
};