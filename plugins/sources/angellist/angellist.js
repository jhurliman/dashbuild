var request = require('request');
var log = require('winston');

module.exports = AngelList;

var DEFAULT_REFRESH_MIN = 30;


function AngelList(config) {
  this.data = null;
  this.lastUpdated = null;
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    var refreshMS = (config.refresh_min || DEFAULT_REFRESH_MIN) * 60 * 1000;
    setInterval(update, refreshMS);
    update();
  }

  function update() {
    var url = 'http://api.angel.co/1/{0}/{1}/followers'
      .replace('{0}', config.type === 'user' ? 'users' : 'startups')
      .replace('{1}', config.id);

    request({ url: url, json: true }, function(err, res, body) {
      if (err) return log.warn(err);

      if (body && body.total !== undefined) {
        self.data = body.total;
        self.lastUpdated = new Date();
        self.emit('data', self.data);
      } else {
        log.warn('Unrecognized response: ' + JSON.stringify(body));
      }
    });
  }
}

require('util').inherits(AngelList, require('events').EventEmitter);
