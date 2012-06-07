MP3.js - an MP3 decoder in JavaScript based on JSMad and libmad
===============================================================

MP3.js is a refactored version of [JSMad](https://github.com/ofmlabs/jsmad) designed to run in ofmlabs 
[Aurora audio framework](https://github.com/ofmlabs/alac.js/tree/master/Aurora).  It supports all of the
features of JSMad and is released under the same GPLv2 license.  The code was reorganized a bit, and now
uses all typed arrays for decoding at better performance.

## Authors

MP3.js was originally written by [@nddrylliog](https://twitter.com/nddrylliog), 
[@jensnockert](https://twitter.com/jensnockert), and [@mgeorgi](https://twitter.com/mgeorgi) during a Music Hack Day.  
The refactor for MP3.js was performed by [@devongovett](https://twitter.com/devongovett).

## License

MP3.js follows the same jsmad license. MP3.js is available under the terms of the GNU General Public License, 
Version 2. Please note that under the GPL, there is absolutely no warranty of any kind, to the extent permitted by the law.

## Future

- MPEG Layer I and II are not supported, only Layer III is - it should be pretty trivial but we had no interest for it in 
  the first place.
- MPEG 2.5 is not supported.
- Free bitrate streams are not supported (this is different from VBR - VBR is supported)
- Most of ID3v2.2 and ID3v2.3 are implemented, but some tags are mising.