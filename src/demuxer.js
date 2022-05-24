var AV = require('av');
var ID3v23Stream = require('./id3').ID3v23Stream;
var ID3v22Stream = require('./id3').ID3v22Stream;
var MP3FrameHeader = require('./header');
var MP3Stream = require('./stream');

var MP3Demuxer = AV.Demuxer.extend(function() {
    AV.Demuxer.register(this);

    this.probe = function(stream) {
        var off = stream.offset;

        // skip id3 metadata if it exists
        var id3header = MP3Demuxer.getID3v2Header(stream);
        if (id3header)
            stream.advance(10 + id3header.length);

        // attempt to read the header of the first audio frame
        var s = new MP3Stream(new AV.Bitstream(stream));
        var header = null;

        try {
            header = MP3FrameHeader.decode(s);
        } catch (e) {};

        // go back to the beginning, for other probes
        stream.seek(off);

        return !!header;
    };

    this.getID3v2Header = function(stream) {
        if (stream.peekString(0, 3) == 'ID3') {
            stream = AV.Stream.fromBuffer(stream.peekBuffer(0, 10));
            stream.advance(3); // 'ID3'

            var major = stream.readUInt8();
            var minor = stream.readUInt8();
            var flags = stream.readUInt8();
            var bytes = stream.readBuffer(4).data;
            var length = (bytes[0] << 21) | (bytes[1] << 14) | (bytes[2] << 7) | bytes[3];

            return {
                version: '2.' + major + '.' + minor,
                major: major,
                minor: minor,
                flags: flags,
                length: length
            };
        }

        return null;
    };

    const XING_OFFSETS = [[32, 17], [17, 9]];
    this.prototype.parseDuration = function(header, off) {
        var stream = this.stream;
        var frames;
        
        if (this.metadata) {
            var mllt = this.metadata.MPEGLocationLookupTable;
            if (mllt) {
                var bitstream = new AV.Bitstream(AV.Stream.fromBuffer(mllt.data));
                var refSize = mllt.bitsForBytesDeviation + mllt.bitsForMillisecondsDev;
                var samples = 0;
                var bytes = 0;
            
                while (bitstream.available(refSize)) {
                    this.addSeekPoint(bytes, samples);
                    
                    var bytesDev = bitstream.read(mllt.bitsForBytesDeviation);
                    bitstream.advance(mllt.bitsForMillisecondsDev); // skip millisecond deviation
                    
                    bytes += mllt.bytesBetweenReference + bytesDev;
                    samples += mllt.framesBetweenReference * header.nbsamples() * 32;
                }
                
                this.addSeekPoint(bytes, samples);
            }
            
            if (this.metadata.length) {
                this.emit('duration', parseInt(this.metadata.length, 10));
                return true;
            }
        }

        var offset = stream.offset;
        if (!header || header.layer !== 3)
            return false;

        // Check for Xing/Info tag
        stream.advance(XING_OFFSETS[header.flags & MP3FrameHeader.FLAGS.LSF_EXT ? 1 : 0][header.nchannels() === 1 ? 1 : 0]);
        var tag = stream.readString(4);
        if (tag === 'Xing' || tag === 'Info') {
            var flags = stream.readUInt32();
            if (flags & 1)
                frames = stream.readUInt32();

            if (flags & 2)
                var size = stream.readUInt32();

            if (flags & 4 && frames && size && this.seekPoints.length === 0) {
                for (var i = 0; i < 100; i++) {
                    var b = stream.readUInt8();
                    var pos = b / 256 * size | 0;
                    var time = i / 100 * (frames * header.nbsamples() * 32) | 0;
                    this.addSeekPoint(pos, time);
                }
            }

            if (flags & 8)
                stream.advance(4);

        } else {
            // Check for VBRI tag (always 32 bytes after end of mpegaudio header)
            stream.seek(off + 4 + 32);
            tag = stream.readString(4);
            if (tag == 'VBRI' && stream.readUInt16() === 1) { // Check tag version
                stream.advance(4); // skip delay and quality
                stream.advance(4); // skip size
                frames = stream.readUInt32();

                if (this.seekPoints.length === 0) {
                    var entries = stream.readUInt16();
                    var scale = stream.readUInt16();
                    var bytesPerEntry = stream.readUInt16();
                    var framesPerEntry = stream.readUInt16();
                    var fn = 'readUInt' + (bytesPerEntry * 8);

                    var pos = 0;
                    for (var i = 0; i < entries; i++) {
                        this.addSeekPoint(pos, i * framesPerEntry * header.nbsamples() * 32 | 0);
                        pos += stream[fn]() * scale;
                    }
                }
            }
        }

        if (!frames)
            return false;

        this.emit('duration', (frames * header.nbsamples() * 32) / header.samplerate * 1000 | 0);
        return true;
    };

    this.prototype.readChunk = function() {
        var stream = this.stream;

        if (!this.sentInfo) {
            // read id3 metadata if it exists
            var id3header = MP3Demuxer.getID3v2Header(stream);
            if (id3header && !this.metadata) {
                stream.advance(10);

                if (id3header.major > 2) {
                    var id3 = new ID3v23Stream(id3header, stream);
                } else {
                    var id3 = new ID3v22Stream(id3header, stream);
                }

                this.metadata = id3.read();
                this.emit('metadata', this.metadata);
                stream.seek(10 + id3header.length);
            }

            // read the header of the first audio frame
            var off = stream.offset;
            var s = new MP3Stream(new AV.Bitstream(stream));

            try {
                var header = MP3FrameHeader.decode(s);
                if (!header)
                    return this.emit('error', 'Could not find first frame.');

                this.emit('format', {
                    formatID: 'mp3',
                    sampleRate: header.samplerate,
                    channelsPerFrame: header.nchannels(),
                    bitrate: header.bitrate,
                    floatingPoint: true,
                    layer: header.layer,
                    flags: header.flags
                });

                var sentDuration = this.parseDuration(header, off);
                stream.advance(off - stream.offset);

                // if there were no Xing/VBRI tags, guesstimate the duration based on data size and bitrate
                this.dataSize = 0;
                if (!sentDuration) {
                    this.on('end', function() {
                        this.emit('duration', this.dataSize * 8 / header.bitrate * 1000 | 0);
                    });
                }

                this.sentInfo = true;
            } catch (e) {
                return this.emit('error', e.message);
            }
        }

        while (stream.available(1)) {
            var buffer = stream.readSingleBuffer(stream.remainingBytes());
            this.dataSize += buffer.length;
            this.emit('data', buffer);
        }
    };
});

module.exports = MP3Demuxer;
