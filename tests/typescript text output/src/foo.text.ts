/// <reference path="../refTypes.d.ts" />

function foo() {
	return new Promise<BarType>((resolve) => {
		setTimeout(() => {
			resolve({
				value: ['1', '2', '3'],
				path: 'foobar'
			});
		}, 10);
	});
}