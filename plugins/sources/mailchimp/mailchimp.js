var MailChimpAPI = require('mailchimp').MailChimpAPI;
var log = require('winston');

module.exports = Mailchimp;

var REFRESH_MS = 1000 * 60 * 5;


function Mailchimp(config) {
  if (!config.api_key)
    throw new Error('Missing Mailchimp api_key: ' + JSON.stringify(config));
  if (!config.list_id)
    throw new Error('Missing Mailchimp list_id: ' + JSON.stringify(config));

  this.data = null;
  this.lastUpdated = null;
  this.api = new MailChimpAPI(config.api_key, { version : '2.0' });
  this.listID = config.list_id;
  this.field = config.field || 'subs';
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    setInterval(update, REFRESH_MS);
    update();
  }

  function update() {
    self.api.call('lists', 'activity', { id: self.listID }, function(err, data) {
      if (err) return log.warn(err);

      // Convert the returned data array into an array of x/y pairs
      self.data = data.map(function(entry) {
        return { x: new Date(entry.day).getTime() / 1000, y: entry[self.field] || 0 };
      });
      self.lastUpdated = new Date();

      self.data.sort(function(a, b) { return a.x - b.x; });

      self.emit('data', self.data);
    });
  }
}

require('util').inherits(Mailchimp, require('events').EventEmitter);
