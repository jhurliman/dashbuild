var fs = require('fs');
var path = require('path');

var WIDGETS_PATH = path.resolve(__dirname, '..', 'plugins', 'widgets');
var DATASOURCES_PATH = path.resolve(__dirname, '..', 'plugins', 'datasources');

module.exports = function(app) {
  app.get(/^\/widgets\/([^\/]+)\/(.+)$/, widgetAsset);
  app.get(/^\/datasources\/([^\/]+)\/(.+)$/, dataSourceAsset);
};

function widgetAsset(req, res, next) {
  pluginAsset('widgets', req, res, next);
}

function dataSourceAsset(req, res, next) {
  pluginAsset('datasources', req, res, next);
}

function pluginAsset(basePath, req, res, next) {
  var pluginName = req.params[0];
  var pluginPath = req.params[1];

  // Safety
  if (pluginName.indexOf('..') !== -1 || pluginPath.indexOf('..') !== -1)
    return next();

  var filename;
  if (basePath === 'widgets')
    filename = path.join(WIDGETS_PATH, pluginName, 'public', pluginPath);
  else if (basePath === 'datasources')
    filename = path.join(DATASOURCES_PATH, pluginName, 'public', pluginPath);
  else
    return next();

  // Check if the file exists
  fs.stat(filename, function(err, stats) {
    if (err) return next();
    if (!stats.isFile()) return next();

    // Send the file
    res.sendfile(filename);
  });
}
