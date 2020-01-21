module.exports = {
	findBundle: function(i, options) {
		return [
			`./${options.name}-main.js`,
			`./${options.name}-nested/entry/point.js`,
		]
	}
};
