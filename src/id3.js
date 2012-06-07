ID3Stream = Base.extend({
    constructor: function(header, stream) {
        this.header = header;
        this.stream = stream;
        this.offset = 0;
    },
    
    read: function() {
        if (!this.array) {
            this.data = {};

            var frame;
            while (frame = this.readFrame()) {
                if (frame.key in this.data) {
                    if (!Array.isArray(this.data[frame.key]))
                        this.data[frame.key] = [this.data[frame.key]];
                        
                    this.data[frame.key].push(frame.value);
                } else {
                    this.data[frame.key] = frame.value;
                }
            }
        }

        return this.data;
    },
    
    stringToEncoding: function(string, encoding) {
        switch (encoding) {
            case 0:
                return string.replace(/\0$/, '');
                
            case 1:
                var ix = 2, offset1 = 1, offset2 = 0;

                if (string.slice(0, 2) === "\xFE\xFF") {
                    offset1 = 0, offset2 = 1;
                } else {
                    offset1 = 1, offset2 = 0;
                }

                var result = "";

                for (var ix = 2; ix < string.length; ix += 2) {
                    var byte1 = string[ix + offset1].charCodeAt(0);
                    var byte2 = string[ix + offset2].charCodeAt(0);

                    var word1 = (byte1 << 8) | byte2;

                    if (byte1 < 0xD8 || byte1 >= 0xE0) {
                        result += String.fromCharCode(word1);
                    } else {
                        ix += 2;

                        var byte3 = string[ix + offset1].charCodeAt(0);
                        var byte4 = string[ix + offset2].charCodeAt(0);

                        var word2 = (byte3 << 8) | byte4;

                        result += String.fromCharCode(word1, word2);
                    }
                }

                return result.replace(/\0$/, '');
                
            default:
                return string;
        }
    },
    
    decodeTextFrame: function(header) {
        var encoding = this.stream.readUInt8();
        var string = this.stream.readString(header.length - 1);
        return this.stringToEncoding(string, encoding);
    },
    
    decodeBinaryFrame: function(header) {
        return this.stream.readBuffer(header.length);
    },
    
    decodePictureFrame: function(header) {
        var stream = this.stream;
        var encoding = stream.readUInt8();
        var start = stream.offset;
        var i = 0;
        
        while (stream.readUInt8() !== 0); // mime type
        while (stream.readUInt8() !== 0); // picture type
        while (stream.readUInt8() !== 0); // description
        
        return stream.readBuffer(header.length - (stream.offset - start)).data.buffer;
    },
    
    decodeLinkFrame: function(header) {
        var encoding = this.stream.readUInt8();
        var data = this.stream.readString(header.length - 1).split('\0', 2);
        
        return {
            description: this.stringToEncoding(data[0], 0),
            value: this.stringToEncoding(data[1], encoding)
        };
    },
    
    decodeCommentFrame: function(header) {
        var encoding = this.stream.readUInt8();
        var language = this.stream.readString(3);
        var data = this.stream.readString(header.length - 4).split('\0', 2);
        
        return {
            language: this.stringToEncoding(language, 0),
            description: this.stringToEncoding(data[0], 0),
            value: this.stringToEncoding(data[1], encoding)
        };
    },
    
    decodeIdentifierFrame: function(header) {
        var data = this.stream.readString(header.length).split('\0', 2);

        return {
            owner: data[0],
            identifier: data[1]
        };
    }
});

ID3v23Stream = ID3Stream.extend({
    readFrame: function() {
        if (this.offset >= this.header.length) {
            return null;
        }

        var identifier = this.stream.readString(4);
        if (identifier.charCodeAt(0) === 0) {
            this.offset = this.header.length + 1;
            return null;
        }

        var length = this.stream.readUInt32();
        var flags = this.stream.readUInt16();

        var header = {
            identifier: identifier,
            length: length,
            flags: flags
        };

        if (this[this.decoders[identifier]]) {
            var result = {
                value: this[this.decoders[identifier]](header)
            };
            
        } else {
            var result = {
                identifier: identifier,
                header: header,
                value: this.stream.readString(Math.min(length, this.header.length - this.offset))
            };
        }

        if (result) {
            result.key = this.names[identifier] ? this.names[identifier] : 'UNKNOWN';
        }

        this.offset += 10 + length;
        return result;
    },
    
    decoders: {
        /* Identification Frames */
        'TIT1': 'decodeTextFrame',
        'TIT2': 'decodeTextFrame',
        'TIT3': 'decodeTextFrame',
        'TALB': 'decodeTextFrame',
        'TOAL': 'decodeTextFrame',
        'TRCK': 'decodeTextFrame',
        'TPOS': 'decodeTextFrame',
        'TSST': 'decodeTextFrame',
        'TSRC': 'decodeTextFrame',

        /* Involved Persons Frames */
        'TPE1': 'decodeTextFrame',
        'TPE2': 'decodeTextFrame',
        'TPE3': 'decodeTextFrame',
        'TPE4': 'decodeTextFrame',
        'TOPE': 'decodeTextFrame',
        'TEXT': 'decodeTextFrame',
        'TOLY': 'decodeTextFrame',
        'TCOM': 'decodeTextFrame',
        'TMCL': 'decodeTextFrame',
        'TIPL': 'decodeTextFrame',
        'TENC': 'decodeTextFrame',

        /* Derived and Subjective Properties Frames */
        'TBPM': 'decodeTextFrame',
        'TLEN': 'decodeTextFrame',
        'TKEY': 'decodeTextFrame',
        'TLAN': 'decodeTextFrame',
        'TCON': 'decodeTextFrame',
        'TFLT': 'decodeTextFrame',
        'TMED': 'decodeTextFrame',
        'TMOO': 'decodeTextFrame',

        /* Rights and Licence Frames */
        'TCOP': 'decodeTextFrame',
        'TPRO': 'decodeTextFrame',
        'TPUB': 'decodeTextFrame',
        'TOWN': 'decodeTextFrame',
        'TRSN': 'decodeTextFrame',
        'TRSO': 'decodeTextFrame',

        /* Other Text Frames */
        'TOFN': 'decodeTextFrame',
        'TDLY': 'decodeTextFrame',
        'TDEN': 'decodeTextFrame',
        'TDOR': 'decodeTextFrame',
        'TDRC': 'decodeTextFrame',
        'TDRL': 'decodeTextFrame',
        'TDTG': 'decodeTextFrame',
        'TSSE': 'decodeTextFrame',
        'TSOA': 'decodeTextFrame',
        'TSOP': 'decodeTextFrame',
        'TSOT': 'decodeTextFrame',

        /* Attached Picture Frame */
        'APIC': 'decodePictureFrame',

        /* Unique Identifier Frame */
        'UFID': 'decodeIdentifierFrame',

        /* Music CD Identifier Frame */
        'MCDI': 'decodeBinaryFrame',

        /* Comment Frame */
        'COMM': 'decodeCommentFrame',

        /* User Defined URL Link Frame */
        'WXXX': 'decodeLinkFrame',

        /* Private Frame */
        'PRIV': 'decodeBinaryFrame',

        /* Deprecated ID3v2 Frames */
        'TDAT': 'decodeTextFrame',
        'TIME': 'decodeTextFrame',
        'TORY': 'decodeTextFrame',
        'TRDA': 'decodeTextFrame',
        'TSIZ': 'decodeTextFrame',
        'TYER': 'decodeTextFrame',

        /* General encapsulated object */
        'GEOB': 'decodeTerminatedString'
    },
    
    names: {
        /* Identification Frames */
        'TIT1': 'Content group description',
        'TIT2': 'Title/Songname/Content description',
        'TIT3': 'Subtitle/Description refinement',
        'TALB': 'Album/Movie/Show title',
        'TOAL': 'Original album/movie/show title',
        'TRCK': 'Track number/Position in set',
        'TPOS': 'Part of a set',
        'TSST': 'Set subtitle',
        'TSRC': 'ISRC',

        /* Involved Persons Frames */
        'TPE1': 'Lead artist/Lead performer/Soloist/Performing group',
        'TPE2': 'Band/Orchestra/Accompaniment',
        'TPE3': 'Conductor',
        'TPE4': 'Interpreted, remixed, or otherwise modified by',
        'TOPE': 'Original artist/performer',
        'TEXT': 'Lyricist/Text writer',
        'TOLY': 'Original lyricist/text writer',
        'TCOM': 'Composer',
        'TMCL': 'Musician credits list',
        'TIPL': 'Involved people list',
        'TENC': 'Encoded by',

        /* Derived and Subjective Properties Frames */
        'TBPM': 'BPM',
        'TLEN': 'Length',
        'TKEY': 'Initial key',
        'TLAN': 'Language',
        'TCON': 'Content type',
        'TFLT': 'File type',
        'TMED': 'Media type',
        'TMOO': 'Mood',

        /* Rights and Licence Frames */
        'TCOP': 'Copyright message',
        'TPRO': 'Produced notice',
        'TPUB': 'Publisher',
        'TOWN': 'File owner/licensee',
        'TRSN': 'Internet radio station name',
        'TRSO': 'Internet radio station owner',

        /* Other Text Frames */
        'TOFN': 'Original filename',
        'TDLY': 'Playlist delay',
        'TDEN': 'Encoding time',
        'TDOR': 'Original release time',
        'TDRC': 'Recording time',
        'TDRL': 'Release time',
        'TDTG': 'Tagging time',
        'TSSE': 'Software/Hardware and settings used for encoding',
        'TSOA': 'Album sort order',
        'TSOP': 'Performer sort order',
        'TSOT': 'Title sort order',

        /* Attached Picture Frame */
        // 'APIC': 'Attached picture',
        'APIC': 'Cover Art',

        /* Unique Identifier Frame */
        'UFID': 'Unique identifier',

        /* Music CD Identifier Frame */
        'MCDI': 'Music CD identifier',

        /* Comment Frame */
        'COMM': 'Comment',

        /* User Defined URL Link Frame */
        'WXXX': 'User defined URL link',

        /* Private Frame */
        'PRIV': 'Private',

        /* Deprecated ID3v2 frames */
        'TDAT': 'Date',
        'TIME': 'Time',
        'TORY': 'Original release year',
        'TRDA': 'Recording dates',
        'TSIZ': 'Size',
        'TYER': 'Year'
    }
});

ID3v22Stream = ID3Stream.extend({
    readFrame: function() {
        if (this.offset >= this.header.length) {
            return null;
        }

        var identifier = this.stream.readString(3);

        if (identifier.charCodeAt(0) === 0) {
            this.offset = this.header.length + 1;
            return null;
        }

        var length = this.stream.readUInt24();

        var header = {
            identifier: identifier,
            length: length
        };

        if (this[this.decoders[identifier]]) {
            var result = {
                value: this[this.decoders[identifier]](header)
            };
            
        } else {
            var result = {
                identifier: identifier,
                header: header,
                value: this.stream.readString(length)
            };
        }

        result.key = this.names[identifier] ? this.names[identifier] : 'UNKNOWN';
        
        this.offset += 10 + length;
        return result;
    },
    
    decoders: {
        'UFI': 'decodeIdentifierFrame',
        'TT1': 'decodeTextFrame',
        'TT2': 'decodeTextFrame',
        'TT3': 'decodeTextFrame',
        'TP1': 'decodeTextFrame',
        'TP2': 'decodeTextFrame',
        'TP3': 'decodeTextFrame',
        'TP4': 'decodeTextFrame',
        'TCM': 'decodeTextFrame',
        'TXT': 'decodeTextFrame',
        'TLA': 'decodeTextFrame',
        'TCO': 'decodeTextFrame',
        'TAL': 'decodeTextFrame',
        'TPA': 'decodeTextFrame',
        'TRK': 'decodeTextFrame',
        'TRC': 'decodeTextFrame',
        'TYE': 'decodeTextFrame',
        'TDA': 'decodeTextFrame',
        'TIM': 'decodeTextFrame',
        'TRD': 'decodeTextFrame',
        'TMT': 'decodeTextFrame',
        'TFT': 'decodeTextFrame',
        'TBP': 'decodeTextFrame',
        'TCR': 'decodeTextFrame',
        'TPB': 'decodeTextFrame',
        'TEN': 'decodeTextFrame',
        'TSS': 'decodeTextFrame',
        'TOF': 'decodeTextFrame',
        'TLE': 'decodeTextFrame',
        'TSI': 'decodeTextFrame',
        'TDY': 'decodeTextFrame',
        'TKE': 'decodeTextFrame',
        'TOT': 'decodeTextFrame',
        'TOA': 'decodeTextFrame',
        'TOL': 'decodeTextFrame',
        'TOR': 'decodeTextFrame',

        'COM': 'decodeCommentFrame'
    },

    names: {
        /* Identification Frames */
        'TT1': 'Content group description',
        'TT2': 'Title/Songname/Content description',
        'TT3': 'Subtitle/Description refinement',
        'TAL': 'Album/Movie/Show title',
        'TOT': 'Original album/movie/show title',
        'TRK': 'Track number/Position in set',
        'TPA': 'Part of a set',
        'TRC': 'ISRC',

        /* Involved Persons Frames */
        'TP1': 'Lead artist/Lead performer/Soloist/Performing group',
        'TP2': 'Band/Orchestra/Accompaniment',
        'TP3': 'Conductor',
        'TP4': 'Interpreted, remixed, or otherwise modified by',
        'TOA': 'Original artist/performer',
        'TXT': 'Lyricist/Text writer',
        'TOL': 'Original lyricist/text writer',
        'TCO': 'Composer',
        'TEN': 'Encoded by',

        /* Derived and Subjective Properties Frames */
        'TBP': 'BPM',
        'TLE': 'Length',
        'TKE': 'Initial key',
        'TLA': 'Language',
        'TMT': 'Media type',

        /* Rights and Licence Frames */
        'TCR': 'Copyright message',
        'TPB': 'Publisher',

        /* Other Text Frames */
        'TOF': 'Original filename',
        'TDY': 'Playlist delay',
        'TSS': 'Software/Hardware and settings used for encoding',
        'TFT': 'File type',

        /* Buffering */
        'BUF': 'Recommended buffer size',

        /* Attached Picture Frame */
        'PIC': 'Attached picture',

        /* Unique Identifier Frame */
        'UFI': 'Unique identifier',

        /* Music CD Identifier Frame */
        'MCI': 'Music CD identifier',

        /* Comment Frame */
        'COM': 'Comment',

        /* User Defined URL Link Frame */
        'WXX': 'User defined URL link',

        /* Deprecated ID3v2 frames */
        'TDA': 'Date',
        'TIM': 'Time',
        'TOR': 'Original release year',
        'TRD': 'Recording dates',
        'TSI': 'Size',
        'TYE': 'Year'
    }
});