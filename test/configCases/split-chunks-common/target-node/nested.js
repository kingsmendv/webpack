it("should run even with multiple entries at nested paths", function() {
	var a = require("a");
	expect(a).toBe("a");
	var b = require("b");
	expect(b).toBe("b");
	var c = require("c");
	expect(c).toBe("c");
	var d = require("d");
	expect(d).toBe("d");
});
