//= require "Base"
//= require "Mixin"

/**
  * Eventful.Array implementation.
  * Bubbling bugged when the same Object or Array is added as
  * a child element more than once, and one of them then removed.
  *
  * Some functions not yet wrapped.
  **/
Eventful.Array = (function() {
  
  var EventedArrayObject = function () { this.intArray = []; this.push.apply(this, arguments); },
      EventedArray = EventedArrayObject.prototype = Eventful.Mixin({});
  
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
        args[i].bind(eventName, function (sender, e) {
          $this.trigger("elementChanged", {state:"update", value:sender});
        }, $this.getID());
      }
    }
  };
  
  EventedArray.push = function () {
    var pLength = this.intArray.length;
    Array.prototype.push.apply(this.intArray, arguments);
    this.subscribeEvents(arguments);
    for (var i = pLength; i < this.intArray.length; i++) {
      this.trigger("elementChanged", {state:"new", index:i, value:this[i]});
    }
  };
  
  EventedArray.pop = function () {
    var el = this.intArray.pop();
    if (el.removeCallbacks !== undefined) {
      el.removeCallbacks(this.getID());
    }
    this.trigger("elementChanged", {state: "delete", index: this.intArray.length, value: el});
    return el;
  }
  
  EventedArray.set = function (index, value) {
    var state = this[index] === undefined ? "new" : "update";
    if (state == "update" && this.intArray[index].removeCallbacks !== undefined) {
      this.intArray[index].removeCallbacks(this.getID());
    }
    this.intArray[index] = value;
    this.subscribeEvents([value]);
    this.trigger("elementChanged", {state: state, index: index, value: value});
  };
  
  EventedArray.splice = function () {
    for (var i = 0; i < arguments[1]; i += 1) {
      if (this.intArray[arguments[0] + i].removeCallbacks !== undefined) {
        this.intArray[arguments[0] + i].removeCallbacks();
      }
      this.trigger("elementChanged", {state: "delete", index: arguments[0] + i, value: this[arguments[0] + i]});
    }
    
    Array.prototype.splice.apply(this.intArray, arguments);
    
    this.subscribeEvents(Array.prototype.slice.call(arguments, 2));
    for (i = 2, len = arguments.length; i < len; i += 1) {
      this.trigger("elementChanged", {state:"new", index: arguments[0] + i, value:arguments[i]});
    }
  };
  
  EventedArray.each = function (callback) {
    this.intArray.each(callback);
  };
  EventedArray.toString = function () {
    return "[" + this.join(',') + "]";
  };
  EventedArray.toArray = function () {
    return this.intArray;
  };
  
  ["join", "slice"].each(function (p) {
    if (EventedArray[p] === undefined && typeof Array.prototype[p] === "function") {  
      EventedArray[p] = function () {
        return Array.prototype[p].apply(this.intArray, arguments);
      }
    }
  });
  
  EventedArray.EventfulArray = true;
  
  return EventedArrayObject;
}());