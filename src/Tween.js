//= require "Ploop"

/**
  * Tween function for adding animations of a property to an asynchronous loop.
  **/
Eventful.Tween = (function () {

  var animations = {};
  
  Eventful.Ploop.every(20, function () {
    var d = new Date();
    var thisTick = d.getTime();
    
    for (var a in animations) {
      var anim = animations[a];
      if (thisTick > (anim.start + anim.end)) {
        delete animations[a];
        anim.assign(anim.to);
        if (anim.callback !== undefined) {
          anim.callback();
        }
      } else {
        anim.assign(Tween[anim.interpolation](anim.from, anim.to, (thisTick - anim.start) / anim.end));
      }
    }
  });
  
  Tween = function (identifier, object, variable, from, to, time, method, callback) {
    var d = new Date();
    var thisTick = d.getTime();
    
    var t = {
      assign: object.isEventable ?
        function (value) {
          object.set(variable, value);
        } : typeof object[variable] === "function" ?
        function (value) {
          object[variable](value);
        } :
        function (value) {
          object[variable] = value;
        },
      start: thisTick,
      end: time,
      from: from,
      to: to,
      interpolation: method === undefined ? "linear" : method,
      callback: callback
    };
    
    animations[identifier] = t;
  };
  
  Tween.linear = function (from, to, t) {
    return (t * (to-from)) + from;
  };
  
  Tween.quadratic = function (from, to, t) {
    return (t*t * (to-from)) + from;
  };
  
  Tween.invQuadratic = function (from, to, t) {
    var u = 1-t;
    return Tween.quadratic(to, from, u);
  }
  
  return Tween;

}());