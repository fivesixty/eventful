require :rubygems
require :Sprockets
require :jsmin

CONCATFILE = 'Eventful.js'
MINFILE = 'Eventful.min.js'

secretary = Sprockets::Secretary.new(
  :load_path    => ["src", "src/vendor/jquery"],
  :source_files => ["src/Base.js"],
  :strip_comments => true
)

# Generate a Sprockets::Concatenation object from the source files
concatenation = secretary.concatenation
# Write the concatenation to disk
concatenation.save_to(CONCATFILE)
# Produce minified
File.open(MINFILE, 'w') { |file| file.write(JSMin.minify(concatenation.to_s)) }

# Install provided assets into the asset root
secretary.install_assets