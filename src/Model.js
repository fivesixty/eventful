//= require "Object"

/**
  * Constructor Creator
  * First argument is an array of arguments for the constructor.
  * Second is an object with properties:
  * init:
  *   an object with constructors for properties that need to be created inside the constructor
  * calc:
  *   an object with calculated properties for the object
  **/
Eventful.Model = (function () {
  
  return function (constructor, properties) {
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
  
}());