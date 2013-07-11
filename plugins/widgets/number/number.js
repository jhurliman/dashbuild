
function NumberWidget(el, config) {
  var $widget = $(el);
  var pluginCtx = this;

  function init() {
    $widget.html('<div class="big-label"></div>');
    dataHandler('Loading...');

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
    pluginCtx.on('data', dataHandler);
  }

  function resizeHandler() {
    // Resize the text to fill available space
    $widget.bigtext({
      maxfontsize: 190,
      childSelector: '.big-label',
      resize: false
    });

    // HACK: Manual vertical centering
    var $label = $widget.find('.big-label');
    var height = $label.height();
    var containerHeight = $label.parent().innerHeight();
    var offset = containerHeight/2 - height/2 - 10;
    $label.css('top', offset + 'px');
  }

  function unloadHandler() {
  }

  function dataHandler(data) {
    var num;
    if (!isNaN(parseInt(data, 10))) {
      num = $dashutils.formatNumber(parseInt(data, 10)); // Scalar value
    } else if (data.length) {
      if (data[data.length - 1].y !== undefined)
        num = $dashutils.formatNumber(parseInt(data[data.length - 1].y, 10)); // Time-series plot
      else
        num = $dashutils.formatNumber(data.length); // Array length
    } else {
      num = data; // Non-numeric
    }

    var $label = $widget.find('.big-label');
    var prev = $label.text();
    $label.text(num);
    resizeHandler();
    $label.text(prev);
    $label.animateNumbers(num);
  }

  init();
}

// Register this plugin
$dash.registerPlugin('number', NumberWidget);
