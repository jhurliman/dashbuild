var log = require('winston');
var qs = require('querystring');
var zlib = require('zlib');
var OAuth = require('oauth').OAuth;

module.exports = Twitter;

var DEFAULT_REFRESH_MIN = 10;
var REQUEST_TOKEN_URL = 'https://api.twitter.com/oauth/request_token';
var ACCESS_TOKEN_URL = 'https://api.twitter.com/oauth/access_token';
var SEARCH_URL = 'https://api.twitter.com/1.1/search/tweets.json';

var HEADERS = {
  'Accept': '*/*',
  'Accept-Encoding': 'gzip',
  'Connection': 'keep-alive',
  'User-Agent': 'dashbuild-twitter/' + require('./package').version
};


function Twitter(config) {
  this.data = null;
  this.lastUpdated = null;
  var oauth;
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    if (!config.twitter.consumer_key || config.twitter.consumer_key === 'YOUR_CONSUMER_KEY' ||
        !config.twitter.consumer_secret || config.twitter.consumer_secret === 'YOUR_CONSUMER_SECRET' ||
        !config.twitter.access_token_key || config.twitter.access_token_key === 'YOUR_OAUTH_TOKEN' ||
        !config.twitter.access_token_secret || config.twitter.access_token_secret === 'YOUR_OAUTH_SECRET')
    {
      throw new Error('Invalid Twitter config ' + JSON.stringify(config));
    }

    var refreshMS = (config.refresh_min || DEFAULT_REFRESH_MIN) * 60 * 1000;
    setInterval(updateTweets, refreshMS);
    updateTweets();
  }

  function updateTweets() {
    log.debug('Updating Twitter mentions');
    fetchTweets(function(err, tweets) {
      if (err) {
        log.warn('Failed to update Twitter mentions: ' + err);
        tweets = [];
      } else {
        log.debug('Found ' + tweets.length + ' Twitter mentions');
      }

      tweets = tweets.map(function(tweet) {
        return { name: tweet.user.name, body: tweet.text,
          avatar: tweet.user.profile_image_url_https };
      });

      self.data = tweets;
      self.lastUpdated = new Date();

      self.emit('data', self.data);
    });
  }

  function fetchTweets(callback) {
    var url = SEARCH_URL + '?' + qs.stringify(config.query);

    var req = getOAuth().get(url, config.twitter.access_token_key,
      config.twitter.access_token_secret);

    req.on('response', function(res) {
      var compressed = (res.headers['content-encoding'] || '')
        .toLowerCase()
        .indexOf('gzip') !== -1;
      var body = compressed ? res.pipe(zlib.createUnzip()) : res;

      if (res.statusCode !== 200) {
        var err = res.statusCode + ' ';

        body.on('data', function(data) { err += data; });
        body.on('end', function() { callback(err.trim(), null); });
        return;
      }

      var bodyData = '';

      body.on('data', function(data) { bodyData += data.toString(); });

      body.on('end', function() {
        var tweets;

        try { tweets = JSON.parse(bodyData); }
        catch (ex) { return callback('Failed to decode body: ' + ex, null); }

        if (!tweets || typeof tweets.length === 'undefined')
          return callback('Unrecognized response: ' + bodyData, null);

        callback(null, tweets);
      });
    });

    req.on('error', function(err) {
      callback(err, null);
    });

    req.end();
  }

  function getOAuth() {
    if (oauth)
      return oauth;

    oauth = new OAuth(
      REQUEST_TOKEN_URL,
      ACCESS_TOKEN_URL,
      config.twitter.consumer_key,
      config.twitter.consumer_secret,
      '1.0', null, 'HMAC-SHA1', null,
      HEADERS);

    return oauth;
  }
}

require('util').inherits(Twitter, require('events').EventEmitter);
