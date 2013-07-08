
function Mixpanel(config) {
  var EVENTS_URL = 'http://mixpanel.com/api/2.0/events/';

  var pluginCtx = this;
  var updateTimer;

  function init() {
    var refreshMS = parseInt(config.refresh_min, 10) * 60 * 1000;
    updateTimer = setInterval(update, refreshMS);
    update();
  }

  function update() {
    var params = {
      event: JSON.stringify([ config.event ]),
      type: config.unique ? 'unique' : 'total',
      unit: config.unit,
      interval: 1,
      format: 'json'
    };

    signRequest(params);

    $.getJSON(EVENTS_URL + '?callback=?', params, function (res) {
      var cur = Object.keys(res.data.values[config.event])[0];
      var num = res.data.values[config.event][cur];

      pluginCtx.trigger('data', { value: num });
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

Mixpanel.getConfigForm = function getConfigForm(type) {
  if (type !== 'number')
    throw new Error('Mixpanel data type ' + type + ' is not implemented');

  return $(
    '<label>API Key</label>' +
    '<input type="text" name="api-key"><input>' +
    '<label>API Secret</label>' +
    '<input type="text" name="api-secret"><input>' +
    '<label>Event Name</label>' +
    '<input type="text" name="event"><input>' +
    '<label>Unit</label>' +
    '<input type="text" name="unit"><input>' +
    '<label>Type</label>' +
    '<input type="text" name="unique"><input>' +
    '<label>Refresh Interval (Minutes)</label>' +
    '<input type="text" name="refresh_min"><input>'
  );
};

// Register this plugin
$dash.registerPlugin('mixpanel', Mixpanel);
