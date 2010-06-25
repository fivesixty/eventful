var Test = Test || {};

Test.Ploop = function () {
  module("Ploop");

  asyncTest("async", function() {
    var scope = {
      val: "scope"
    }
    
    Eventful.Ploop.async(scope, function (arg) {
      ok(true, "function called.");
      equals(this.val, "scope", "function scoped correctly");
      equals(arg, "argument", "function arguments passed");
      start();
    }, ["argument"]);
  });

  asyncTest("every", function() {
    expect(5);
    
    var count = 0;
    var control = Eventful.Ploop.every(50, function () {
      ++count;
      ok(true, count);
      
      if (count === 2) {
        control.stop();
        ok( true, "stop() and start() executing." );
        setTimeout(control.start, 50);
      }
      
      if (count === 4) {
        control.stop();
        start();
      }
    });
  });
}