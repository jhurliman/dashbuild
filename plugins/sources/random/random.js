
module.exports = RandomNumbers;

var MAX_POINTS = 10;
var REFRESH_MS = 1000 * 2;


function RandomNumbers(config) {
  this.data = [];
  this.lastUpdated = null;
  var lastX = 0;
  var self = this;
  var generator;

  switch (config.type) {
    case 'normal':
      generator = function() { return rnorm(config.mean, config.stddev); };
      break;
    case 'chisquare':
      generator = function() { return rchisq(config.dof); };
      break;
    case 'poisson':
      generator = function() { return rnorm(config.lambda); };
      break;
    case 'cauchy':
      generator = function() { return rcauchy(config.location, config.scale); };
      break;
    case 'bernoulli':
      generator = function() { return rbernoulli(config.p); };
      break;
    case 'uniform':
    default:
      generator = function() { return runif(config.min, config.max, config.discrete); };
      break;
  }

  require('events').EventEmitter.call(this);
  init();

  function init() {
    initGraph();
    setInterval(addNumber, REFRESH_MS);
  }

  function initGraph() {
    for (var i = 0; i < MAX_POINTS; i++)
      addNumber();
  }

  function addNumber() {
    if (self.data.length >= MAX_POINTS)
      self.data.shift();

    self.data.push({ x: ++lastX, y: generator() });
    self.lastUpdated = new Date();

    self.emit('data', self.data);
  }
}

require('util').inherits(RandomNumbers, require('events').EventEmitter);


/**
 * The following code comes from the randgen library, released under the MIT
 * license at <https://github.com/robbrit/randgen>.
 */

// Generate uniformly distributed random numbers
// Gives a random number on the interval [min, max).
// If discrete is true, the number will be an integer.
function runif(min, max, discrete) {
  if (min === undefined) {
    min = 0;
  }
  if (max === undefined) {
    max = 1;
  }
  if (discrete === undefined) {
    discrete = false;
  }
  if (discrete) {
    return Math.floor(runif(min, max, false));
  }
  return Math.random() * (max - min) + min;
}

// Generate normally-distributed random nubmers
// Algorithm adapted from:
// http://c-faq.com/lib/gaussian.html
function rnorm(mean, stdev) {
  var u1, u2, v1, v2, s;
  if (mean === undefined) {
    mean = 0.0;
  }
  if (stdev === undefined) {
    stdev = 1.0;
  }
  if (rnorm.v2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();

      v1 = 2 * u1 - 1;
      v2 = 2 * u2 - 1;
      s = v1 * v1 + v2 * v2;
    } while (s === 0 || s >= 1);

    rnorm.v2 = v2 * Math.sqrt(-2 * Math.log(s) / s);
    return stdev * v1 * Math.sqrt(-2 * Math.log(s) / s) + mean;
  }

  v2 = rnorm.v2;
  rnorm.v2 = null;
  return stdev * v2 + mean;
}

rnorm.v2 = null;

// Generate Chi-square distributed random numbers
function rchisq(degreesOfFreedom) {
  if (degreesOfFreedom === undefined) {
    degreesOfFreedom = 1;
  }
  var i, z, sum = 0.0;
  for (i = 0; i < degreesOfFreedom; i++) {
    z = rnorm();
    sum += z * z;
  }

  return sum;
}

// Generate Poisson distributed random numbers
function rpoisson(lambda) {
  if (lambda === undefined) {
    lambda = 1;
  }
  var l = Math.exp(-lambda),
    k = 0,
    p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > l);

  return k - 1;
}

// Generate Cauchy distributed random numbers
function rcauchy(loc, scale) {
  if (loc === undefined) {
    loc = 0.0;
  }
  if (scale === undefined) {
    scale = 1.0;
  }
  var n2, n1 = rnorm();
  do {
    n2 = rnorm();
  } while (n2 === 0.0);

  return loc + scale * n1 / n2;
}

// Bernoulli distribution: gives 1 with probability p
function rbernoulli(p) {
  return Math.random() < p ? 1 : 0;
}
