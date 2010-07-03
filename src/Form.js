//= require "Object"

(function (Eventful) {

  var forms = {};

  var object = {};

  var fnObj = {
    
    keyupElement: function (input, attribute, caption) {
      input.attr("value", object.get(attribute) || "")
        .keyup(function () {
          if (object.get(attribute) !== input.val()) {
            object.set(attribute, input.val());
          }
        });
      
      object.bind(attribute + "Changed", function () {
        input.val(object.get(attribute));
      });
      
      return input;
    },
    
    text: function (attribute, caption) {
      return fnObj.keyupElement($('<input type="text" />'), attribute, caption);
    },
    
    password: function (attribute, caption) {
      return fnObj.keyupElement($('<input type="password" />'), attribute, caption);
    },
    
    textarea: function (attribute, caption) {
      return fnObj.keyupElement($('<textarea />'), attribute, caption);
    },
    
    checkbox: function (attribute, caption) {
      var input = $('<input type="checkbox" />')
        .attr("checked", object.get(attribute) ? true : false)
        .change(function () {
          object.set(attribute, $(this).is(':checked'));
        });
      
      object.bind(attribute + "Changed", function () {
        input.attr("checked", object.get(attribute) ? true : false)
      });
      
      return input;
    },
    
    form: function () {
      var form = $('<form />');
      for (var i = 0; i < arguments.length; i++) {
        form.append(arguments[i]);
      }
      return form;
    }
  }
  
  function scopeTags(str) {
    var count;
    do {
      count = 0;
      str = str.replace(/([^\.a-z|^][a-z0-9]+)\(/ig, function (match, token) {
        if (fnObj[token.substring(1)] === undefined) {
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
  Eventful.Form = function (name, gen) {
    var fnStr = gen.toString();
    fnStr = scopeTags(fnStr);
    fnStr = "return (" + fnStr + "(context));";
    forms[name] = new Function("context", "tagFuncs", fnStr);
  };
  
  Eventful.Object.prototype.form = function (name) {
    var $this = this;
    object = $this;
    return function (appendTo) {
      forms[name]($this, fnObj).appendTo(appendTo);
    }
  }

}(Eventful));