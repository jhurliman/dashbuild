var fs = require('fs');
var path = require('path');
var nconf = require('nconf');
var log = require('winston');
var express = require('express');
var expressWinston = require('express-winston');
var utils = require('./utils');

var INDEX_PATH = path.join(__dirname, 'public', 'html', 'index.html');
var SOCKET_IO_LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

var gDataSources;
var gIO;

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
  var server = require('http').createServer(app);

  app.disable('x-powered-by');
  app.set('env', nconf.get('debug') ? 'development' : 'production');
  app.set('trust proxy', nconf.get('using_proxy'));
  app.use(utils.catchRequestErrors);
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.favicon(__dirname + '/public/img/favicon.png'));
  app.use('json spaces', nconf.get('debug'));

  // Setup request logging
  app.use(utils.requestLogger({ transports: log.loggers.options.transports }));

  // Serve static files from pre-defined directories
  var staticOpts = { maxAge: nconf.get('debug') ? 0 : ONE_MONTH };
  app.use('/css', express.static(__dirname + '/public/css', staticOpts));
  app.use('/img', express.static(__dirname + '/public/img', staticOpts));
  app.use('/js', express.static(__dirname + '/public/js', staticOpts));

  // Load all of the controllers
  app.get('/', function(req, res) { res.sendfile(INDEX_PATH); });
  require('./api')(app);

  // Setup error handling/logging
  app.all('*', utils.handle404);
  app.use(app.router);
  app.use(utils.requestErrorLogger({ transports: log.loggers.options.transports }));
  app.use(utils.handle500);

  // Start listening for socket.io connections
  setupSocketIO(server);

  // Start listening for web requests
  server.listen(nconf.get('web_port'), listeningHandler);
}

function setupSocketIO(server) {
  gIO = require('socket.io').listen(server, {
    'log level': SOCKET_IO_LOG_LEVELS[nconf.get('log_level')],
    'logger': { debug: utils.noOp, info: log.info, warn: log.warn, error: log.error },
    'transports': ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']
  });

  gIO.enable('browser client minification'); // send minified client
  gIO.enable('browser client etag'); // apply etag caching logic based on version number
  gIO.enable('browser client gzip'); // gzip the file

  gIO.sockets.on('connection', function(socket) {
    // Send updates for all data sources that have data
    for (var id in gDataSources) {
      var source = gDataSources[id];
      if (source.data)
        socket.emit('data', { id: id, data: source.data });
    }
  });
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

  loadDataSources();
}

function loadDataSources() {
  var config = nconf.get('sources');

  gDataSources = {};

  for (var id in config)
    addDataSource(id, config[id]);
}

function addDataSource(id, entry) {
  var plugin = require(path.join(__dirname, 'plugins', 'sources', entry.source, 'index'));

  var instance = new plugin(entry.config);
  instance.on('data', function(data) { sourceDataHandler(id, data); });

  gDataSources[id] = instance;
}

function sourceDataHandler(id, data) {
  gIO.sockets.emit('data', { id: id, data: data });
}
