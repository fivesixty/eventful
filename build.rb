require :rubygems
require :Sprockets
require 'closure-compiler'

EVT = 'build/Eventful.js'
EVTNJ = 'build/Eventful.nojquery.js'
MINFILE = 'build/Eventful.min.js'

concatenation = Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => ["src/vendor/jquery/jquery.js", "src/Base.js"],
  :strip_comments => true
).concatenation

# Write the concatenation to disk
concatenation.save_to(EVT)
# Produce minified
File.open(MINFILE, 'w') { |file| file.write(Closure::Compiler.new(:compilation_level => 'SIMPLE_OPTIMIZATIONS').compile(concatenation.to_s)) }

# Save version without jquery bundled.
Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => ["src/Base.js"],
  :strip_comments => true
).concatenation.save_to(EVTNJ)