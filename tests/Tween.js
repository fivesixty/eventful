var Test = Test || {};

Test.Tween = function () {
  module("Tween");

  asyncTest("anim", function() {
    var target = {
      val: 0
    }
    
    Eventful.Tween("animName", target, "val", 0, 1, 500, "linear", function () {
      equals (target.val, 1, "Animation Finished.");
      start();
    });
    
    setTimeout(function () {
      ok( target.val > 0.45 && target.val < 0.55, "Animation in middle. (" + target.val + ")" );
    }, 250);
  });
}