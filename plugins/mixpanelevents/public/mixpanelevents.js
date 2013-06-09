
function mixpanelEvents(el) {
  var REFRESH_MS = 1000 * 60 * 60 * 5; // 5 minutes
  var API_KEY = 'xxx';
  var API_SECRET = 'xxx';
  var EVENTS_URL = 'http://mixpanel.com/api/2.0/events/';

  var $widget = $(el);
  var pluginCtx = this;
  var updateTimer;

  function init() {
    $widget.text('Loading...');

    pluginCtx.on('resize', resizeHandler);
    pluginCtx.on('unload', unloadHandler);
    updateTimer = setInterval(update, REFRESH_MS);
    update();
  }

  function resizeHandler() {
    $widget.bigtext({
      maxfontsize: 190,
      childSelector: '.big-label',
      resize: false
    });

    // HACK: Manual vertical centering
    var $label = $widget.find('.big-label');
    var height = $label.height();
    var containerHeight = $label.parent().innerHeight();
    var offset = containerHeight/2 - height/2;
    $label.css('top', offset + 'px');
  }

  function unloadHandler() {
    // Destroy the update timer
    clearInterval(updateTimer);
  }

  function update() {
    var params = {
      event: JSON.stringify(['page_view']),
      type: 'unique',
      unit: 'month',
      interval: 1,
      format: 'json'
    };

    signRequest(params);

    $.getJSON(EVENTS_URL + '?callback=?', params, function (res) {
      var curMonth = Object.keys(res.data.values.page_view)[0];
      var uniques = $dashutils.formatNumber(res.data.values.page_view[curMonth]);

      $widget.html('<div class="big-label">' + uniques + '</div>');
      resizeHandler();
    });
  }

  function signRequest(params) {
    // Add required parameters
    params.api_key = API_KEY;
    params.expire = ~~(new Date() / 1000 + 3600);

    // Sort the query parameters by key name
    var keys = Object.keys(params);
    keys = keys.sort();

    // Concatenate key/value pairs
    var query = '';
    for (var i = 0; i < keys.length; i++)
      query += keys[i] + '=' + params[keys[i]];

    // Sign the request
    params.sig = $.md5(query + API_SECRET);
  }

  init();
}

// Register this plugin
$dash.registerPlugin('mixpanelevents', mixpanelEvents);
