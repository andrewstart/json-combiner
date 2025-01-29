import * as path from 'path';
import slash from 'slash';
import {BarType} from '../types';

const bar:BarType = {
	value: [
		"b",
		"c",
		"a"
	],
	//posix style relative path to this file
	path: slash(path.relative(process.cwd(), import.meta.filename))
};

export default bar;