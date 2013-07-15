var AWS = require('aws-sdk');
var log = require('winston');
var util = require('util');

module.exports = CloudWatch;

var DEFAULT_REFRESH_MIN = 5;
var MAX_DATA_POINTS = 1440;

function CloudWatch(config) {
  this.data = null;
  this.lastUpdated = null;
  var self = this;
  var cloudWatch;
  var namespace = config.namespace || 'AWS/EC2';
  var metricName = config.metric || 'CPUUtilization';
  var periodSeconds = config.period_minutes ? config.period_minutes * 60 : 60;
  var endTime = new Date();
  // MAX_DATA_POINTS = duration_seconds / period_seconds
  var startTime = new Date(endTime.getTime() - periodSeconds * MAX_DATA_POINTS * 1000);
  var statistics = config.statistic ? config.statistic : ['Average']; // ex: Sum, Maximum, Minimum, SampleCount, Average
  var dimensions = config.dimensions || []; // ex: [{ Name: 'InstanceId', Value: 'i-5272b88a' }]
  var unit = config.unit || null;

  console.log(startTime);
  console.log(endTime);

  require('events').EventEmitter.call(this);
  init();

  function init() {
    AWS.config.update({
      accessKeyId: config.aws_access_key,
      secretAccessKey: config.aws_secret_key,
      region: config.aws_region
    });

    cloudWatch = new AWS.CloudWatch({ apiVersion: '2010-08-01' });

    var refreshMS = (config.refresh_min || DEFAULT_REFRESH_MIN) * 60 * 1000;
    setInterval(update, refreshMS);
    update();
  }

  function update() {
    var params = {
      Namespace: namespace,
      MetricName: metricName,
      Dimensions: dimensions,
      StartTime: startTime,
      EndTime: endTime,
      Period: periodSeconds,
      Statistics: statistics
    };
    if (dimensions)
      params.Dimensions = dimensions;
    if (unit)
      params.Unit = unit;

    cloudWatch.getMetricStatistics(params, function(err, data) {
      if (err) return log.error(util.inspect(err));

      self.data = data.Datapoints;

      // Convert the AWS response to an array of x/y objects
      var key = statistics[0];

      for (var i = 0; i < self.data.length; i++) {
        var p = self.data[i];
        if (p[key] === undefined)
          return log.error('Missing statistic ' + key + ' in element ' + JSON.stringify(d));

        self.data[i] = { x: (new Date(p.Timestamp)).getTime() / 1000, y: p[key] };
      }

      self.data.sort(function(a, b) { return a.x - b.x; });

      self.lastUpdated = new Date();
      self.emit('data', self.data);
    });
  }
}

require('util').inherits(CloudWatch, require('events').EventEmitter);
