//import "header.js"
//import "layer2.js"
//import "layer3.js"

function MP3Frame() {
    this.header = null;                     // MPEG audio header
    this.options = 0;                       // decoding options (from stream)
    this.sbsample = makeArray([2, 36, 32]); // synthesis subband filter samples
    this.overlap = makeArray([2, 32, 18]);  // Layer III block overlap data
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

const DECODERS = [
    function() { console.log("Layer I decoding is not implemented!"); },
    new Layer2(),
    new Layer3()
];

MP3Frame.prototype.decode = function(stream) {
    if (!this.header || !(this.header.flags & FLAGS.INCOMPLETE))
        this.header = MP3FrameHeader.decode(stream);

    this.header.flags &= ~FLAGS.INCOMPLETE;
    DECODERS[this.header.layer - 1].decode(stream, this);
};