var async = require('async');
var fs = require('fs');
var path = require('path');

var WIDGETS_PATH = path.resolve(__dirname, '..', 'plugins', 'widgets');
var DATASOURCES_PATH = path.resolve(__dirname, '..', 'plugins', 'datasources');

module.exports = function(app) {
  app.get('/api/dashboards/:id', dashboard);
  app.get('/api/widgets', widgets);
  app.get('/api/datasources', dataSources);
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

function widgets(req, res, next) {
  res.type('json');

  findPlugins(WIDGETS_PATH, function(err, plugins) {
    if (err) return next(err);
    res.json({ plugins: plugins });
  });
}

function dataSources(req, res, next) {
  res.type('json');

  findPlugins(DATASOURCES_PATH, function(err, plugins) {
    if (err) return next(err);
    res.json({ plugins: plugins });
  });
}

function findPlugins(basePath, callback) {
  var plugins = [];

  // List all of the files/folders in the plugins/ dir
  fs.readdir(basePath, function(err, pluginDirs) {
    if (err) return callback(err, null);

    async.each(pluginDirs,
      function(dir, done) {
        checkPlugin(path.join(basePath, dir), function(err, plugin) {
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

          callback(null, {
            name: manifest.name,
            display_name: manifest.display_name,
            assets: assetList,
            provides: manifest.provides,
            config: manifest.config
          });
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
