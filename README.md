# Eventful.js

Object events and template binding for javascript. Currently approaching a testable alpha.

Low level framework allows for events between javascript objects. On top of this are implementations of Object and Array that emit suitable events, and bubble events from their members. On top of this is a jQuery based layout system, using Jaml-esque syntax, which binds changes in your backing object almost directly to properties on DOM elements.

Also supported are calculated properties, which have dependencies and emit events like other properties, and are also cacheable and settable.

## Build

Uses Sprockets and closure compiler to build, which can be installed using:

    gem install sprockets closure-compiler
    
This generates 3 files.

    build/Eventful.js
    build/Eventful.nojquery.js
    build/Eventful.min.js

The standard Eventful.js bundles in the jquery requirement. Eventful.min is minified using the closure compiler on SIMPLE, and does not bundle jquery.

## Future work

* Investigate integration with Sammy for higher level navigation management.
* More flexible layout options.
* Compatibility with closure ADVANCED minification.
* Binding Form to an object.