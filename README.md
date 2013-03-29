MP3.js - a JavaScript MP3 decoder based on JSMad
================================================

MP3.js is a refactored version of [JSMad](https://github.com/ofmlabs/jsmad) designed to run in the 
[Aurora.js](https://github.com/audiocogs/aurora.js) audio framework.  It supports all of the
features of JSMad and is released under the same GPLv2 license.  The code was reorganized a bit, and now
uses all typed arrays for decoding at better performance.

## Demo

You can check out a [demo](http://audiocogs.org/codecs/mp3/) alongside our other decoders 
[alac.js](http://github.com/audiocogs/alac.js), [flac.js](http://github.com/devongovett/flac.js), and [AAC.js](http://github.com/audiocogs/aac.js).  Currently MP3.js
works properly in the latest versions of Firefox, Chrome, and Safari.

## Authors

JSMad was originally written by [@nddrylliog](https://twitter.com/nddrylliog), 
[@jensnockert](https://twitter.com/jensnockert), and [@mgeorgi](https://twitter.com/mgeorgi) during a Music Hack Day. The 
refactor for MP3.js was performed by [@devongovett](https://twitter.com/devongovett).

## Building
    
Currently, the [importer](https://github.com/devongovett/importer) module is used to build MP3.js.  You can run
the development server on port `3030` by first installing `importer` with npm, and then running it like this:

    npm install importer -g
    importer mp3.js -p 3030
    
You can also build a static version like this:

    importer mp3.js build.js

mp3.js depends on [Aurora.js](https://github.com/audiocogs/aurora.js), our audio codec framework.  You will need
to include either a prebuilt version of Aurora.js, or start another `importer` development server for Aurora before
mp3.js will work.  You can use the [test.html](https://github.com/audiocogs/aurora.js/blob/master/src/test.html) file
in the Aurora.js repo as an example of how to use the APIs to play back audio files.  Just include mp3.js on that 
page as well in order to add support for FLAC files.

## License

MP3.js follows the same jsmad license. MP3.js is available under the terms of the GNU General Public License, 
Version 2. Please note that under the GPL, there is absolutely no warranty of any kind, to the extent permitted by the law.

## Future

- MPEG 2.5 is not supported.
- Most of ID3v2.2 and ID3v2.3 are implemented, but some tags are missing.