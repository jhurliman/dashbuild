var request = require('request');
var log = require('winston');

module.exports = FacebookPage;

var REFRESH_MS = 1000 * 60 * 5;


function FacebookPage(config) {
  if (!config.graph_url || config.graph_url.indexOf('https://') !== 0)
    throw new Error('Invalid FBPage graph_url: ' + JSON.stringify(config));

  this.data = null;
  this.lastUpdated = null;
  this.url = config.graph_url;
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    setInterval(update, REFRESH_MS);
    update();
  }

  function update() {
    request({ url: self.url, json: true }, function(err, res, body) {
      if (err) return log.warn(err);

      var likes = body.likes || 0;
      self.data = likes;
      self.lastUpdated = new Date();

      self.emit('data', self.data);
    });
  }
}

require('util').inherits(FacebookPage, require('events').EventEmitter);
