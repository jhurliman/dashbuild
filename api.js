var async = require('async');
var fs = require('fs');
var path = require('path');
var nconf = require('nconf');

var WIDGETS_PATH = path.join(__dirname, 'plugins', 'widgets');

module.exports = function(app) {
  app.get('/api/dashboard', dashboard);
  app.get(/^\/api\/widgets\/([^\/]+)\/(.+)$/, widgetAsset);
};

function dashboard(req, res, next) {
  var widgets = nconf.get('widgets');
  var plugins = {};

  // Find all of the plugins mentioned in the layout
  for (var i = 0; i < widgets.length; i++) {
    var widget = widgets[i];
    plugins[widget.widget] = null;
  }

  async.map(Object.keys(plugins), checkPlugin,
    function(err, plugins) {
      if (err) return next(err);

      res.json({ widgets: widgets, plugins: plugins });
    }
  );
}

function checkPlugin(pluginName, callback) {
  var dirName = path.join(WIDGETS_PATH, pluginName);

  // Fetch info for this directory
  fs.stat(dirName, function(err, dir) {
    if (err) return callback(err, null);
    if (!dir.isDirectory())
      return callback('Invalid plugin directory ' + pluginName, null);

    // Get the list of JS/CSS assets for this plugin
    findAssets(dirName, function(err, assetList) {
      if (err) return callback(err, null);

      callback(null, {
        name: pluginName,
        assets: assetList
      });
    });
  });
}

function findAssets(dir, callback) {
  fs.readdir(dir, function(err, files) {
    if (err) {
      if (err.code === 'ENOENT')
        return callback(null, []);
      return callback(err, null);
    }

    var assets = files.filter(function(file) {
      return file.match(/\.(?:js|css)$/);
    });

    callback(null, assets);
  });
}

function widgetAsset(req, res, next) {
  var pluginName = req.params[0];
  var pluginPath = req.params[1];

  // Safety
  if (pluginName.indexOf('..') !== -1 || pluginPath.indexOf('..') !== -1)
    return next();

  var filename = path.join(WIDGETS_PATH, pluginName, pluginPath);

  // Check if the file exists
  fs.stat(filename, function(err, stats) {
    if (err) return next();
    if (!stats.isFile()) return next();

    // Send the file
    res.sendfile(filename);
  });
}