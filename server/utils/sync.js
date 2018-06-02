function sync(funcs, done){
	var counter = funcs.length;
    var idx = 0;

	var next = function() {
		if (--counter === 0) done();
		else funcs[idx++](next);
	};

	funcs[idx++](next);
}

module.exports = sync;
