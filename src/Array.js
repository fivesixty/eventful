//= require "Mixin"

/**
  * Eventful.Array implementation.
  * Bubbling bugged when the same Object or Array is added as
  * a child element more than once, and one of them then removed.
  *
  * Some functions not yet wrapped.
  **/
Eventful.Array = (function() {
  
  var EventedArrayObject = function () { this._length = 0; this.push.apply(this, arguments); },
      EventedArray = EventedArrayObject.prototype = Eventful.Mixin(new Array());
      
  var brokenLength = (new EventedArrayObject(1).length == 0);
  
  /**
    * Wrapper to simplify subscribing to elements for bubbling events.
    **/
  EventedArray.subscribeEvents = function (args) {
    var $this = this;
    for (var i = 0, len = args.length; i < len; i++) {
      if (Eventful.enableBubbling && args[i].isEventable) {
        if (args[i].constructor === Array) {
          var eventName = "elementChanged";
        } else if (args[i].constructor === Object) {
          var eventName = "propertyChanged";
        } else {
          continue;
        }
        args[i].bindCallback(eventName, function (sender, e) {
          $this.triggerEvent("elementChanged", {state:"update", value:sender});
        }, $this.getID());
      }
    }
  };
  EventedArray.push = function () {
    var pLength = this._length;
    for (var i = 0, len = arguments.length; i < len; i++) {
      this[this._length++] = arguments[i];
    }
    this.subscribeEvents(arguments);
    for (var i = pLength; i < this._length; i++) {
      this.triggerEvent("elementChanged", {state:"new", index:i, value:this[i]});
    }
  };
  EventedArray.set = function (index, value) {
    var state = this[index] === undefined ? "new" : "update";
    if (state == "update" && this[index].removeCallbacks !== undefined) {
      this[index].removeCallbacks(this.getID());
    }
    this[index] = value;
    if ((index+1) > this._length) {
      this._length = index+1;
    }
    this.triggerEvent("elementChanged", {state: state, index: index, value: value});
  };
  
  /** BROKEN? **/
  EventedArray.splice = function () {
    for (var i = 0; i < arguments[1]; i += 1) {
      if (this[arguments[0] + i].removeCallbacks !== undefined) {
        this[arguments[0] + i].removeCallbacks();
      }
      this.triggerEvent("elementChanged", {state: "delete", index: arguments[0] + i, value: this[arguments[0] + i]});
    }
    Array.prototype.splice.apply(this, arguments);
    this.subscribeEvents(Array.prototype.slice.call(arguments, 2));
    for (i = 2, len = arguments.length; i < len; i += 1) {
      this.triggerEvent("elementChanged", {state:"new", index: arguments[0] + i, value:arguments[i]});
    }
  };
  /** **/
  
  EventedArray.each = function (callback) {
    for (var i = 0, len = this._length; i < len; i += 1) {
      callback(this[i]);
    }
  };
  EventedArray.toString = function () {
    return "[" + this.join(',') + "]";
  };
  
  return EventedArrayObject;
}());