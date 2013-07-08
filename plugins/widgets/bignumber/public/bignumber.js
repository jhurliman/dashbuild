
function BigNumber(el, config) {
  var $widget = $(el);
  var dataSource = config.source;
  var pluginCtx = this;

  function init() {
    dataHandler({ value: 'Loading...' });

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
    dataSource.on('data', dataHandler);
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
    // Destroy the update timer
    clearInterval(updateTimer);
  }

  function dataHandler(e) {
    var num = e.value;
    if (parseInt(num, 10))
      num = $dashutils.formatNumber(num);

    $widget.html('<div class="big-label">' + num + '</div>');
    resizeHandler();
  }

  init();
}

// Register this plugin
$dash.registerPlugin('bignumber', BigNumber);
