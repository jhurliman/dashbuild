var request = require('request');
var qs = require('querystring');
var log = require('winston');

module.exports = Mixpanel;

var EVENTS_URL = 'http://mixpanel.com/api/2.0/events/';
var REFRESH_MS = 1000 * 60 * 5;


function Mixpanel(config) {
  this.data = null;
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    setInterval(update, REFRESH_MS);
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

    request({ url: EVENTS_URL + '?' + qs.stringify(params), json: true }, function(err, res, body) {
      if (err) return log.warn(err);

      var cur = Object.keys(body.data.values[config.event])[0];
      self.data = body.data.values[config.event][cur];

      self.emit('data', self.data);
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
}

require('util').inherits(Mixpanel, require('events').EventEmitter);
