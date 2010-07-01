"use strict";
(function () {
  if (console === undefined) {
    var console = {log: function (m) { /** alert(m); */ }};
  }

  var Eventful = window.Eventful = {};

  /**
    * Incrementing unique ID generator.
    **/
  Eventful.newID = (function () {
    var uID = 1;
    return function () {
      uID += 1;
      return uID;
    };
  }());

  Eventful.enableBubbling = true;
  
  Function.prototype.dependsOn = function () {
    this.propertyDependencies = [];
    for (var i = 0, len = arguments.length; i < len; i += 1) {
      this.propertyDependencies.push(arguments[i]);
    }
    return this;
  };

  Function.prototype.cacheable = function () {
    this.cacheableProperty = true;
    return this;
  };

  Array.prototype.each = function (callback) {
    for (var i = 0, len = this.length; i < len; i += 1) {
      callback(this[i]);
    }
  };
}());
