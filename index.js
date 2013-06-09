var fs = require('fs');
var path = require('path');
var nconf = require('nconf');
var log = require('winston');
var express = require('express');
var expressWinston = require('express-winston');
var utils = require('./utils');


main();


function main() {
  // Load config settings
  nconf
    .argv()
    .env()
    .file({ file: __dirname + '/config.local.json' })
    .file({ file: __dirname + '/config.json' });

  // Setup console logging
  log.loggers.options.transports = [];
  log.remove(log.transports.Console);
  var logger = log.add(log.transports.Console, { level: nconf.get('log_level'),
    colorize: true, timestamp: utils.shortDate });
  log.loggers.options.transports.push(logger.transports.console);

  // Make sure we have permission to bind to the requested port
  if (nconf.get('web_port') < 1024 && process.getuid() !== 0)
    throw new Error('Binding to ports less than 1024 requires root privileges');

  var app = module.exports = express();

  app.disable('x-powered-by');
  app.set('env', nconf.get('debug') ? 'development' : 'production');
  app.set('trust proxy', nconf.get('using_proxy'));
  app.use(utils.catchRequestErrors);
  app.use(express.bodyParser());
  app.use(express.cookieParser(nconf.get('signing_secret')));
  app.use(express.favicon(__dirname + '/public/img/favicon.png'));
  app.use('json spaces', nconf.get('debug'));

  // Setup request logging
  app.use(expressWinston.logger({
    level: nconf.get('log_level'),
    transports: log.loggers.options.transports
  }));

  // Serve static files from pre-defined directories
  var staticOpts = { maxAge: nconf.get('debug') ? 0 : ONE_MONTH };
  app.use('/css', express.static(__dirname + '/public/css', staticOpts));
  app.use('/img', express.static(__dirname + '/public/img', staticOpts));
  app.use('/js', express.static(__dirname + '/public/js', staticOpts));

  // Load all of the controllers
  var controllers = fs.readdirSync(__dirname + '/controllers');
  for (var i = 0; i < controllers.length; i++) {
    var controller = require('./controllers/' + controllers[i]);
    if (typeof controller === 'function')
      controller(app);
  }

  // Setup error handling/logging
  app.all('*', utils.handle404);
  app.use(app.router);
  app.use(expressWinston.errorLogger({
    dumpExceptions: true,
    showStack: true,
    transports: log.loggers.options.transports
  }));
  app.use(utils.handle500);

  // Start listening for requests
  app.listen(nconf.get('web_port'), listeningHandler);
}

function listeningHandler() {
  // If run_as_user is set, try to switch users
  if (nconf.get('run_as_user')) {
    try {
      process.setuid(nconf.get('run_as_user'));
      log.info('Changed to running as user ' + nconf.get('run_as_user'));
    } catch (err) {
      log.error('Failed to change to user ' + nconf.get('run_as_user') + ': ' + err);
    }
  }

  // Now that we've dropped root privileges (if requested), setup file logging
  // NOTE: Any messages logged before this will go to the console only
  if (nconf.get('log_path')) {
    var logger = log.add(log.transports.File, { level: nconf.get('log_level'),
      filename: nconf.get('log_path') });
    log.loggers.options.transports.push(logger.transports.file);
  }

  log.info('DashBuild is listening on port ' + nconf.get('web_port'));
}
