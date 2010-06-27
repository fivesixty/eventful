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
      "tt", "i", "b", "big", "small", "pre",
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
  
  function scopeTags(str) {
    var count;
    do {
      count = 0;
      str = str.replace(/([^\.a-z|^][a-z0-9]+)\(/ig, function (match, token) {
        if (tagFuncs[token.substring(1)] === undefined) {
          return match;
        } else {
          count++;
          return (token.substring(0, 1) + "tagFuncs." + token.substring(1) + "(");
        }
      });
    } while (count > 0);
    return str;
  }
  
  /**
    * Bind the template function to be called with the context.
    **/
  Layout.Template = function (name, gen) {
    var fnStr = gen.toString();
    fnStr = scopeTags(fnStr);
    fnStr = "return (" + fnStr + "(context));";
    console.log(fnStr);
    templates[name] = new Function("context", "tagFuncs", fnStr);
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
      console.log("Template '" + template + "' redrawn.");
      
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
        var ret = templates[template](context, tagFuncs);
        pEl.after(ret);
        pEl = ret;
        elements.push(ret[0]);
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