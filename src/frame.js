//import "header.js"

function MP3Frame() {
    this.header = null;                     // MPEG audio header
    this.options = 0;                       // decoding options (from stream)
    this.sbsample = makeArray([2, 36, 32]); // synthesis subband filter samples
    this.overlap = makeArray([2, 32, 18]);  // Layer III block overlap data
    this.decoders = [];
}

function makeArray(lengths, Type) {
    if (!Type) Type = Float64Array;
    
    if (lengths.length === 1) {
        return new Type(lengths[0]);
    }
    
    var ret = [],
        len = lengths[0];
        
    for (var j = 0; j < len; j++) {
        ret[j] = makeArray(lengths.slice(1), Type);
    }
    
    return ret;
}

// included layer decoders are registered here
MP3Frame.layers = [];

MP3Frame.prototype.decode = function(stream) {
    if (!this.header || !(this.header.flags & FLAGS.INCOMPLETE))
        this.header = MP3FrameHeader.decode(stream);

    this.header.flags &= ~FLAGS.INCOMPLETE;
    
    // make an instance of the decoder for this layer if needed
    var decoder = this.decoders[this.header.layer - 1];
    if (!decoder) {
        var Layer = MP3Frame.layers[this.header.layer];
        if (!Layer)
            throw new Error("Layer " + this.header.layer + " is not supported.");
            
        decoder = this.decoders[this.header.layer - 1] = new Layer();
    }
    
    decoder.decode(stream, this);
};