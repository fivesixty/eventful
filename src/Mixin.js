//= require "Ploop"

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
      
      for (var callerID in eventListeners) {
        if (eventListeners.hasOwnProperty(callerID)) {
          for (var i = 0, len = eventListeners[callerID].length; i < len; i++) {
            /** TODO: Make identifier generation not so amazingly dangerous and hacky. **/
            Eventful.Ploop.async(this, eventListeners[callerID][i], e, this.getID() + eventName + callerID + i);
          }
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