
module.exports = RandomNumbers;

var MAX_POINTS = 10;
var REFRESH_MS = 1000 * 2;


function RandomNumbers(config) {
  this.data = [];
  var lastX = 0;
  var self = this;

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
    self.data.push({ x: ++lastX, y: Math.round(Math.random() * 50) });

    self.emit('data', self.data);
  }
}

require('util').inherits(RandomNumbers, require('events').EventEmitter);
