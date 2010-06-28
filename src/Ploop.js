//= require "Base"

/**
  * Asynchronous Processing Loop.
  **/
Eventful.Ploop = (function () {
  
  /**
    * Asynchronous function call, derived from:
    * http://ajaxian.com/archives/settimeout-delay
    *
    * IE postMessage is synchronous. This wouldn't be a problem except for the 
    * recursion limit through window defined objects, which postMessage is.
    *
    * Timeouts stores a hashmap of event handlers that need to be called.
    * Queue stores a queue of ids into the Timeouts hash in the order to call them.
    * Uses a back-chases-front array queue, clearing data when it catches up.
    **/
  
  var Ploop = {}, queue = [],
      eventTrigger = window['addEventListener'] && window['postMessage'],
      timeouts = {}, front = 0, back = 0, messageName = "#A";
  
  function handleMessage(event) {
    if (event && !(event.source.evtfulUID === window.evtfulUID && event.data === messageName)) {
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
      timeouts[identifier] = [scope, fn, [scope, event]];
      queue[back] = identifier;
      back += 1;
      eventTrigger ? window.postMessage(messageName, "*") : setTimeout(handleMessage, 0);
    } else {
      timeouts[identifier][2].push(event);
    }
  };
    
  if (eventTrigger) {
    /**
      * event.source !== window in Internet Explorer,
      * so generate a unique identifier for the window.
      * IE currently doesn't use eventTrigger, but other browsers may exhibit this behaviour too.
      **/
    window.evtfulUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
    
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
  };
  
  return Ploop;
  
}());