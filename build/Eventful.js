"use strict";
(function () {
  if (console === undefined) {
    var console = {log: function (m) { /** alert(m); */ }};
  }

  var Eventful = window.Eventful = {};

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

(function (Eventful) {


  var Ploop = Eventful.Ploop = {}, queue = [],
      eventTrigger = (window.addEventListener && window.postMessage),
      timeouts = {}, front = 0, back = 0, messageName = "#A";

  function handleMessage(event) {
    if (event) {
      if (!((event.data === messageName) && (event.source.evtfulUID === window.evtfulUID))) {
        return;
      }
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        event.cancelBubble = true;
      }
    }

    if (back > 0) {
      timeouts[queue[front]][1].apply(timeouts[queue[front]][0], timeouts[queue[front]][2]);
      delete queue[front];
      front += 1;
      if (front === back) {
        queue = [];
        timeouts = {};
        front = back = 0;
        console.log("Event queue cleared.");
      }
    }
  }

  Ploop.async = function (scope, fn, event, identifier) {
    identifier = identifier || Eventful.newID();
    if (timeouts[identifier] === undefined) {
      timeouts[identifier] = [scope, fn, [event]];
      queue[back] = identifier;
      back += 1;
      if (eventTrigger) {
        window.postMessage(messageName, "*");
      } else {
        setTimeout(handleMessage, 0);
      }
    } else {
      timeouts[identifier][2].push(event);
    }
  };

  if (eventTrigger) {
    window.evtfulUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();

    if (window.addEventListener) {
      window.addEventListener("message", handleMessage, true);
    } else {
      window.attachEvent("onmessage", handleMessage);
    }
  }

  Ploop.every = function (interval, callback) {
    var cont = true, delay = interval;
    function start() {
      if (cont) {
        callback();
        setTimeout(start, delay);
      }
    }
    start();

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
    };
  };

}(Eventful));

(function (Eventful) {

  var Listeners = {};

  Eventful.Mixin = function (target) {

    if (target === undefined) {
      target = {};
    } else if (target.isEventable) {
      return target;
    }

    target.isEventable = true;

    target.bind = function (eventName, callback, callerID) {
      var thisID = this.getID();
      switch (true) {
      case Listeners[thisID] === undefined:
        Listeners[thisID] = {};
      case Listeners[thisID][eventName] === undefined:
        Listeners[thisID][eventName] = {};
      case Listeners[thisID][eventName][callerID] === undefined:
        Listeners[thisID][eventName][callerID] = [];
      default:
        Listeners[thisID][eventName][callerID].push(callback);
      }
    };

    target.removeCallbacks = function (callerID) {
      var thisID = this.getID(), i;
      for (i in Listeners[thisID]) {
        if (Listeners[thisID][i][callerID] !== undefined) {
          delete Listeners[thisID][i][callerID];
        }
      }
    };

    target.trigger = function (eventName, e) {
      var thisID = this.getID(), eventListeners, callerID, i, len;
      if (Listeners[thisID] !== undefined && (eventListeners = Listeners[thisID][eventName]) !== undefined) {
        for (callerID in eventListeners) {
          if (eventListeners.hasOwnProperty(callerID)) {
            for (i = 0, len = eventListeners[callerID].length; i < len; i += 1) {
              Eventful.Ploop.async(this, eventListeners[callerID][i], e, this.getID() + eventName + callerID + i);
            }
          }
        }
      }
    };

    target.getID = function () {
      if (this.eventfulUID === undefined) {
        this.eventfulUID = Eventful.newID();
      }
      return this.eventfulUID;
    };

    return target;
  };
}(Eventful));

(function (Eventful) {

  Eventful.Array = function () {
    this.intArray = [];
    this.push.apply(this, arguments);
  };

  var EventedArray = Eventful.Array.prototype = Eventful.Mixin({EventfulArray: true});

  EventedArray.subscribeEvents = function (args) {
    var $this = this, i, eventName, len;
    for (i = 0, len = args.length; i < len; i += 1) {
      if (Eventful.enableBubbling && args[i].isEventable) {
        if (args[i].constructor === Array) {
          eventName = "elementChanged";
        } else if (args[i].constructor === Object) {
          eventName = "propertyChanged";
        } else {
          continue;
        }
        args[i].bind(eventName, function (e) {
          $this.trigger("elementChanged", {state: "update", value: this});
        }, $this.getID());
      }
    }
  };

  EventedArray.push = function () {
    var pLength = this.intArray.length, i;
    Array.prototype.push.apply(this.intArray, arguments);
    this.subscribeEvents(arguments);
    for (i = pLength; i < this.intArray.length; i += 1) {
      this.trigger("elementChanged", {state: "new", index: i, value: this[i]});
    }
  };

  EventedArray.pop = function () {
    var el = this.intArray.pop();
    if (el.removeCallbacks !== undefined) {
      el.removeCallbacks(this.getID());
    }
    this.trigger("elementChanged", {state: "delete", index: this.intArray.length, value: el});
    return el;
  };

  EventedArray.set = function (index, value) {
    var state = this.intArray[index] === undefined ? "new" : "update";
    if (state === "update" && this.intArray[index].removeCallbacks !== undefined) {
      this.intArray[index].removeCallbacks(this.getID());
    }
    this.intArray[index] = value;
    this.subscribeEvents([value]);
    this.trigger("elementChanged", {state: state, index: index, value: value});
  };

  EventedArray.splice = function () {
    var i, len;

    for (i = 0; i < arguments[1]; i += 1) {
      if (this.intArray[arguments[0] + i].removeCallbacks !== undefined) {
        this.intArray[arguments[0] + i].removeCallbacks();
      }
      this.trigger("elementChanged", {state: "delete", index: arguments[0] + i, value: this[arguments[0] + i]});
    }

    Array.prototype.splice.apply(this.intArray, arguments);

    this.subscribeEvents(Array.prototype.slice.call(arguments, 2));
    for (i = 2, len = arguments.length; i < len; i += 1) {
      this.trigger("elementChanged", {state: "new", index: arguments[0] + i, value: arguments[i]});
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
      };
    }
  });

}(Eventful));

(function (Eventful) {

  Eventful.Object = function EventfulObject(init) {
    if (init !== undefined) {
      for (var prop in init) {
        if (init.hasOwnProperty(prop)) {
          this.set(prop, init[prop]);
        }
      }
    }
  };

  var EventedObject = Eventful.Object.prototype = Eventful.Mixin({EventfulObject: true});

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
  };

  EventedObject.triggerChange = function (property, bubbled) {
    if (this.cache && this.cache[property] !== undefined) {
      delete this.cache[property];
    }

    this.trigger(property + "Changed", {value: this[property], bubbled: bubbled === true});
    this.trigger("propertyChanged", {property: property, bubbled: bubbled === true});
    if (this.valueDependencies && this.valueDependencies[property]) {
      for (var i = 0; i < this.valueDependencies[property].length; i += 1) {
        this.triggerChange(this.valueDependencies[property][i], bubbled === true);
      }
    }
  };


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

  EventedObject.set = function (prop, value) {
    if (this[prop] !== undefined && this[prop].removeCallbacks !== undefined) {
      this[prop].removeCallbacks(this.getID());
    }

    if (typeof value === "function") {
      if (this.cache && this.cache[prop] !== undefined) {
        delete this.cache[prop];
      }
      this.calculatedProperty(prop, value, value.propertyDependencies);
    } else {
      if (typeof(this[prop]) === "function") {
        this[prop](value);
      } else {
        this[prop] = value;
      }
    }

    var $this = this;
    if (value.EventfulObject && Eventful.enableBubbling) {
      value.bind("propertyChanged", function () {
        $this.triggerChange("propertyChanged", true);
      }, $this.getID());
    } else if (value.EventfulArray) {
      value.bind("elementChanged", function (e) {
        $this.triggerChange(prop, e.bubbled);
      }, $this.getID());
    }

    this.triggerChange(prop);
  };


  EventedObject.bindValue = function (property, remoteObject, propertyName) {
    var $this = this;
    function syncVal() {
      $this.set(property, remoteObject.get(propertyName));
    }
    remoteObject.bind(propertyName + "Changed", syncVal, $this.getID());
    syncVal();
  };

}(Eventful));

(function (Eventful) {

  var context = {}, pattern = /\{\{([a-z0-9_\-\.]*?)\}\}/gi, jqCleanData = jQuery.cleanData, tagFuncs = {};

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
        context.bind(token + "Changed", redraw, eID);
        tokens.push(token);
      }
    });
    return tokens;
  }

  function bindAttributes(attrs, element, eID) {
    for (var p in attrs) {
      if (attrs.hasOwnProperty(p)) {
        if (p === "id") {
          continue;
        }
        (function (attr, templateStr, context) {
          function redraw() {
            element.attr(attr, replaceTokens(context, templateStr));
          }
          redraw();

          bindTokens(context, templateStr, redraw, eID);
        }(p, attrs[p], context));
      }
    }
  }

  function makeElement(tagName, context, eID) {
    var element = jQuery("<" + tagName + " />");
    if (context.isEventable) {
      element[0].eventfulUnbind = function () {
        context.removeCallbacks(eID);
      };
    }
    return element;
  }

  function tag(tagName, attrs) {
    var offset = 1, eID = Eventful.newID(), element = makeElement(tagName, context, eID), i, len;

    if (!(attrs instanceof Array || typeof attrs !== "object" || (attrs instanceof jQuery) || attrs.EventfulArray)) {
      offset = 2;
    }

    if (offset === 2) {
      bindAttributes(attrs, element, eID);
    }

    for (i = offset, len = arguments.length; i < len; i += 1) {
      if (typeof (arguments[i]) === "string") {

        (function (templateStr, context) {
          var subel = jQuery("<span></span>").appendTo(element);

          function redraw() {
            subel.html(replaceTokens(context, templateStr));
          }
          redraw();

          bindTokens(context, templateStr, redraw, eID);
        }(arguments[i], context));

      } else if (typeof (arguments[i]) === "function") {

        arguments[i](element);
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

  jQuery.cleanData = function (elems) {
    for (var i = 0, elem; (elem = elems[i]) !== undefined; i += 1) {
      if (elem.eventfulUnbind) {
        elem.eventfulUnbind();
        delete elem.eventfulUnbind;
      }
    }
    return jqCleanData.apply(this, arguments);
  };

  [
    "html", "head", "body", "script", "meta", "title", "link", "script",
    "div", "p", "span", "a", "img", "br", "hr",
    "table", "tr", "th", "td", "thead", "tbody", "tfoot",
    "ul", "ol", "li",
    "dl", "dt", "dd",
    "h1", "h2", "h3", "h4", "h5", "h6", "h7",
    "input", "label",
    "tt", "i", "b", "big", "small", "pre",
    "em", "strong", "dfn", "code", "samp", "kbd", "var", "cite"
  ].each(function (tagName) {
    tagFuncs[tagName] = function () {
      return tag.apply(window, [tagName].concat(Array.prototype.slice.call(arguments)));
    };
  });


  function keyupElement (tagName, property, attributes) {
    var lcontext = context, eID = Eventful.newID(), input = makeElement(tagName, context, eID);

    input.keyup(function () {
      if (lcontext.get(property) !== input.val()) {
        lcontext.set(property, input.val());
      }
    });

    bindAttributes(attributes, input, eID);

    return input;
  }

  tagFuncs.hidden = function (property, attributes) {
    var eID = Eventful.newID(), input = makeElement("input", context, eID);

    attributes = attributes || {};
    attributes.type="hidden";
    attributes.value="{{" + property + "}}";
    bindAttributes(attributes, input, eID);

    return input;
  };

  tagFuncs.text = function (property, attributes) {
    attributes = attributes || {};
    attributes.type = "text";
    attributes.value = "{{" + property + "}}";

    return keyupElement("input", property, attributes);
  };
  tagFuncs.password = function (property, attributes) {
    attributes = attributes || {};
    attributes.type = "password";
    attributes.value = "{{" + property + "}}";

    return keyupElement("input", property, attributes);
  };
  tagFuncs.textarea = function (property, attributes) {
    attributes = attributes || {};
    attributes.value = "{{" + property + "}}";

    return keyupElement("textarea", property, attributes);
  };

  tagFuncs.checkbox = function (property, attributes) {
    var lcontext = context, eID = Eventful.newID(), input = makeElement("input", context, eID);

    attributes = attributes || {};
    attributes.type = "checkbox";
    bindAttributes(attributes, input, eID);

    input.attr("checked", lcontext.get(property) ? true : false)
      .change(function () {
        lcontext.set(property, $(this).is(':checked'));
      });

    lcontext.bind(property + "Changed", function () {
      input.attr("checked", lcontext.get(property) ? true : false)
    });

    return input;
  };

  tagFuncs.form = function () {
    var form = jQuery('<form />');
    for (var i = 0; i < arguments.length; i++) {
      form.append(arguments[i]);
    }
    return form;
  };


  var templates = {};

  function scopeTags(str) {
    var count;
    do {
      count = 0;
      str = str.replace(/([^\.a-z|^][a-z0-9]+)\(/ig, function (match, token) {
        if (tagFuncs[token.substring(1)] === undefined) {
          return match;
        } else {
          count += 1;
          return (token.substring(0, 1) + "tagFuncs." + token.substring(1) + "(");
        }
      });
    } while (count > 0);
    return str;
  }

  Eventful.Layout = function (name, gen) {
    var fnStr = gen.toString();
    fnStr = scopeTags(fnStr);
    fnStr = "return (" + fnStr + "(context));";
    templates[name] = new Function("context", "tagFuncs", "params", fnStr);
  };

  function isElement(o) {
    return (
      (typeof HTMLElement === "object") ? o instanceof HTMLElement : //DOM2
      (typeof o === "object") && (o.nodeType === 1) && (typeof o.tagName === "string")
    );
  }

  Eventful.Object.prototype.render = function (template, property, params) {
    var renderID = Eventful.newID(),
      el = jQuery('<div style="display: none;">'),
      data, elements = [], parent = this;

    if (typeof property === "object") {
      params = property;
      property = false;
    }

    function redraw(e) {

      if (isElement(e) || e instanceof jQuery) {
        el.appendTo(e);
      } else if (e.bubbled) {
        return; // Ignore bubbled events.
      }

      var oldContext = context, pEl = el;

      if (data !== undefined) {
        if (data.isEventable) {
          data.removeCallbacks(renderID);
        }

        elements.each(function (el) {
          jQuery(el).remove();
        });
        elements = [];
      }

      data = property ? parent.get(property) : parent;

      if (data.EventfulArray) {
        data.bind("elementChanged", redraw, renderID);
      } else if (!(data instanceof Array)) {
        data = [data];
      }

      data.each(function (datum) {
        context = datum;

        var ret = templates[template](context, tagFuncs, params);
        pEl.after(ret);
        pEl = ret;
        elements.push(ret[0]);
      });

      context = oldContext;
    }

    if (property) {
      parent.bind(property + "Changed", redraw, renderID);
    }

    return redraw;
  };
}(Eventful));

(function (Eventful) {

  Eventful.Model = function (constructor, properties) {
    constructor = constructor || [];
    properties = properties || {};
    var i, len;

    function Model() {
      if (properties.init) {
        for (i in properties.init) {
          if (properties.init.hasOwnProperty(i)) {
            this.set(i, new properties.init[i]());
          }
        }
      }
      for (i = 0, len = constructor.length; i < len; i += 1) {
        this.set(constructor[i], arguments[i]);
      }
    }
    Model.prototype = new Eventful.Object(properties.calc || {});

    return Model;
  };

}(Eventful));

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
