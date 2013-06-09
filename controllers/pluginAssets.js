var fs = require('fs');
var path = require('path');

var PLUGIN_PATH = path.resolve(__dirname + '/../plugins');

module.exports = function(app) {
  app.get(/^\/plugins\/([^\/]+)\/(.+)$/, pluginAsset);
};

function pluginAsset(req, res, next) {
  var pluginName = req.params[0];
  var pluginPath = req.params[1];

  console.log(pluginName);
  console.log(pluginPath);

  // Safety
  if (pluginName.indexOf('..') !== -1 || pluginPath.indexOf('..') !== -1)
    return next();

  var filename = path.join(PLUGIN_PATH, pluginName, 'public', pluginPath);

  // Check if the file exists
  fs.stat(filename, function(err, stats) {
    if (err) return next();
    if (!stats.isFile()) return next();

    // Send the file
    res.sendfile(filename);
  });
}
