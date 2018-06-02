module.exports = function() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(3);
		}, 10);
	});
};