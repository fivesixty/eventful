//= require "Ploop"

/**
  * Mixin Function for adding base Event functions to an Objects prototype.
  **/
(function (Eventful) {

  var Listeners = {};

  Eventful.Mixin = function (target) {
    
    /**
      * Basic target checks.
      **/
    if (target === undefined) {
      target = {};
    } else if (target.isEventable) {
      return target;
    }
    
    target.isEventable = true;
    
    /**
      * Binds a callback function to an event on this Object.
      **/
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
    
    /**
      * Removes all callbacks for given Caller.
      **/
    target.removeCallbacks = function (callerID) {
      var thisID = this.getID(), i;
      /** TODO: Make Safer **/
      for (i in Listeners[thisID]) {
        if (Listeners[thisID][i][callerID] !== undefined) {
          delete Listeners[thisID][i][callerID];
        }
      }
    };
    
    /**
      * Trigger an event on this object.
      **/
    target.trigger = function (eventName, e) {
      var thisID = this.getID(), eventListeners, callerID, i, len;
      if (Listeners[thisID] !== undefined && (eventListeners = Listeners[thisID][eventName]) !== undefined) {
        for (callerID in eventListeners) {
          if (eventListeners.hasOwnProperty(callerID)) {
            for (i = 0, len = eventListeners[callerID].length; i < len; i += 1) {
              /** TODO: Make identifier generation not so amazingly dangerous and hacky. **/
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