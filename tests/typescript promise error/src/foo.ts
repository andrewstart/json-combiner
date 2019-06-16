module.exports = function() {
	return new Promise((_resolve, reject) => {
		setTimeout(() => {
			reject(new Error("I am a teapot!"));
		}, 10);
	});
};