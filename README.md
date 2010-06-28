# Eventful.js

Object events and template binding for javascript. Currently approaching a testable alpha.

Low level framework allows for events between javascript objects. On top of this are implementations of Object and Array that emit suitable events, and bubble events from their members. On top of this is a jQuery based layout system, using Jaml-esque syntax, which binds changes in your backing object almost directly to properties on DOM elements.

Also supported are calculated properties, which have dependencies and emit events like other properties, and are also cacheable and settable.

## Build

Requires Sprockets to build, and closure-compiler for minification.

    > gem install sprockets closure-compiler
    [ ... ]
    
    > ruby build.rb
    Written to build/Eventful.js
    
    > ruby build.rb
    Usage: build.rb [options] filename
      -m, --minify                     Minify Output
      -j, --jquery                     Bundle jQuery
      -c, --comments                   Preserve Comments
      -h, --help                       Command Help

Minification is currently SIMPLE closure compilation. jQuery is version 1.4.2

## Future work

* Investigate integration with Sammy for higher level navigation management.
* More flexible layout options.
* Compatibility with closure ADVANCED minification.
* Binding Form to an object.