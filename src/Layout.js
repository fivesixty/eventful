//= require "Object"

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
    /**
      * Store a destructor in the jQuery data for the element.
      * This will remove event bindings to the context, and is called by the
      * wrapper around jQuery.cleanData.
      *
      * Prevents build up of event hooks to removed DOM elements.
      **/
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
    
    /**
      * Attributes.
      **/
    if (offset === 2) {
      bindAttributes(attrs, element, eID);
    }
    
    /**
      * Contents.
      **/
    for (i = offset, len = arguments.length; i < len; i += 1) {
      if (typeof (arguments[i]) === "string") {
        // Wrap strings inside a span for a redraw closure,
        // so they can be redrawn individually on changes.
      
        (function (templateStr, context) {
          var subel = jQuery("<span></span>").appendTo(element);
          
          function redraw() {
            subel.html(replaceTokens(context, templateStr));
          }
          redraw();
          
          bindTokens(context, templateStr, redraw, eID);
        }(arguments[i], context));
        
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
    
    return element;
  }
  
  /**
    * Wrap around jQuery.cleanData to clear Eventful bindings from removed elements.
    **/
  jQuery.cleanData = function (elems) {
    for (var i = 0, elem; (elem = elems[i]) !== undefined; i += 1) {
      if (elem.eventfulUnbind) {
        elem.eventfulUnbind();
        delete elem.eventfulUnbind;
      }
    }
    return jqCleanData.apply(this, arguments);
  };
  
  /**
    * Storage object for functions scoped to the template drawing.
    **/
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
  
  /**
    * Form Elements.
    **/
  
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
  
  /**
    * Bind the template function to be called with the context.
    **/
  Eventful.Layout = function (name, gen) {
    var fnStr = gen.toString()
      .replace(/^function(?:\s+)?(?:[a-z]+)?\([^\)]*\) \{/, function(match) { return match+"return ("; })
      .replace(/;?\s*\}$/, function () { return ");}"; });
    console.log(fnStr);
    fnStr = scopeTags(fnStr);
    fnStr = "return (" + fnStr + "(context));";
    templates[name] = new Function("context", "tagFuncs", "params", fnStr);
  };
  
  /** http://stackoverflow.com/questions/384286/ **/
  function isElement(o) {
    return (
      (typeof HTMLElement === "object") ? o instanceof HTMLElement : //DOM2
      (typeof o === "object") && (o.nodeType === 1) && (typeof o.tagName === "string")
    );
  }
  
  /**
    * Render takes a template name, a parent object, and a property of that object to use as a context.
    * If property is absent, the parent object is used as the data context.
    **/
  Eventful.Object.prototype.render = function (template, property, params) {
    var renderID = Eventful.newID(),      
      // el is the start marker tag in the DOM so we know where to insert to.
      el = jQuery('<div style="display: none;">'),
      data, elements = [], parent = this;
      
    if (typeof property === "object") {
      params = property;
      property = false;
    }
    
    function redraw(e) {
      
      // If argument is a DOM/jQuery element, append to it.
      if (isElement(e) || e instanceof jQuery) {
        el.appendTo(e);
      } else if (e.bubbled) {
        return; // Ignore bubbled events.
      }
      
      // Save the context, so we can restore it later.
      var oldContext = context, pEl = el;
      
      // If this is not the first time called (we have a previous data context stored.
      if (data !== undefined) {
        // Remove binding. Data was likely an Eventful.Array
        if (data.isEventable) {
          data.removeCallbacks(renderID);
        }
        
        // Remove all elements added previously.
        elements.each(function (el) {
          jQuery(el).remove();
        });
        elements = [];
      }
      
      // Get the new data context, and wrap into an array for ease of iteration.
      data = property ? parent.get(property) : parent;
      
      // If it's an eventful array, bind redraw to changes in elements.
      if (data.EventfulArray) {
        data.bind("elementChanged", redraw, renderID);
      } else if (!(data instanceof Array)) {
        data = [data];
      }
      
      // Iterate over the data elements.
      data.each(function (datum) {
        // Assign a context, to be used from within the tag function calls.
        context = datum;
        
        // Bind scope to tag functions for the eval (inspired by Jaml)
        var ret = templates[template](context, tagFuncs, params);
        pEl.after(ret);
        pEl = ret;
        elements.push(ret[0]);
      });
      
      // Restore the context.
      context = oldContext;
    }
    
    if (property) {
      // Bind the redraw to changes to our data context.
      parent.bind(property + "Changed", redraw, renderID);
    }
    
    return redraw;
  };
}(Eventful));