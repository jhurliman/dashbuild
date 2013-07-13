
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

    // HACK: Manual vertical centering
    /*var $label = $widget.find('.big-label');
    var height = $label.height();
    var containerHeight = $label.parent().innerHeight();
    var offset = containerHeight/2 - height/2 - 10;
    $label.css('top', offset + 'px');*/
  }

  function unloadHandler() {
  }

  function dataHandler(data, lastUpdated) {
    var num;
    if (!isNaN(parseInt(data, 10))) {
      num = parseInt(data, 10); // Scalar value
    } else if (typeof data === 'string') {
      num = data; // Non-numeric string
    } else if (data.length) {
      if (data[data.length - 1].y !== undefined)
        num = parseInt(data[data.length - 1].y, 10); // Time-series plot
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
    var $label = $widget.find('.big-label');
    var lastLen = $label.text().length;

    // Can't animate non-numeric values
    if (typeof start !== 'number' || typeof stop !== 'number') {
      $label.text(prefix + stop + suffix);
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
        Math.floor(val).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,') +
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
