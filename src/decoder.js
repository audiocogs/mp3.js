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

        // if we just seeked, we may start getting errors involving the frame reservoir.
        // theoretically the limit to this is 29 frames, so ignore recoverable errors up to
        // 29 times before letting them through.
        var frames = 0;
        while (true) {
            try {
                frame.decode(stream);
                break;
            } catch (err) {
                if (err instanceof AV.UnderflowError || ++frames > 29)
                    throw err;
            }
        }
        
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
    
    this.prototype.seek = function(timestamp) {
        var offset;
        
        // if there was a Xing or VBRI tag with a seek table, use that
        // otherwise guesstimate based on CBR bitrate
        if (this.demuxer.seekPoints.length > 0) {
            timestamp = this._super(timestamp);
            offset = this.stream.offset;
        } else {
            offset = timestamp * this.format.bitrate / 8 / this.format.sampleRate;
        }
        
        this.mp3_stream.reset(offset);
        
        // try to find 3 consecutive valid frame headers in a row
        for (var i = 0; i < 4096; i++) {
            var pos = offset + i;
            for (var j = 0; j < 3; j++) {
                this.mp3_stream.reset(pos);
                
                try {
                    var header = MP3FrameHeader.decode(this.mp3_stream);
                } catch (e) {
                    break;
                }
                
                // skip the rest of the frame
                var size = header.framesize();
                if (size == null)
                    break;
                        
                pos += size;
            }
            
            // check if we're done
            if (j === 3)
                break;
        }
        
        // if we didn't find 3 frames, just try the first one and hope for the best
        if (j !== 3)
            i = 0;
            
        this.mp3_stream.reset(offset + i);
        
        // if we guesstimated, update the timestamp to another estimate of where we actually seeked to
        if (this.demuxer.seekPoints.length === 0)
            timestamp = this.stream.offset / (this.format.bitrate / 8) * this.format.sampleRate;
        
        return timestamp;
    };
});