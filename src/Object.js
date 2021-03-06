//= require "Mixin"

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
(function (Eventful) {

  /**
    * Constructor and prototype.
    **/  
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
  };
  
  /**
    * Wrapper for triggering a change of a property, triggering dependencies too.
    **/
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
    
    /**
      * Enable event bubbling.
      **/
    var $this = this;
    if (value.EventfulObject && Eventful.enableBubbling) {
      value.bind("propertyChanged", function () {
        $this.triggerChange("propertyChanged", true);
      }, $this.getID());
    } else if (value.EventfulArray) {
      value.bind("elementChanged", function (e) {
        // Preserve bubbled status for Array property of Object.
        // TODO: Ensure works with aggregated events.
        $this.triggerChange(prop, e.bubbled);
      }, $this.getID());
    }
    
    this.triggerChange(prop);
  };
  
  
  /**
    * Use [property]Changed event listening to bind a local property to a remote one.
    **/
  EventedObject.bindValue = function (property, remoteObject, propertyName) {
    var $this = this;
    function syncVal() {
      $this.set(property, remoteObject.get(propertyName));
    }
    remoteObject.bind(propertyName + "Changed", syncVal, $this.getID());
    syncVal();
  };
  
}(Eventful));