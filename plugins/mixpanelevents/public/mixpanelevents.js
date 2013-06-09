
function mixpanelEvents(el) {
  var REFRESH_MS = 1000 * 60 * 60 * 5; // 5 minutes
  var API_KEY = 'xxx';
  var API_SECRET = 'xxx';
  var EVENTS_URL = 'http://mixpanel.com/api/2.0/events/';

  var $widget = $(el);
  var pluginCtx = this;

  function init() {
    $widget.text('Loading...');

    pluginCtx.on('resize', resizeHandler);
    setInterval(update, REFRESH_MS);
    update();
  }

  function resizeHandler(e) {
    // We don't have any special drawing requirements so no need to do anything
    console.log(JSON.stringify(e));
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
      $widget.bigtext();
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
