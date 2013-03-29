MP3.js - a JavaScript MP3 decoder based on JSMad
================================================

MP3.js is a refactored version of [JSMad](https://github.com/ofmlabs/jsmad) designed to run in ofmlabs 
[Aurora audio framework](https://github.com/ofmlabs/alac.js/tree/master/Aurora).  It supports all of the
features of JSMad and is released under the same GPLv2 license.  The code was reorganized a bit, and now
uses all typed arrays for decoding at better performance.

## Authors

JSMad was originally written by [@nddrylliog](https://twitter.com/nddrylliog), 
[@jensnockert](https://twitter.com/jensnockert), and [@mgeorgi](https://twitter.com/mgeorgi) during a Music Hack Day. The 
refactor for MP3.js was performed by [@devongovett](https://twitter.com/devongovett).

## License

MP3.js follows the same jsmad license. MP3.js is available under the terms of the GNU General Public License, 
Version 2. Please note that under the GPL, there is absolutely no warranty of any kind, to the extent permitted by the law.

## Future

- MPEG 2.5 is not supported.
- Most of ID3v2.2 and ID3v2.3 are implemented, but some tags are missing.