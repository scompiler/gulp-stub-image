const jimp = require('jimp');
const File = require('vinyl');
const PluginError = require('plugin-error');
const path = require('path');
const Transform = require('stream').Transform;
const PLUGIN_NAME = 'StubImage';
const loadFont = jimp.loadFont(jimp.FONT_SANS_128_BLACK);


function getMimeType(extension) {
    extension = extension.substr(1).toLowerCase();

    switch (extension) {
        case 'jpeg':
        case 'jpg':
            return jimp.MIME_JPEG;
        case 'png':
            return jimp.MIME_PNG;
    }

    return null;
}


function fillImage(image, color) {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, offset) {
        this.bitmap.data.writeUInt32BE(color, offset);
    });
}


/**
 * @param font
 * @param {string} text
 */
function measureText(font, text) {
    const w = jimp.measureText(font, text);
    const h = jimp.measureTextHeight(font, text, w + 10);

    return [w, h];
}


class StubImageTransform extends Transform {
    /**
     * @param {File} file
     * @param {string=} encoding
     * @param {function(Error, object)} callback
     * @private
     */
    _transform(file, encoding, callback) {
        if (file.isNull()) {
            callback(null, file);
        } else if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
        } else if (file.isBuffer()) {
            const extension = path.extname(path.basename(file.path));
            const mimeType = getMimeType(extension);

            if (!mimeType) {
                this.emit('error', new PluginError(PLUGIN_NAME, 'File type not supported'));
                return;
            }

            jimp.read(file.contents).then(async image => {
                const w = image.bitmap.width;
                const h = image.bitmap.height;

                fillImage(image, 0xE5E5E5FF);

                if (w >= 32 && h >= 16) {
                    const text = `${w}x${h}`;
                    const font = await loadFont;
                    const [textW, textH] = measureText(font, text);

                    const textImage = new jimp(textW, textH);

                    textImage.print(font, 0, 0, text);
                    textImage.color([
                        {apply: 'red', params: [128]},
                        {apply: 'green', params: [128]},
                        {apply: 'blue', params: [128]}
                    ]);

                    const scaleFactor = Math.min(1, (w * .8) / textW, (h * .8) / textH);
                    const textNewW = Math.round(textW * scaleFactor);
                    const textNewH = Math.round(textH * scaleFactor);

                    textImage.resize(textNewW, textNewH);

                    image.composite(
                        textImage,
                        Math.round(w / 2 - textNewW / 2),
                        Math.round(h / 2 - textNewH / 2)
                    );
                }

                image.getBuffer(mimeType, (error, buffer) => {
                    file.contents = buffer;

                    callback(error, file);
                });
            }).catch(error => {
                callback(error, file);
            });
        }
    }
}


module.exports = function() {
    return new StubImageTransform({objectMode: true});
};
