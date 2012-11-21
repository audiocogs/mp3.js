//import "stream.js"
//import "frame.js"
//import "synth.js"

//import "layer1.js"
//import "layer2.js"
//import "layer3.js"

var MP3Decoder = AV.Decoder.extend(function() {
    AV.Decoder.register('mp3', this);
    
    this.prototype.init = function() {
        this.mp3_stream = new MP3Stream(this.bitstream);
        this.frame = new MP3Frame();
        this.synth = new MP3Synth();
    };
    
    this.prototype.readChunk = function() {
        var stream = this.mp3_stream;
        var frame = this.frame;
        var synth = this.synth;
                
        frame.decode(stream);
        synth.frame(frame);
        
        // interleave samples
        var data = synth.pcm.samples,
            channels = synth.pcm.channels,
            len = synth.pcm.length,
            output = new Float32Array(len * channels),
            j = 0;
        
        for (var k = 0; k < len; k++) {
            for (var i = 0; i < channels; i++) {
                output[j++] = data[i][k];
            }
        }
        
        return output;
    };
});