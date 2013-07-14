
function TimeSeries(el, config) {
  var $widget = $(el);
  var pluginCtx = this;
  var graph, xAxis, yAxis;

  function init() {
    $widget.html(
      '<h1 class="title">' + config.title + '</h1>' +
      '<h2 class="value"></h2>' +
      '<p class="more-info">' + config.moreinfo + '</p>' +
      '<p class="last-updated"></p>');
    dataHandler('Loading...');

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
    pluginCtx.on('data', dataHandler);

    graph = new Rickshaw.Graph({
      element: $widget[0],
      width: $widget.width(),
      height: $widget.height(),
      series: [{ color: '#fff', data: [{ x: 0, y: 0 }] }]
    });

    xAxis = new Rickshaw.Graph.Axis.Time({ graph: graph });
    yAxis = new Rickshaw.Graph.Axis.Y({ graph: graph,
      tickFormat: Rickshaw.Fixtures.Number.formatKMBT });

    graph.render();
  }

  function resizeHandler() {
  }

  function unloadHandler() {
  }

  function dataHandler(data, lastUpdated) {
    if (typeof data === 'string') {
      $widget.find('.value').text(data);
      return;
    } else if (typeof data === 'number') {
      $widget.find('.value').text(data);
      graph.series[0].data.push({ x: new Date(lastUpdated), y: data });
    } else if ($.isArray(data)) {
      $widget.find('.value').text(data[data.length - 1].y);
      graph.series[0].data = data;
      // FIXME: Fix x axis dates?
    } else {
      console.warn('TimeSeries got unrecognized data: ' + JSON.stringify(data));
      return;
    }

    graph.render();
  }

  init();
}

// Register this plugin
$dash.registerPlugin('timeseries', TimeSeries);
