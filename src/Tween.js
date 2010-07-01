//= require "Ploop"

/**
  * Tween function for adding animations of a property to an asynchronous loop.
  **/
(function (Eventful) {

  var animations = {};
  
  Eventful.Tween = function (identifier, object, variable, from, to, time, method, callback) {
    var d = new Date(), thisTick = d.getTime(),
    t = {
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
  
  Eventful.Ploop.every(20, function () {
    var d = new Date(), thisTick = d.getTime(), a, anim;
    
    for (a in animations) {
      if (animations.hasOwnProperty(a)) {
        anim = animations[a];
        if (thisTick > (anim.start + anim.end)) {
          delete animations[a];
          anim.assign(anim.to);
          if (anim.callback !== undefined) {
            anim.callback();
          }
        } else {
          anim.assign(Eventful.Tween[anim.interpolation](anim.from, anim.to, (thisTick - anim.start) / anim.end));
        }
      }
    }
  });
  
  Eventful.Tween.linear = function (from, to, t) {
    return (t * (to - from)) + from;
  };
  
  Eventful.Tween.quadratic = function (from, to, t) {
    return (t * t * (to - from)) + from;
  };
  
  Eventful.Tween.invQuadratic = function (from, to, t) {
    var u = 1 - t;
    return Eventful.Tween.quadratic(to, from, u);
  };

}(Eventful));