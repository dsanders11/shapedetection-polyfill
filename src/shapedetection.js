// ShapeDetection polyfill.

export var BarcodeDetector = window.BarcodeDetector;

if (typeof window.BarcodeDetector === 'undefined') {

  // https://wicg.github.io/shape-detection-api/#barcode-detection-api
  BarcodeDetector = class {

    constructor() {
        if (typeof this._barcode_js === 'undefined')
          this._barcode_js = require('../deps/w69b.barcode.min.js');

        this._debug = true;
    }

    /**
     * Implements https://wicg.github.io/shape-detection-api/#dom-barcodedetector-detect
     * @param {ImageBitmapSource} image - Image/Video/Canvas input.
     * @returns {Promise<sequence<DetectedBarcode>>} Fulfilled promise with detected codes.
     */
    detect(image) {
      var that = this;
      var result = [];
      var image = image;
      return new Promise(function (resolve, reject) {
        var decoder = new that._barcode_js.w69b.decoding.Decoder({'worker': false, 'webgl': false});

        decoder.decode(image).then(function(result) {
          var detectedBarcode = new Object;
          detectedBarcode.boundingBox = undefined;
          detectedBarcode.rawValue = result['text'];
          detectedBarcode.cornerPoints = [];

          if (result['patterns']) {
            var points = result['patterns'];
            if (points.length === 4) {
              detectedBarcode.cornerPoints = [
                  { x: points[0].x, y: points[0].y },
                  { x: points[1].x, y: points[1].y },
                  { x: points[2].x, y: points[2].y },
                  { x: points[3].x, y: points[3].y }];
            } else {
              delete detectedBarcode.cornerPoints;
            }
          }

          resolve( [detectedBarcode] );
        }).catch(function(err) {
          console.error('no barcodes detected: ' + err);
          resolve( [] );
        });
      });
    }
  };
}
