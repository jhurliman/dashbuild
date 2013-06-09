
module.exports = function(app) {
  app.get('/api/dashboards/:id', dashboard);
  app.get('/api/plugins', plugins);
};

function dashboard(req, res, next) {
  var dashID = req.params.id;

  if (dashID !== 'default')
    return next();

  res.type('json');

  res.json({
    layouts: {
      columns_5: {
        columns: 5,
        widgets: {
          //a: { type: 'helloworld', x: 1, y: 1, cols: 1, rows: 1 },
          //b: { type: 'mixpanelevents', x: 2, y: 1, cols: 2, rows: 1 }
        }
      }
    }
  });
}

function plugins(req, res, next) {
  res.type('json');

  res.json({
    plugins: [
      { name: 'helloworld', assets: [] },
      { name: 'mixpanelevents', assets: [ 'mixpanelevents.js', 'mixpanelevents.css' ] }
    ]
  });
}
