function MP3Stream(stream) {
    this.stream = stream;              // actual bitstream
    this.sync = false;                 // stream sync found
    this.freerate = 0;                 // free bitrate (fixed)
    this.this_frame = stream.offset;   // start of current frame
    this.next_frame = stream.offset;   // start of next frame
    this.error = MP3Stream.ERROR.NONE; // error code
    
    this.main_data = new Uint8Array(BUFFER_MDLEN); // actual audio data
    this.md_len = 0;                               // length of main data
    
    // copy methods from actual stream
    for (var key in stream) {
        if (typeof stream[key] === 'function')
            this[key] = stream[key].bind(stream);
    }
}

MP3Stream.prototype.getU8 = function(offset) {
    var stream = this.stream.stream;
    return stream.peekUInt8(offset - stream.offset);
};

MP3Stream.prototype.nextByte = function() {
    var stream = this.stream;
    return stream.bitPosition === 0 ? stream.stream.offset : stream.stream.offset + 1;
};

MP3Stream.prototype.doSync = function() {
    var stream = this.stream.stream;
    this.align();
    
    while (this.available(16) && !(stream.peekUInt8(0) === 0xff && stream.peekUInt8(1) & 0xe0 === 0xe0)) {
        this.advance(8);
    }

    if (!this.available(BUFFER_GUARD)) {
        return -1;
    }
};

MP3Stream.ERROR = {
    NONE           : 0x0000,      // no error 

    BUFLEN         : 0x0001,      // input buffer too small (or EOF) 
    BUFPTR         : 0x0002,      // invalid (null) buffer pointer 

    NOMEM          : 0x0031,      // not enough memory 

    LOSTSYNC       : 0x0101,      // lost synchronization 
    BADLAYER       : 0x0102,      // reserved header layer value 
    BADBITRATE     : 0x0103,      // forbidden bitrate value 
    BADSAMPLERATE  : 0x0104,      // reserved sample frequency value 
    BADEMPHASIS    : 0x0105,      // reserved emphasis value 

    BADCRC         : 0x0201,      // CRC check failed 
    BADBITALLOC    : 0x0211,      // forbidden bit allocation value 
    BADSCALEFACTOR : 0x0221,      // bad scalefactor index 
    BADMODE        : 0x0222,      // bad bitrate/mode combination 
    BADFRAMELEN    : 0x0231,      // bad frame length 
    BADBIGVALUES   : 0x0232,      // bad big_values count 
    BADBLOCKTYPE   : 0x0233,      // reserved block_type 
    BADSCFSI       : 0x0234,      // bad scalefactor selection info 
    BADDATAPTR     : 0x0235,      // bad main_data_begin pointer 
    BADPART3LEN    : 0x0236,      // bad audio data length 
    BADHUFFTABLE   : 0x0237,      // bad Huffman table select 
    BADHUFFDATA    : 0x0238,      // Huffman data overrun 
    BADSTEREO      : 0x0239       // incompatible block_type for JS 
};