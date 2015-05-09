/**
 * Module Dependencies
 */

var slice = [].slice;
var wrap = require('wrap-fn');

/**
 * Expose `Ware`.
 */

module.exports = Ware;

/**
 * Throw an error.
 *
 * @param {Error} error
 */

function fail(err) {
  throw err;
}

/**
 * Initialize a new `Ware` manager, with optional `fns`.
 *
 * @param {Function or Array or Ware} fn (optional)
 */

function Ware(fn) {
  if (!(this instanceof Ware)) return new Ware(fn);
  this.fns = [];
  if (fn) this.use(fn);
}

/**
 * Use a middleware `fn`.
 *
 * @param {Function or Array or Ware} fn
 * @return {Ware}
 */

Ware.prototype.use = function(fn) {
  if (fn instanceof Ware) {
    return this.use(fn.fns);
  }

  if (fn instanceof Array) {
    for (var i = 0, f; f = fn[i++];) this.use(f);
    return this;
  }

  this.fns.push(fn);
  return this;
};

/**
 * Run through the middleware with the given `args` and optional `callback`.
 *
 * @param {Mixed} args...
 * @param {Function} callback (optional)
 * @return {Ware}
 */

Ware.prototype.run = function() {
  var fns = this.fns;
  var ctx = this;
  var i = 0;
  var last = arguments[arguments.length - 1];
  var done = 'function' == typeof last && last;
  var args = done ? slice.call(arguments, 0, arguments.length - 1) : slice.call(arguments);
  var errorHandlersCount = fns.reduce(function(count, fn) {
    return count + (fn.length === args.length + 2);
  }, 0);

  // next step
  function next(err) {
    var arr = slice.call(args);
    var fn = fns[i++];
    var isErrorHandler = fn && (fn.length === arr.length + 2);
    var shouldRunDone = (err && !errorHandlersCount) || !fn;
    var shouldRunFail = err && !errorHandlersCount && !done;
    var shouldPassErrorToNext = err && errorHandlersCount && !isErrorHandler;
    var shouldRunErrorHandler = err && errorHandlersCount && isErrorHandler;

    if (shouldRunFail || shouldRunDone || shouldRunErrorHandler) {
      arr.unshift(err);
    }

    if (shouldRunFail) {
      return fail.apply(null, arr);
    }

    if (shouldRunDone) {
      return done && done.apply(null, arr);
    }

    if (shouldPassErrorToNext) {
      return next(err);
    }

    if (shouldRunErrorHandler) {
      errorHandlersCount--;
    }

    wrap(fn, next).apply(ctx, arr);
  }

  next();

  return this;
};
