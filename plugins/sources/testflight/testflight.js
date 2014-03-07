var phantom = require('phantom');
var log = require('winston');
var util = require('util');

module.exports = TestFlight;

var LOGIN_URL = 'https://testflightapp.com/login/';
var BUILDS_URL = 'https://testflightapp.com/dashboard/applications/%s/builds/';
var BUILD_INFO_URL = 'https://testflightapp.com/dashboard/builds/checkpoints/%s/';
var REFRESH_MS = 1000 * 60 * 5;


function TestFlight(config) {
  if (!config.username)
    throw new Error('Missing TestFlight username: ' + JSON.stringify(config));
  if (!config.password)
    throw new Error('Missing TestFlight password: ' + JSON.stringify(config));
  if (!config.app_id)
    throw new Error('Missing TestFlight app_id: ' + JSON.stringify(config));

  this.data = null;
  this.lastUpdated = null;
  this.username = config.username;
  this.password = config.password;
  this.appID = config.app_id;
  var self = this;

  require('events').EventEmitter.call(this);
  init();

  function init() {
    setInterval(update, REFRESH_MS);
    update();
  }

  function update() {
    phantom.create('--load-images=no', function(ph) {
      ph.set('onError', error);

      return ph.createPage(function(page) {
        login(self.username, self.password, page, function(err) {
          if (err) return error(err);

          loadBuilds(self.appID, page, function(err, buildIDs) {
            if (err) return error(err);
            if (!buildIDs.length) return error('No available builds');

            // Fetch the most recent build
            var buildID = buildIDs[0];
            getBuildInfo(buildID, page, function(err, buildInfo) {
              if (err) return error(err);

              self.data = buildInfo.crashes;
              self.lastUpdated = new Date();

              self.emit('data', self.data);
              ph.exit(0);
            });
          });
        });
      });

      function error(err) {
        log.warn(err);
        ph.exit(1);
      }
    });
  }

  function login(username, password, page, callback) {
    page.open(LOGIN_URL, function(status) {
      if (status.toLowerCase() !== 'success') return callback('login(): ' + status);

      page.get('url', function(url) {
        page.set('onLoadFinished', function(status) {
          page.set('onLoadFinished', null);
          if (status.toLowerCase() !== 'success') return callback('login(): ' + status);

          page.get('url', function(url) {
            if (url === 'https://testflightapp.com/login/') {
              // Login error
              page.evaluate(function() {
                return $('.alert-message.block-message').text();
              }, function(err) { callback('login failed: ' + err); });
            } else {
              // Login success
              callback();
            }
          });
        });

        // TODO: Set a timer to ensure onLoadFinished is called in a reasonable
        // period of time

        // Fill out the login form and click submit
        page.evaluate(function(username, password) {
          $('#id_username').val(username);
          $('#id_password').val(password);
          $('form').find('.btn.primary').click();
        }, function() {}, username, password);
      });
    });
  }

  function loadBuilds(appID, page, callback) {
    page.open(util.format(BUILDS_URL, appID), function(status) {
      if (status.toLowerCase() !== 'success') return callback('loadBuilds(): ' + status);

      page.evaluate(function() {
        var buildIDs = [];
        $('tr.pointer').each(function() { buildIDs.push($(this).attr('id').split('/')[4]); });
        return buildIDs;
      }, function(buildIDs) {
        if (!Array.isArray(buildIDs)) return callback('loadBuilds() eval: ' + JSON.stringify(buildIDs));

        callback(null, buildIDs);
      });
    });
  }

  function getBuildInfo(buildID, page, callback) {
    page.open(util.format(BUILD_INFO_URL, buildID), function(status) {
      if (status.toLowerCase() !== 'success') return callback('getBuildInfo(): ' + status);

      page.evaluate(function() {
        var values = [];
        $('.content .vert-nav ul li span').each(function() { values.push(Number($(this).text())); });
        return values;
      }, function(res) {
        if (!Array.isArray(res) || res.length !== 4) return callback('getBuildInfo() eval: ' + JSON.stringify(res));

        var feedback = res[0];
        var sessions = res[1];
        var crashes = res[2];
        var checkpoints = res[3];

        callback(null, { feedback: feedback, sessions: sessions, crashes: crashes, checkpoints: checkpoints });
      });
    });
  }
}

require('util').inherits(TestFlight, require('events').EventEmitter);
