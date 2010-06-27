require :rubygems
require :Sprockets
require :jsmin

EVT = 'Eventful.js'
EVTNJ = 'Eventful.nojquery.js'
MINFILE = 'Eventful.min.js'

secretary = Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => ["src/vendor/jquery/jquery.js", "src/Base.js"],
  :strip_comments => true
)

# Generate a Sprockets::Concatenation object from the source files
concatenation = secretary.concatenation
# Write the concatenation to disk
concatenation.save_to(EVT)
# Produce minified
File.open(MINFILE, 'w') { |file| file.write(JSMin.minify(concatenation.to_s)) }

secretary = Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => ["src/Base.js"],
  :strip_comments => true
)

# Generate a Sprockets::Concatenation object from the source files
concatenation = secretary.concatenation
# Write the concatenation to disk
concatenation.save_to(EVTNJ)