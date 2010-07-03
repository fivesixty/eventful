var Test = Test || {};

Test.Array = function () {
  module("Array");

  asyncTest("operations", function() {
    expect(7);
    
    var arr = new Eventful.Array(1,2,3);
    same(arr.toArray(), [1,2,3], "Argument Initialising.");
    
    arr.bind("elementChanged", function () {
      for (var i = 0; i < arguments.length; i++) {
        ok(true, "elementChanged fired.");
      }
    });
    
    arr.push(4);
    same(arr.toArray(), [1,2,3,4], "Push(4)");
    
    equals(arr.pop(), 4, "Pop()");
    
    arr.set(0, 6);
    same(arr.toArray(), [6,2,3], "Set(0, 6)");
    
    setTimeout(start, 0);
  });
}