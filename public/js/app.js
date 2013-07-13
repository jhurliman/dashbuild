
window.$dash = (function() {
  // Constants
  this.MAX_COLS = 5;
  this.WIDGET_MARGIN_X = 4;
  this.WIDGET_MARGIN_Y = 4;
  this.WIDGET_WIDTH = 224;
  this.WIDGET_HEIGHT = 224;

  // Public members
  this.$grid = null;
  this.grid = null;
  this.dashboard = null;
  this.prevCols = null;
  this.loadedPlugins = {};

  // Private members
  var ctx = this;
  var socket;

  this.init = function init() {
    // Initialize the grid
    ctx.$grid = $('.gridster > ul');
    ctx.grid = ctx.$grid.gridster({
      widget_margins: [ ctx.WIDGET_MARGIN_X, ctx.WIDGET_MARGIN_Y ],
      widget_base_dimensions: [ ctx.WIDGET_WIDTH, ctx.WIDGET_HEIGHT ]
    }).data('gridster');

    $(window).bind('debouncedresize', resizeHandler);
    resizeHandler();

    // Load the dashboard
    ctx.loadDashboard();

    // Initialize socket.io
    socket = io.connect('http://localhost');
    socket.on('data', function(obj) {
      var id = obj.id;
      var data = obj.data;
      var lastUpdated = obj.lastUpdated ? new Date(obj.lastUpdated) : new Date();

      if (ctx.dashboard) {
        var widgets = ctx.dashboard.sourcesToWidgets[id];
        if (widgets) {
          for (var i = 0; i < widgets.length; i++) {
            if (widgets[i].instance)
              widgets[i].instance.trigger('data', data, lastUpdated);
          }
        }
      }
    });
  };

  this.loadDashboard = function loadDashboard() {
    // Unload the currently loaded widgets
    var widgetIDs = ctx.dashboard ? Object.keys(ctx.dashboard.loaded.widgets) : [];
    console.log('Unloading ' + widgetIDs.length + ' widgets');
    async.each(widgetIDs,
      function(widgetID, done) {
        var widget = ctx.dashboard.loaded.widgets[widgetID];
        if (widget.instance)
          widget.instance.trigger('unload');
        delete ctx.dashboard.loaded.widgets[widgetID];
        ctx.grid.remove_widget(widget.el, done);
      },
      function() {
        console.log('Loading dashboard');
        ctx.apiGET('/api/dashboard', function(err, dashboard) {
          if (err) return showError(err);

          console.log('Loaded dashboard, current layout is ' + getColumns() + ' columns.');

          ctx.dashboard = {
            loaded: { layout: dashboard.widgets, widgets: {} },
            sourcesToWidgets: {}
          };

          // Create the widget grid objects
          for (var i = 0; i < ctx.dashboard.loaded.layout.length; i++)
            addWidget(ctx.dashboard.loaded.layout[i]);

          // Load the widget plugins
          async.each(dashboard.plugins, ctx.loadPlugin,
            function(err) {
              if (err) return showError(err);
              console.log('Loaded all plugins');
            }
          );
        });
      }
    );
  };

  this.getColumns = function getColumns() {
    var totalWidth = ctx.$grid.innerWidth();
    var colWidth = WIDGET_MARGIN_X * 2 + WIDGET_WIDTH;
    return ~~(totalWidth / colWidth);
  };

  this.registerPlugin = function registerPlugin(name, pluginObj) {
    if (!ctx.loadedPlugins[name])
      return showError(new Error('Attempted to register unknown plugin ' + name));

    // Give the plugin EventEmitter capabilities
    EventEmitter.inherit(pluginObj);

    ctx.loadedPlugins[name].obj = pluginObj;
    console.log('Calling pluginLoadedHandler with newly loaded plugin ' + name);
    pluginLoadedHandler(name, pluginObj);
  };

  this.loadPlugin = function loadPlugin(plugin, callback) {
    if (ctx.loadedPlugins[plugin.name])
      return callback(null);

    ctx.loadedPlugins[plugin.name] = plugin;

    console.log('Loading assets for plugin ' + plugin.name);

    async.each(plugin.assets,
      function(asset, done) {
        if (asset.match(/\.css$/))
          ctx.loadCSS('/api/widgets/' + plugin.name + '/' + asset, done);
        else if (asset.match(/\.js/))
          ctx.loadJS('/api/widgets/' + plugin.name + '/' + asset, done);
        else
          done('Unrecognized asset ' + asset + ' in plugin ' + plugin);
      },
      function(err) {
        if (err) return callback(err);

        console.log('Loaded assets for plugin ' + plugin.name);
        callback(null);
      }
    );
  };

  this.loadJS = function loadJS(url, callback) {
    console.log('Loading JS from ' + url);
    $.getScript(url)
      .done(function(script, status) {
        console.log('Loaded JS from ' + url + ' with status ' + status);
        callback(null);
      })
      .fail(function(jqxhr, status, ex) {
        ex.endpoint = url;
        callback(ex);
      });
  };

  this.loadCSS = function loadCSS(url, callback) {
    var node = document.createElement('link');
    node.type = 'text/css';
    node.rel = 'stylesheet';
    node.href = url;
    node.media = 'screen';
    document.getElementsByTagName('head')[0].appendChild(node);

    console.log('Loaded CSS from ' + url);
    callback(null);
  };

  this.apiGET = function apiGET(path, callback) {
    $.ajax({
      url: path,
      json: true,
      cache: false,
      timeout: 1000 * 30,
      error: function(xhr, status, err) {
        var errObj;

        try { errObj = $.parseJSON(xhr.responseText); }
        catch (ex) { }

        if (!errObj)
          errObj = { error: status };
        errObj.endpoint = path;

        callback(errObj, null);
      },
      success: function(data, status, xhr) {
        callback(null, data);
      }
    });
  };

  function showError(err) {
    console.error(err.stack || err);
    alert(err.error || err.message || err);
  }

  function addWidget(options) {
    if (!options.widget)
      throw new Error('Missing required widget type');

    var widgetID = options.widgetID || createUUID();
    var x = options.col || 1;
    var y = options.row || 1;
    var rows = options.sizey || 1;
    var cols = options.sizex || 1;
    var type = options.widget;
    var source = options.source;
    var config = options.config || {};
    var instance = options.instance;

    config.title = options.title || options.widget;
    config.moreinfo = options.moreinfo || '';

    console.log('Adding "' + type + '" widget ' + widgetID + ' (x=' + x +
      ', y=' + y + ', w=' + cols + ', h=' + rows + ')');

    var html = '<li class="widget ' + type + '" data-col="' + x +
      '" data-row="' + y + '" data-sizex="' + cols + '" data-sizey="' +
      rows + '" data-widgetid="' + widgetID + '">' +
      '</li>';

    ctx.dashboard.loaded.widgets[widgetID] = {
      type: type,
      el: ctx.grid.add_widget(html, cols, rows, x, y),
      instance: instance,
      config: config
    };

    if (!ctx.dashboard.sourcesToWidgets[source])
      ctx.dashboard.sourcesToWidgets[source] = [];
    ctx.dashboard.sourcesToWidgets[source].push(ctx.dashboard.loaded.widgets[widgetID]);
  }

  function createUUID() {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, function(c) {
      return (Math.random()*16|0).toString(16);
    });
  }

  function pluginLoadedHandler(name, pluginObj) {
    for (var widgetID in ctx.dashboard.loaded.widgets) {
      var widget = ctx.dashboard.loaded.widgets[widgetID];
      if (widget.instance || widget.type !== name)
        continue;

      console.log('Creating instance of ' + name + ' - ' + widgetID);
      widget.instance = new pluginObj(widget.el, widget.config);
    }
  }

  function resizeHandler() {
    var cols = ctx.getColumns();
    if (cols === ctx.prevCols)
      return;

    // Resize all of the widgets
    $('.widget').each(function() {
      var $w = $(this);
      var widgetCols = Number($w.attr('data-sizex'));
      var widgetCol = Number($w.attr('data-col'));

      if (widgetCols > cols)
        ctx.grid.resize_widget($w, cols);

      if (widgetCol > cols)
        $w.attr('data-col', cols);
    });

    // Refresh gridster
    ctx.grid.init();

    // Fire resize events on all of the widgets
    if (ctx.dashboard) {
      var widgetIDs = Object.keys(ctx.dashboard.loaded.widgets);
      for (var i = 0; i < widgetIDs.length; i++) {
        var widget = ctx.dashboard.loaded.widgets[widgetIDs[i]];

        if (widget.instance) {
          widget.instance.trigger('resize', {
            x: Number(widget.el.attr('data-col')),
            y: Number(widget.el.attr('data-row')),
            cols: Number(widget.el.attr('data-sizex')),
            rows: Number(widget.el.attr('data-sizey')),
            gridCols: cols
          });
        }
      }
    }

    ctx.prevCols = cols;
  }

  return this;
})();

// Start the app
$(function() { $dash.init(); });
