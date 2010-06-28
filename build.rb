require :rubygems
require :Sprockets
require :optparse

options = {
  :bundle_jquery => false,
  :minify        => false,
  :filename      => 'build/Eventful.js',
  :comments      => false,
  :sources       => ["src/Base.js"]
}

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

if !ARGV[0].nil?
  options[:filename] = ARGV[0]
end

if options[:bundle_jquery]
  options[:sources].unshift "src/vendor/jquery/jquery.js"
end

concatenation = Sprockets::Secretary.new(
  :load_path    => ["src"],
  :source_files => options[:sources],
  :strip_comments => !options[:comments]
).concatenation

if options[:minify]
  require 'closure-compiler'
  File.open(options[:filename], 'w') { |file| file.write(Closure::Compiler.new(:compilation_level => 'SIMPLE_OPTIMIZATIONS').compile(concatenation.to_s)) }
else
  concatenation.save_to options[:filename]
end

puts "Built: " + options[:filename]