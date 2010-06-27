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
    
  var eventTrigger = window['addEventListener'] && window['postMessage'];
  
  var queue = {}, front = 0, back = 0, messageName = "#A";
    
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
      queue[timeouts[front]][1].apply(queue[timeouts[front]][0], queue[timeouts[front]][2]);
      delete timeouts[front];
      front += 1;
      if (front === back) {
        timeouts = [];
        queue = {};
        front = back = 0;
        console.log("Event queue cleared.");
      }
    }
  }
  
  Ploop.async = function (scope, fn, event, identifier) {
    if (queue[identifier] === undefined) {
      queue[identifier] = [scope, fn, [scope, event]];
      timeouts[back] = identifier;
      back += 1;
      eventTrigger ? window.postMessage(messageName, "*") : setTimeout(handleMessage, 0);
    } else {
      queue[identifier][2].push(event);
    }
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