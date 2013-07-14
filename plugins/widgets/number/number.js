
function NumberWidget(el, config) {
  var $widget = $(el);
  var pluginCtx = this;
  var prevNum = 0;

  function init() {
    $widget.html(
      '<h1 class="title">' + config.title + '</h1>' +
      '<div class="big-label"></div>' +
      '<p class="more-info">' + config.moreinfo + '</p>' +
      '<p class="last-updated"></p>');
    dataHandler('Loading...');

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
    pluginCtx.on('data', dataHandler);
  }

  function resizeHandler() {
    // Resize the text to fill available space
    $widget.bigtext({
      maxfontsize: 130,
      childSelector: '.big-label',
      resize: false
    });
  }

  function unloadHandler() {
  }

  function dataHandler(data, lastUpdated) {
    var num;
    if (!isNaN(parseFloat(data))) {
      num = parseFloat(data); // Scalar value
    } else if (typeof data === 'string') {
      num = data; // Non-numeric string
    } else if (typeof data.value === 'number') {
      num = data.value; // Ratio (value/maxValue)
    } else if ($.isArray(data)) {
      if (data[data.length - 1].y !== undefined)
        num = parseFloat(data[data.length - 1].y); // Time-series plot
      else
        num = data.length; // Array length
    } else {
      console.warn('Number got unrecognized data: ' + JSON.stringify(data));
      return;
    }

    animateNumber(prevNum, num, lastUpdated, 1000);
  }

  function animateNumber(start, stop, lastUpdated, durationMS) {
    var prefix = config.prefix || '';
    var suffix = config.suffix || '';
    var digits = config.digits || 0;
    var $label = $widget.find('.big-label');
    var lastLen = $label.text().length;

    // Can't animate non-numeric values
    if (typeof start !== 'number' || typeof stop !== 'number') {
      $label.text(stop);
      resizeHandler();
      return;
    }

    $widget.find('.big-label').animate({ value: stop }, {
      duration: durationMS ? durationMS : 1000,
      easing: 'swing',
      step: function() { updateNumber($(this), this.value); },
      complete: function() {
        updateNumber($(this), stop);
        $widget.find('.last-updated').text('Last updated at ' +
          $dashutils.formatAMPM(lastUpdated));
      }
    });

    function updateNumber($this, val) {
      var str = prefix +
        (val || 0).toFixed(digits).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,') +
        suffix;

      $this.text(str);

      if (str.length !== lastLen)
        resizeHandler();
      lastLen = str.length;
    }
  }

  init();
}

// Register this plugin
$dash.registerPlugin('number', NumberWidget);
