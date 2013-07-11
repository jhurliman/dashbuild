
// FIXME: Finish data source selection

// FIXME: Instantiate all "datasource" objects in addWidgetHandler()

// TODO: Finish renderWidgetConfig()

// TODO:  Validate all form entries (need a "required" JSON attribute?) and
//        only unlock "add/choose" buttons when form is valid. Use a lib for this?

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
  this.availableWidgets = {};
  this.availableSources = {};
  this.loadedPlugins = {};
  this.activeDataSourceHookup = null;

  // Private members
  var ctx = this;
  var loadingWidget = null;

  this.init = function init() {
    // Initialize the grid
    ctx.$grid = $('.gridster > ul');
    ctx.grid = ctx.$grid.gridster({
      widget_margins: [ ctx.WIDGET_MARGIN_X, ctx.WIDGET_MARGIN_Y ],
      widget_base_dimensions: [ ctx.WIDGET_WIDTH, ctx.WIDGET_HEIGHT ]
    }).data('gridster');

    $(window).bind('debouncedresize', resizeHandler);
    resizeHandler();

    // Add widget modal hooks
    $('#add-widget').on('shown', loadWidgetListHandler);
    $('#add-widget .widget-list').bind('change', changeWidgetListHandler);
    $('#add-widget .btn-primary').click(addWidgetHandler);

    $('#add-widget').on('click', '#select-data-source', showDataSourcesHandler);

    // Add data source modal hooks
    $('#choose-datasource').on('shown', loadDataSourceListHandler);
    $('#choose-datasource .datasource-list').bind('change', changeDataSourceListHandler);
    $('#choose-datasource .btn-primary').click(addDataSourceHandler);

    $('.dashboard').on('click', '.widget-settings-btn', settingsClickHandler);
    $('.dashboard').on('click', '.edit-overlay .close', function() { $(this).parent().hide(); });
    $('.dashboard').on('click', '.edit-overlay .arrow', resizeClickHandler);

    // Load the default dashboard
    ctx.loadDashboard('default');
  };

  this.loadDashboard = function loadDashboard(name) {
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
        console.log('Loading dashboard ' + name);
        ctx.apiGET('/api/dashboards/' + name, function(err, dashboard) {
          if (err) return showError(err);

          ctx.dashboard = dashboard;

          var cols = getColumns();
          var layout = getBestLayout(cols, dashboard);
          console.log('Loaded dashboard ' + name + ', current layout is ' + cols +
            ' columns. Using ' + layout.columns + ' column layout');

          dashboard.loaded = {
            layout: layout,
            widgets: {}
          };

          for (var widgetID in layout.widgets)
            addWidget(layout.widgets[widgetID]);
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
    if (ctx.loadedPlugins[plugin.name]) {
      console.log('Assets already loaded for plugin ' + plugin.name);
      return callback(null);
    }

    ctx.loadedPlugins[plugin.name] = plugin;

    console.log('Loading assets for plugin ' + plugin.name);

    async.each(plugin.assets,
      function(asset, done) {
        if (asset.match(/\.css$/))
          ctx.loadCSS('/widgets/' + plugin.name + '/' + asset, done);
        else if (asset.match(/\.js/))
          ctx.loadJS('/widgets/' + plugin.name + '/' + asset, done);
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

  this.showError = function showError(err) {
    console.error(err.stack || err);
    alert(err.error || err.message || err);
  };

  function getBestLayout(cols, dashboard) {
    var i;

    // Look for an exact match
    var best = dashboard.layouts['columns_' + cols];
    if (best)
      return best;

    // Look for the next higher column layout
    for (i = cols + 1; i <= MAX_COLS; i++) {
      best = dashboard.layouts['columns_' + i];
      if (best)
        return best;
    }

    // Look for the next lower column layout
    for (i = cols - 1; i >= 1; i--) {
      best = dashboard.layouts['columns_' + i];
      if (best)
        return best;
    }

    // Return an empty layout
    return { columns: cols, widgets: {} };
  }

  function addWidget(options) {
    if (!options.type)
      throw new Error('Missing required widget type');

    var widgetID = options.widgetID || createUUID();
    var x = options.x || 1;
    var y = options.y || 1;
    var rows = options.rows || 1;
    var cols = options.cols || 1;
    var type = options.type;
    var title = options.title || options.type;
    var config = options.config || {};
    var instance = options.instance;

    console.log('Adding ' + type + ' widget ' + widgetID + ' (x=' + x +
      ', y=' + y + ', w=' + cols + ', h=' + rows + ')');

    var html = '<li class="widget ' + type + '" data-col="' + x +
      '" data-row="' + y + '" data-sizex="' + cols + '" data-sizey="' +
      rows + '" data-widgetid="' + widgetID + '">' +
        '<div class="widget-header">' +
          '<div class="widget-title">' + title + '</div>' +
          '<i class="widget-settings-btn icon-cog"></i>' +
        '</div>' +
        '<div class="widget-content"></div>' +
        '<div class="edit-overlay">' +
          '<button type="button" class="close">&times;</button>' +
          '<button type="button" class="btn btn-danger delete">Delete</button>' +
          '<button type="button" class="arrow up" data-dir="up"><i class="icon-arrow-up"></i></button>' +
          '<button type="button" class="arrow left" data-dir="left"><i class="icon-arrow-left"></i></button>' +
          '<button type="button" class="arrow right" data-dir="right"><i class="icon-arrow-right"></i></button>' +
          '<button type="button" class="arrow down" data-dir="down"><i class="icon-arrow-down"></i></button>' +
        '</div>' +
      '</li>';

    ctx.dashboard.loaded.widgets[widgetID] = {
      type: type,
      el: ctx.grid.add_widget(html, cols, rows, x, y),
      instance: instance,
      config: config
    };
  }

  function renderWidgetConfig(config) {
    var html = '';

    for (var i = 0; i < config.length; i++) {
      var entry = config[i];

      switch (entry.type) {
        case 'datasource':
          html += '<label>Data Source:</label> ' +
            '<span id="selected-data-source"></span> ' +
            '<a href="#select-data-source" id="select-data-source" class="btn" data-type="' +
              entry.data_type + '">Select Data Source</a>';
          break;
      }
    }

    $('#widget-config').html(html);
  }

  function createUUID() {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, function(c) {
      return (Math.random()*16|0).toString(16);
    });
  }

  function getWidgetConfig() {
    //$('#add-widget .widget-list')
    return null;
  }

  function loadWidgetListHandler() {
    var $list = $('#add-widget .widget-list');

    ctx.availableWidgets = {};
    $list.empty();
    $('#add-widget .btn-primary').addClass('disabled');

    console.log('Loading widget list');
    ctx.apiGET('/api/widgets', function(err, data) {
      if (err) return showError(err);

      console.log('Loaded list of ' + data.plugins.length + ' widgets');

      for (var i = 0; i < data.plugins.length; i++) {
        var plugin = data.plugins[i];
        ctx.availableWidgets[plugin.name] = plugin;
        $list.append('<option value="' + plugin.name + '">' + plugin.display_name + '</option>');
      }

      changeWidgetListHandler();
    });
  }

  function loadDataSourceListHandler() {
    var $list = $('#choose-datasource .datasource-list');

    ctx.availableSources = {};
    $list.empty();
    $('#choose-datasource .btn-primary').addClass('disabled');

    console.log('Loading data source list');
    ctx.apiGET('/api/datasources', function(err, data) {
      if (err) return showError(err);

      console.log('Loaded list of ' + data.plugins.length + ' data sources');

      if (activeDataSourceHookup) {
        for (var i = 0; i < data.plugins.length; i++) {
          var plugin = data.plugins[i];

          // Check if this data source provides the data type we're looking for
          if (plugin.provides.indexOf(activeDataSourceHookup.needs) !== -1) {
            ctx.availableSources[plugin.name] = plugin;
            $list.append('<option value="' + plugin.name + '">' + plugin.display_name + '</option>');
          }
        }
      }

      changeDataSourceListHandler();
    });
  }

  function changeWidgetListHandler() {
    var name = $('#add-widget .widget-list').val();
    if (!name)
      return;

    var widget = ctx.availableWidgets[name];
    if (!widget)
      return showError('Unknown widget ' + name);

    renderWidgetConfig(widget.config);

    $('#add-widget .btn-primary').removeClass('disabled');
  }

  function changeDataSourceListHandler() {
    // TODO: 

    var name = $('#choose-datasource .datasource-list').val();
    if (!name)
      return;

    var plugin = ctx.availableSources[name];
    if (!plugin)
      return showError('Unknown data source ' + name);

    ctx.loadPlugin(plugin, function(err) {
      if (err) return showError(err);
    });

    //$('#choose-datasource .btn-primary').removeClass('disabled');
  }

  function showDataSourcesHandler() {
    ctx.activeDataSourceHookup = {
      needs: $(this).attr('data-type'),
      element: $(this)
    };

    $('#choose-datasource').modal('show');
  }

  function pluginLoadedHandler(name, pluginObj) {
    for (var widgetID in ctx.dashboard.loaded.widgets) {
      var widget = ctx.dashboard.loaded.widgets[widgetID];
      if (widget.instance || widget.type !== name)
        continue;

      console.log('Creating instance of ' + name + ' - ' + widgetID);
      widget.instance = new pluginObj(widget.el.find('.widget-content'), widget.config);
    }
  }

  function resizeHandler() {
    var cols = ctx.getColumns();
    if (cols === ctx.prevCols)
      return;

    // Resize all of the widgets
    $('.widget').each(function() {
      var $w = $(this);
      var widgetCols = parseInt($w.attr('data-sizex'), 10);
      var widgetCol = parseInt($w.attr('data-col'), 10);

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
          var x = parseInt(widget.el.attr('data-col'), 10);
          var y = parseInt(widget.el.attr('data-row'), 10);
          var w = parseInt(widget.el.attr('data-sizex'), 10);
          var h = parseInt(widget.el.attr('data-sizey'), 10);

          widget.instance.trigger('resize', {
            x: x,
            y: y,
            cols: w,
            rows: h,
            gridCols: cols
          });
        }
      }
    }

    ctx.prevCols = cols;
  }

  function addWidgetHandler(e) {
    e.preventDefault();
    var $btn = $(this);

    if (!ctx.dashboard)
      return showError('No dashboard loaded');

    var name = $('#add-widget .widget-list').val();
    if (!name)
      return;

    var config = getWidgetConfig();
    if (!config)
      return showError('Invalid widget config');

    var title = $('#add-widget .widget-title').val() || name;

    var plugin = ctx.availableWidgets[name];
    if (!plugin)
      return showError('Unknown widget ' + name);

    $btn.button('loading');
    ctx.loadPlugin(plugin, function(err) {
      $btn.button('reset');
      $('#add-widget').modal('hide');
      if (err) return ctx.showError(err);

      addWidget({ type: name, config: config });

      // Check if the plugin JS is already loaded
      var loadedPlugin = ctx.loadedPlugins[name];
      if (loadedPlugin && loadedPlugin.obj) {
        console.log('Calling pluginLoadedHandler with already loaded plugin ' + name);
        pluginLoadedHandler(name, loadedPlugin.obj);
      }
    });
  }

  function addDataSourceHandler(e) {
    e.preventDefault();

    if (!ctx.activeDataSourceHookup)
      return showError('Unsure what to do with the current data source');

    // Convert the data source config form to a JS object
    var config = getDashboardConfig();
    if (!config)
      return showError('Invalid dashboard config');

    // Serialize the config info and hand it back to the select widget form
    ctx.activeDataSourceHookup.val(JSON.stringify(config));
    ctx.activeDataSourceHookup = null;

    $('#choose-datasource').modal('hide');
  }

  function settingsClickHandler(e) {
    var $widget = $(this).parents('.widget');
    var widgetID = $widget.attr('data-widgetid');
    if (!widgetID)
      return;

    console.log('Enabling edit mode for widget ' + widgetID);
    $widget.find('.edit-overlay').show();
  }

  function resizeClickHandler(e) {
    var $widget = $(this).parents('.widget');
    var widgetID = $widget.attr('data-widgetid');
    if (!widgetID)
      return;

    var widget = ctx.dashboard.loaded.widgets[widgetID];
    if (!widget)
      return;

    var cols = parseInt($widget.attr('data-sizex'), 10);
    var rows = parseInt($widget.attr('data-sizey'), 10);
    var x = parseInt($widget.attr('data-col'), 10);
    var y = parseInt($widget.attr('data-row'), 10);
    var gridCols = ctx.getColumns();
    var dir = $(this).attr('data-dir');

    switch (dir) {
      case 'up':
        if (rows < 2) return;
        rows--;
        break;
      case 'left':
        if (cols < 2) return;
        cols--;
        break;
      case 'down':
        rows++;
        break;
      case 'right':
        if (cols >= gridCols) return;
        cols++;
        break;
    }

    console.log('Resizing widget ' + widgetID + ' (' + cols + ', ' + rows + ')');

    $widget.attr('data-sizex', cols);
    $widget.attr('data-sizey', rows);
    ctx.grid.resize_widget($widget, cols, rows);
    ctx.grid.init();

    // Wait for the resize animation to finish
    setTimeout(function() {
      widget.instance.trigger('resize', {
        x: x,
        y: y,
        cols: cols,
        rows: rows,
        gridCols: gridCols
      });
    }, 500);
  }

  return this;
})();


// Start the app
$(function() { $dash.init(); });
