"use strict";
var console = console || {log:function(m){ /** alert(m); */ }};

var Eventful = {};

/**
  * Asynchronous Processing Loop.
  **/
Eventful.Ploop = (function () {
  
  var Ploop = {}, timeouts = [];
  
  /**
    * event.source !== window in Internet Explorer,
    * so generate a unique identifier for the window.
    **/
  window.UID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  }).toUpperCase();
  
  /**
    * Asynchronous function call, optimised from:
    * http://ajaxian.com/archives/settimeout-delay
    *
    * IE postMessage is synchronous. This wouldn't be a problem except for the 
    * recursion limit through window defined objects, which postMessage is.
    **/
  if (window['addEventListener'] && window['postMessage']) {
    var queue = [], front = 0, back = 0, messageName = "#A";
    
    function handleMessage(event) {
      if (event.source.UID === window.UID && event.data === messageName) {
        if (event.stopPropagation) {
          event.stopPropagation();
        } else {
          event.cancelBubble = true;
        }
        if (back > 0) {
          timeouts[front][1].apply(timeouts[front][0], timeouts[front][2]);
          front += 1;
          if (front === back) {
            timeouts = [];
            front = back = 0;
            console.log("Event queue cleared.");
          }
        }
      }
    }
    
    if (window['addEventListener']) {
      window.addEventListener("message", handleMessage, true);
    } else {
      window.attachEvent("onmessage", handleMessage);
    }
    
    Ploop.async = function (scope, fn, args) {
      // fn.apply(scope, args);
      timeouts[back] = [scope, fn, args];
      back += 1;
      window.postMessage(messageName, "*");
    };
  } else {
    Ploop.async = function (scope, fn, args) {
      setTimeout(function() {
        fn.apply(scope, args);
      }, 0);
    };
  }
  
  /**
    * Repeat a function call with a chained interval timeout.
    * Returns an object to control execution.
    **/
  Ploop.every = function (interval, callback) {
    var cont = true, delay = interval, start;
    (start = function () {
      if (cont) {
        callback();
        setTimeout(start, delay);
      }
    })();
    
    return {
      stop: function () {
        cont = false;
      },
      start: function () {
        if (!cont) {
          cont = true;
          start();
        }
      },
      interval: function (i) {
        delay = i;
      }
    }
  }
  
  return Ploop;
  
}());

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

/**
  * Incrementing unique ID generator.
  **/
Eventful.newID = (function () {
  var uID = 1;
  return function() {
    return uID += 1;
  };
}());

/**
  * Mixin Function for adding base Event functions to an Objects prototype.
  **/
Eventful.Mixin = function (target) {
    
  if (target === undefined) {
    target = {};
  }
  
  /**
    * Prototype master events list. Copy across previous events if possible.
    **/
  if (target._Events === undefined) {
    target._Events = {};
  } else {
    var oEvents = target._Events, p;
    target._Events = {};
    for (p in oEvents) {
      if (oEvents.hasOwnProperty(p)) {
        target._Events[p] = oEvents[p];
      }
    }
    return target; /** Can skip rest of initialisation. **/
  }
  
  target.isEventable = true;
  
  /**
    * Register an event.
    **/
  target.registerEvent = function (eventName, methods) {
    this._Events[eventName] = methods;
  };
  
  /**
    * Binds a callback function to an event on this Object.
    **/
  target.bindCallback = function (eventName, callback, callerID) {
    if (this._Listeners === undefined) {
      this._Listeners = {};
    }
    if (this._Listeners[eventName] === undefined) {
      this._Listeners[eventName] = [];
    }
    if (this._Listeners[eventName][callerID] === undefined) {
      this._Listeners[eventName][callerID] = [];
    }
    this._Listeners[eventName][callerID].push(callback);
  };
  
  /**
    * Removes a callback.
    **/
  target.removeEventCallback = function (eventName, callerID) {
    if (this._Listeners[eventName][callerID] !== undefined)
      delete this._Listeners[eventName][callerID];
  };
  
  /**
    * Removes all callbacks for given Caller.
    **/
  target.removeCallbacks = function (callerID) {
    console.log("Removing callbacks of " + callerID + " from " + this.getID());
    /** TODO: Make Safer **/
    for (var i in this._Listeners) {
      if (this._Listeners[i][callerID] !== undefined)
        delete this._Listeners[i][callerID];
    }
  };
  
  /**
    * Trigger an event on this object.
    **/
  target.triggerEvent = function (eventName, e) {
    var eventListeners;
    if (this._Listeners !== undefined && (eventListeners = this._Listeners[eventName]) !== undefined) {
      /** TODO: Make safer.
      for (var i = 0, len = eventListeners.length; i < len; i += 1) {
        Eventful.doAsync(this, eventListeners[i], [this, e]);
      } **/
      for (var i in eventListeners) {
        for (var j in eventListeners[i]) {
          Eventful.Ploop.async(this, eventListeners[i][j], [this, e]);
        }
      }
    }
  };
  
  /**
    * Bind a function, scoped to this object, to an event on another object.
    **/
  target.bindListener = function (func, object, eventName) {
    var $this = this;
    object.bindCallback(eventName, function () {
      func.apply($this, arguments);
    }, $this.getID());
  };

  target.getID = function () {
    if (this.eventfulUID === undefined) {
      this.eventfulUID = Eventful.newID();
      return this.eventfulUID;
    }
    return this.eventfulUID;
  };
  
  return target;
};

Eventful.enableBubbling = false;

/**
  * Simple EventedObject.
  *
  * Methods: get(property), set(property, value)
  *          bindValue(property, otherObject, otherProperty)
  *          calculatedProperty(property, function, dependencies)
  *          triggerChange(property)
  *          
  * Events: propertyChanged: {property}
  *         [property]Changed: {value}
  **/
Eventful.Object = (function () {
  /**
    * Constructor and prototype.
    **/
  var EventedObjectObject = function (init) { 
      if (init !== undefined) {
        for (var prop in init) {
          if (init.hasOwnProperty(prop)) this.set(prop, init[prop]);
        }
      }
    },
    EventedObject = EventedObjectObject.prototype = Eventful.Mixin();
  
  /**
    * Support for adding dependent calculated properties.
    * Call on the prototype for adding Object-wide calculated properties.
    **/
  EventedObject.calculatedProperty = function (property, valueFunction, dependencies) {
    if (this.valueDependencies === undefined) {
      this.valueDependencies = {};
    }
    this[property] = valueFunction;
    if (dependencies !== undefined) {
      for (var i = 0, len = dependencies.length; i < len; i += 1) {
        if (this.valueDependencies[dependencies[i]] === undefined) {
          this.valueDependencies[dependencies[i]] = [];
        }
        this.valueDependencies[dependencies[i]].push(property);
      }
    }
  }
  
  /**
    * Wrapper for triggering a change of a property, triggering dependencies too.
    **/
  EventedObject.triggerChange = function (property, bubbled) {
    this.triggerEvent(property + "Changed", {value: this[property], bubbled: bubbled ? true:false});
    this.triggerEvent("propertyChanged", {property: property, bubbled: bubbled ? true:false});
    if (this.valueDependencies && this.valueDependencies[property]) {
      for (var i = 0; i < this.valueDependencies[property].length; i += 1) {
        this.triggerEvent(this.valueDependencies[property][i] + "Changed", {value: this.get(this.valueDependencies[property][i]), bubbled: bubbled ? true:false});
      }
    }
  };
  
  
  /**
    * get, supporting calculated properties.
    **/
  EventedObject.get = function (prop) {
    if (typeof this[prop] === "function") {
      return this[prop]();
    } else {
      return this[prop];
    }
  };
  
  /**
    * set, emitting [property]Changed and propertyChanged events.
    **/
  EventedObject.set = function (prop, value) {
    if (this[prop] !== undefined && this[prop].removeCallbacks !== undefined) {
      this[prop].removeCallbacks(this.getID());
    }
    if (typeof value === "function") {
      this.calculatedProperty(prop, value, value.propertyDependencies);
    } else {
      if (typeof(this[prop]) === "function") {
        this[prop](value);
      } else {
        this[prop] = value;
      }
    }
    
    /**
      * Enable event bubbling.
      **/
    if (Eventful.enableBubbling && value.isEventable) {
      if (value.constructor === Array) {
        var eventName = "elementChanged";
      } else if (value.constructor === Object) {
        var eventName = "propertyChanged";
      } else {
        return;
      }
      var $this = this;
      value.bindCallback(eventName, function (sender, e) {
        $this.triggerChange(prop, true);
      }, $this.getID());
    }
    
    this.triggerChange(prop);
  };
  
  
  /**
    * Use [property]Changed event listening to bind a local property to a remote one.
    **/
  EventedObject.bindValue = function (property, remoteObject, propertyName) {
    this.set(property, remoteObject.get(propertyName));
    this.bindListener(function(sender, e) {
      this.set(property, e.value);
    }, remoteObject, propertyName + "Changed");
  };
  
  return EventedObjectObject;
}());


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


/**
  * Singleton object for storing and drawing templates.
  **/
Eventful.Templates = (function () {

  var Templates = {},
      templatesHash = {},
      bindings = {},
      redrawQueued = false;
  
  Templates.add = function (name, template) {
    templatesHash[name] = template;
  };
  
  /**
    * Redraw any dirty bindings.
    **/
  function redraw() {
    for (var bind in bindings) {
      if (bindings[bind].dirty) {
        bindings[bind].redraw();
        bindings[bind].dirty = false;
      }
    }
    redrawQueued = false;
  }
  
  /**
    * Ask for a redraw loop if one isn't waiting to execute.
    **/
  function queueRedraw() {
    if (!redrawQueued) {
      redrawQueued = true;
      setTimeout(redraw, 25);
    }
  }
  
  /**
    * Bind a template and object to the innerHTML of a given elements ID.
    **/
  Templates.bindTemplate = function (templateName, eventedObject, targetID) {
    bindings[targetID] = {
      dirty: true,
      element: document.getElementById(targetID),
      redraw: function () {
          console.log(targetID + " redrawn.");
          this.element.innerHTML = Mustache.to_html(templatesHash[templateName], eventedObject, templatesHash);
        }
    }
    eventedObject.bindCallback("propertyChanged", function () {
      bindings[targetID].dirty = true;
      queueRedraw();
    }, 0);
    queueRedraw();
  };
  
  return Templates;

}());

Eventful.Layout = (function () {
  
  var Layout = {};
  
  var context = {};

  function tag(tagName, attrs) {
    
    if (attrs instanceof Array || typeof attrs !== "object" || (attrs instanceof jQuery)) {
      var offset = 1, id;
    } else {
      var offset = 2, id = attrs.id;
    }
    
    var pattern = /{{(.*?)}}/g,
        lcontext = context;
    
    var eID = Eventful.newID();
    
    if (id === undefined) {
      var element = $("<" + tagName + "></" + tagName + ">");
    } else {
      var element = $("<" + tagName + " id=\"" + id + "\"></" + tagName + ">");
    }
    
    if (offset === 2) {
      for (var p in attrs) {
        if (attrs.hasOwnProperty(p)) {
          switch (p) {
            case "id":
              break;
            default:
              (function () {
                var attr = p;
                var redrawAttribute = (function () {
                  var attrVal = attrs[attr].replace(pattern, function (match, token) {
                    if (lcontext.get) {
                      return lcontext.get(token);
                    } else {
                      return lcontext[token];
                    }
                  });
                  element.attr(attr, attrVal);
                  return arguments.callee;
                }());
                
                attrs[attr].replace(pattern, function (match, token, offset, string) {
                  lcontext.bindCallback (token + "Changed", redrawAttribute, eID);
                });
              }());
          }
        }
      }
    }
    
    for (var i = offset, len = arguments.length; i < len; i++) {
      if (typeof (arguments[i]) === "string") {
        var arg = arguments[i];
        (function () {
          var templateStr = arg,
            subel = $("<span></span>"),
            redrawAttribute = (function () {
              var attrVal = templateStr.replace(pattern, function (match, token) {
                if (lcontext.get) {
                  return lcontext.get(token);
                } else {
                  return lcontext[token];
                }
              });
              
              subel.html(attrVal);
              return arguments.callee;
            }());
          
          templateStr.replace(pattern, function (match, token, offset, string) {
            lcontext.bindCallback (token + "Changed", redrawAttribute, eID);
          });
          
          element.append(subel);
        }());
      } else if (typeof (arguments[i]) === "function") {
        element.append(arguments[i]());
      } else if (arguments[i] instanceof jQuery) {
        arguments[i].appendTo(element);
      } else if (arguments[i] instanceof Array) {
        console.log("Array arguments for tags not yet implemented.");
      } else {
        element.append(arguments[i]);
      }
    }
    return element;
  }

  var tagFuncs = {}, tags = [
      "html", "head", "body", "script", "meta", "title", "link", "script",
      "div", "p", "span", "a", "img", "br", "hr",
      "table", "tr", "th", "td", "thead", "tbody", "tfoot",
      "ul", "ol", "li", 
      "dl", "dt", "dd",
      "h1", "h2", "h3", "h4", "h5", "h6", "h7",
      "form", "input", "label"
    ];
  for (var i = 0, len = tags.length; i < len; i++) {
    var tagName = tags[i];
    tagFuncs[tagName] = function(tagName) {
      return function () {
        return tag.apply(window, [tagName].concat(Array.prototype.slice.call(arguments)));
      }
    }(tagName);
  }

  var templates = {};

  Layout.Template = function (name, gen) {
    var lineending = jQuery.browser.msie ? "\r\n" : "\n";
    templates[name] = "(" + gen.toString() + ")(context)";
  }
  
  /** Hack for later:
    * Because redraw is lazily evaluated when added to a template, pass in the parent at that time.
    * Also pass in the previous element or an indicator that this is the first element.
    * And then either insert or append afterwards.
    *
    * Must also keep a list of elements drawn, that can then be removed when a redraw is required.
    **/
  Layout.Render = function (template, parent, property) {
    var renderID = Eventful.newID();
    var el = $("<div></div>");
    var data;
    
    var redraw = function (sender, e) {
      if (e !== undefined && e.bubbled === true)
        return;
      var oldContext = context;
      if (data !== undefined && data.isEventful) {
        data.removeCallbacks(renderID);
      }
      data = parent.get(property);
      if (!(data instanceof Array)) {
        data = [data];
      } else {
        if (data.isEventful)
          data.bindCallback("elementChanged", redraw, renderID);
      }
      el.empty();
      
      data.each(function (datum) {
        context = datum;
        with (tagFuncs) {
          var ret = eval(templates[template]);
          el.append(ret);
        }
      });
      context = oldContext;
      return el;
    }
    parent.bindCallback(property + "Changed", redraw, renderID);
    
    return redraw;
  }

  Layout.Draw = function (selector) {
    var el = $(selector).empty();
    for (var i = 1, len = arguments.length; i < len; i++) {
      arguments[i]().appendTo(el);
    }
  }
  
  return Layout;
}());


Function.prototype.dependsOn = function () {
  this.propertyDependencies = [];
  for (var i = 0, len = arguments.length; i < len; i += 1) {
    this.propertyDependencies.push(arguments[i]);
  }
  return this;
};

Array.prototype.each = function (callback) {
  for (var i = 0, len = this.length; i < len; i += 1) {
    callback(this[i]);
  }
};

Eventful.Object.prototype.delay =
Eventful.Array.prototype.delay = function (time, callback) {
  setTimeout(callback, time);
}