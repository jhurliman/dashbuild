
var INDEX_PATH = require('path').resolve(__dirname + '/../public/html/index.html');

module.exports = function(app) {
  app.get('/', index);
};

function index(req, res, next) {
  res.sendfile(INDEX_PATH);
}
