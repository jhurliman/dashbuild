var domain = require('domain');

exports.catchRequestErrors = catchRequestErrors;
exports.handle404 = handle404;
exports.handle500 = handle500;
exports.shortDate = shortDate;
exports.pad2 = pad2;

/**
 * Create a domain for each HTTP request to gracefully handle errors.
 */
function catchRequestErrors(req, res, next) {
  var d = domain.create();
  d.add(req);
  d.add(res);
  d.on('error', function(err) {
    try {
      res.on('close', function() { d.dispose(); });
      next(err);
    } catch (ex) {
      d.dispose();
    }
  });
  d.run(next);
}

function handle404(req, res, next) {
  res.send(404);
}

function handle500(err, req, res, next) {
  res.send(500);
}

/**
 * Returns a date string with the format "26 Feb 16:19:34".
 */
function shortDate(date) {
  var SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'];

  var d = date || new Date();
  return d.getDate() + ' ' + SHORT_MONTHS[d.getMonth()] + ' ' +
    pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

/**
 * Convert a number to a string and pad numbers from [0-9] with a leading '0'.
 */
function pad2(n) {
  return n < 10 && n >= 0 ? '0' + n.toString(10) : n.toString(10);
}
