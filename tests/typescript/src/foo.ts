export = function() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(17);
		}, 10);
	});
};