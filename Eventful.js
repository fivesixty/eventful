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
    
  var eventTrigger = window['addEventListener'] && window['postMessage'] ? "event" : "timeout";
  
  var queue = [], front = 0, back = 0, messageName = "#A";
    
  function handleMessage(event) {
    if (event && !(event.source.UID === window.UID && event.data === messageName)) {
      return;
    }
    if (event) {
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        event.cancelBubble = true;
      }
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
    
  Ploop.async = function (scope, fn, args) {
    timeouts[back] = [scope, fn, args];
    back += 1;
    eventTrigger ? window.postMessage(messageName, "*") : setTimeout(handleMessage, 0);
  };
    
  if (eventTrigger) {
    if (window['addEventListener']) {
      window.addEventListener("message", handleMessage, true);
    } else {
      window.attachEvent("onmessage", handleMessage);
    }
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
    // console.log("Removing callbacks of " + callerID + " from " + this.getID());
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
    if (this.cache && this.cache[property]) {
      delete this.cache[property];
    }
    
    this.triggerEvent(property + "Changed", {value: this[property], bubbled: bubbled ? true:false});
    this.triggerEvent("propertyChanged", {property: property, bubbled: bubbled ? true:false});
    if (this.valueDependencies && this.valueDependencies[property]) {
      for (var i = 0; i < this.valueDependencies[property].length; i += 1) {
        this.triggerChange(this.valueDependencies[property][i], bubbled);
      }
    }
  };
  
  
  /**
    * get, supporting calculated properties.
    **/
  EventedObject.get = function (prop) {
    if (typeof this[prop] === "function") {
      if (this[prop].cacheableProperty) {
        if (this.cache === undefined) {
          this.cache = [];
        }
        if (this.cache[prop] === undefined) {
          this.cache[prop] = this[prop]();
        }
        return this.cache[prop];
      }
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
  * Constructor Creator
  * First argument is an array of arguments for the constructor.
  * Second is an object with properties:
  * init:
  *   an object with constructors for properties that need to be created inside the constructor
  * calc:
  *   an object with calculated properties for the object
  **/
Eventful.Model = (function() {
  
  return function (constructor, properties) {
    constructor = constructor || [];
    properties = properties || {};
    
    function Model() {
      if (properties.init) {
        for (var p in properties.init) {
          if (properties.init.hasOwnProperty(p)) {
            this.set(p, new properties.init[p]());
          }
        }
      }
      for (var i = 0, len = constructor.length; i < len; i++) {
        this.set(constructor[i], arguments[i]);
      }
    }
    Model.prototype = new Eventful.Object(properties.calc || {});
    
    return Model;
  };
  
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

Eventful.Layout = (function () {
  
  var Layout = {};
  var context = {};
  var pattern = /{{(.*?)}}/g;
  
  function replaceTokens(context, string) {
    return string.replace(pattern, function (match, token) {
      if (token === ".") {
        return context;
      } else if (context.get) {
        return context.get(token);
      } else {
        return context[token];
      }
    });
  }

  function bindTokens(context, string, redraw, eID) {
    var tokens = [];
    string.replace(pattern, function (match, token) {
      if (token !== ".") {
        context.bindCallback (token + "Changed", redraw, eID);
        tokens.push(token);
      }
    });
    return tokens;
  }

  function tag(tagName, attrs) {
    
    if (attrs instanceof Array || typeof attrs !== "object" || (attrs instanceof jQuery)) {
      var offset = 1, id;
    } else {
      var offset = 2, id = attrs.id;
    }
    
    var eID = Eventful.newID();
    
    if (id === undefined) {
      var element = $("<" + tagName + " />");
    } else {
      var element = $("<" + tagName + " id=\"" + id + "\" />");
    }
    
    /**
      * Attributes.
      **/
    if (offset === 2) {
      for (var p in attrs) {
        if (attrs.hasOwnProperty(p)) {
          switch (p) {
            case "id":
              break;
            default:
              (function ( attr, templateStr, context ) {
                function redraw() {
                  element.attr(attr, replaceTokens(context, templateStr));
                };
                redraw();
                
                bindTokens(context, templateStr, redraw, eID);
              }( p, attrs[p], context ));
          }
        }
      }
    }
    
    /**
      * Contents.
      **/
    for (var i = offset, len = arguments.length; i < len; i++) {
      if (typeof (arguments[i]) === "string") {
        // Wrap strings inside a span for a redraw closure,
        // so they can be redrawn individually on changes.
      
        (function ( templateStr, context ) {
          var subel = $("<span></span>").appendTo(element);
          
          function redraw() {
            subel.html(replaceTokens(context, templateStr));
          };
          redraw();
          
          bindTokens(context, templateStr, redraw, eID);
        }( arguments[i], context ));
        
      } else if (typeof (arguments[i]) === "function") {
        // Sub templates return a function that must be passed
        // the parent element.
        
        arguments[i](element);
      } else if (arguments[i] instanceof jQuery) {
        arguments[i].appendTo(element);
      } else if (arguments[i] instanceof Array) {
        console.log("Array arguments for tags not yet implemented.");
      } else {
        element.append(arguments[i]);
      }
    }
    
    /**
      * Store a destructor in the jQuery data for the element.
      * This will remove event bindings to the context, and is called by the
      * wrapper around jQuery.cleanData.
      *
      * Prevents build up of event hooks to removed DOM elements.
      **/
    if (context.isEventable) {
      (function ( context ) {
        element[0]["eventfulUnbind"] = function () {
          context.removeCallbacks(eID);
        };
      }( context ));
    }
    return element;
  }
  
  /**
    * Wrap around jQuery.cleanData to clear Eventful bindings from removed elements.
    **/
  jQuery._cleanData = jQuery.cleanData;
  jQuery.cleanData = function ( elems ) {
    for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
      if (elem[ "eventfulUnbind" ]) {
        elem["eventfulUnbind"]();
        elem["eventfulUnbind"] = null;
      }
    }
    return jQuery._cleanData.apply(this, arguments);
  }
  
  /**
    * Storage object for functions scoped to the template drawing.
    **/
  var tagFuncs = {}, tags = [
      "html", "head", "body", "script", "meta", "title", "link", "script",
      "div", "p", "span", "a", "img", "br", "hr",
      "table", "tr", "th", "td", "thead", "tbody", "tfoot",
      "ul", "ol", "li", 
      "dl", "dt", "dd",
      "h1", "h2", "h3", "h4", "h5", "h6", "h7",
      "form", "input", "label",
      "tt", "i", "b", "big", "small",
      "em", "strong", "dfn", "code", "samp", "kbd", "var", "cite"
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

  /**
    * Bind the template function to be called with the context.
    **/
  Layout.Template = function (name, gen) {
    templates[name] = "(" + gen.toString() + ")(context)";
  }
  
  /**
    * Render takes a template name, a parent object, and a property of that object to use as a context.
    * If property is absent, the parent object is used as the data context.
    **/
  Layout.Render = function (template, parent, property) {
    var renderID = Eventful.newID();
    
    // el is the start marker tag in the DOM so we know where to insert to.
    var el = $('<div style="display: none;">');
    var data, elements = [];
    
    var redraw = function (sender, e) {
      // Don't redraw on bubbled changes (tag bindings update from these).
      if (e !== undefined && e.bubbled === true) {
        return;
      }
      
      // Save the context, so we can restore it later.
      var oldContext = context;
      
      // If called with a single argument, is the parent tag() rendering
      // append our start marker tag to the parent tag
      if (e === undefined && sender !== undefined) {
        el.appendTo(sender);
      }
      
      // If this is not the first time called (we have a previous data context stored.
      if (data !== undefined) {
        // Remove binding. Data was likely an Eventful.Array
        if (data.isEventable) {
          data.removeCallbacks(renderID);
        }
        
        // Remove all elements added previously.
        elements.each(function (el) {
          $(el).remove();
        });
        elements = [];
      }
      
      // Get the new data context, and wrap into an array for ease of iteration.
      data = property ? parent.get(property) : parent;
      if (!(data instanceof Array)) {
        data = [data];
      } else {
        // If it's an eventful array, bind redraw to changes in elements.
        if (data.isEventable)
          data.bindCallback("elementChanged", redraw, renderID);
      }
      
      // Iterate over the data elements.
      var pEl = el;
      data.each(function (datum) {
        // Assign a context, to be used from within the tag function calls.
        context = datum;
        
        // Bind scope to tag functions for the eval (inspired by Jaml)
        with (tagFuncs) {
          var ret = eval(templates[template]);
          pEl.after(ret);
          pEl = ret;
          elements.push(ret[0]);
        }
      });
      
      // Restore the context.
      context = oldContext;
    }
    if (property) {
      // Bind the redraw to changes to our data context.
      parent.bindCallback(property + "Changed", redraw, renderID);
    }
    
    return redraw;
  }

  Layout.Draw = function (selector) {
    var el = $(selector).empty();
    for (var i = 1, len = arguments.length; i < len; i++) {
      arguments[i](el);
    }
  }
  Layout.tag = tag;
  return Layout;
}());


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