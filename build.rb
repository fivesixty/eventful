require :Sprockets
require :optparse

# Defaults
options = {
  :bundle_jquery => false,
  :minify        => false,
  :filename      => 'build/Eventful.js',
  :comments      => false,
  :sources       => ["src/*.js"]
}

# Parse Options
OptionParser.new do |opts|
  opts.banner = "Usage: build.rb [options] filename"
  
  opts.on("-m", "--minify", "Minify Output") do |m|
    options[:minify] = m
  end
  
  opts.on("-j", "--jquery", "Bundle jQuery") do |jq|
    options[:bundle_jquery] = jq
  end
  
  opts.on("-c", "--comments", "Preserve Comments") do |c|
    options[:comments] = c
  end
  
  opts.on('-h', '--help', 'Command Help' ) do
    puts opts
    exit
  end
end.parse!

# If given an argument, use this as filename.
if ARGV[0]
  options[:filename] = ARGV[0]
end

# Add jquery path to start of sources to bundle it.
if options[:bundle_jquery]
  options[:sources].unshift "src/vendor/jquery/jquery.js"
end

# Concatenate files.
concatenation = Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => options[:sources],
  :strip_comments => !options[:comments]
).concatenation

# Write out file.
if options[:minify]
  require 'closure-compiler'
  File.open(options[:filename], 'w') { |file| file.write(Closure::Compiler.new(:compilation_level => 'SIMPLE_OPTIMIZATIONS').compile(concatenation.to_s)) }
else
  concatenation.save_to options[:filename]
end

# Finish
puts "Built: " + options[:filename]
