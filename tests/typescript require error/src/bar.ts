import * as path from 'path';
import slash = require('slash');
import {BarType} from '../types';

const bar:BarType = {
	value: [
		"b",
		"c",
		"a"
	],
	//posix style relative path to this file
	path: slash(path.relatives(process.cwd(), __filename))
};

export = bar;