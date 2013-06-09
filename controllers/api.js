var async = require('async');
var fs = require('fs');
var path = require('path');

var PLUGIN_PATH = path.resolve(__dirname + '/../plugins');

module.exports = function(app) {
  app.get('/api/dashboards/:id', dashboard);
  app.get('/api/plugins', plugins);
};

function dashboard(req, res, next) {
  var dashID = req.params.id;

  if (dashID !== 'default')
    return next();

  res.type('json');

  res.json({
    layouts: {
      columns_5: {
        columns: 5,
        widgets: {
          //a: { type: 'helloworld', x: 1, y: 1, cols: 1, rows: 1 },
          //b: { type: 'mixpanelevents', x: 2, y: 1, cols: 2, rows: 1 }
        }
      }
    }
  });
}

function plugins(req, res, next) {
  res.type('json');

  findPlugins(function(err, plugins) {
    if (err) return next(err);

    res.json({ plugins: plugins });
  });
}

function findPlugins(callback) {
  var plugins = [];

  // List all of the files/folders in the plugins/ dir
  fs.readdir(PLUGIN_PATH, function(err, pluginDirs) {
    if (err) return callback(err, null);

    async.each(pluginDirs,
      function(dir, done) {
        checkPlugin(path.join(PLUGIN_PATH, dir), function(err, plugin) {
          if (err) return done(err);

          if (plugin)
            plugins.push(plugin);

          done();
        });
      },
      function(err) {
        if (err) return callback(err, null);

        // Alphabetize the plugins
        plugins.sort(function(a, b) {
          return a.name === b.name ? 0 : a.name > b.name ? -1 : 0;
        });

        callback(null, plugins);
      }
    );
  });
}

function checkPlugin(dirName, callback) {
  // Fetch info for this directory
  fs.stat(dirName, function(err, dir) {
    if (err) return callback(err, null);
    if (!dir.isDirectory())
      return callback(null, null);

    // List all of the top-level files/folders in this plugin's dir
    fs.readdir(dirName, function(err, pluginFiles) {
      if (err) return callback(err, null);

      // Look for the manifest file (plugin.json)
      var manifestFile = pluginFiles[pluginFiles.indexOf('plugin.json')];
      if (!manifestFile)
        return callback(null, null);

      // Parse the manifest file
      fs.readFile(path.join(dirName, manifestFile), function(err, data) {
        if (err) return callback(err, null);

        var manifest;
        try { manifest = JSON.parse(data); }
        catch (ex) { return callback(ex, null); }

        // Get the list of JS/CSS assets for this plugin
        findAssets(path.join(dirName, 'public'), function(err, assetList) {
          if (err) return callback(err, null);

          callback(null, { name: manifest.name, assets: assetList });
        });
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
