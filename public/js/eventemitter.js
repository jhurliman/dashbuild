
window.EventEmitter = function() {};

EventEmitter.prototype.on = function(event, func) {
  this._events = this._events || {};
  this._events[event] = this._events[event] || [];
  this._events[event].push(func);
};

EventEmitter.prototype.off = function(event, func) {
  if (!this._events) return;
  if (!(event in this._events)) return;
  this._events[event].splice(this._events[event].indexOf(func), 1);
};

EventEmitter.prototype.trigger = function(event /*, args... */) {
  if (!this._events) return;
  if (!(event in this._events)) return;
  for(var i = 0; i < this._events[event].length; i++)
    this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
};

EventEmitter.inherit = function(destObject) {
  var props = [ 'on', 'off', 'trigger' ];
  for (var i = 0; i < props.length; i++)
    destObject.prototype[props[i]]  = EventEmitter.prototype[props[i]];
};
