// ShapeDetection polyfill.
// Uses zxing for barcode detection fallback. This supports only QR codes.

export var BarcodeDetector = window.BarcodeDetector;

if (typeof window.BarcodeDetector === 'undefined') {

  // https://wicg.github.io/shape-detection-api/#barcode-detection-api
  BarcodeDetector = class {

    constructor() {
        // |qrcode| should be defined by `qrcode = require('zxing');`
        // TODO(mcasas): I'm not sure if this won't load zxing every time.
        if (typeof this._qrcode === 'undefined')
          this._qrcode = require('zxing');

        if (typeof this._quagga === 'undefined')
          this._quagga = require('quagga');

        this._debug = true;
    }

    detect(image) {
      var that = this;
      return Promise.all([that.detectQRCodes(image), that.detectBarcodes(image)]
          .map(p => p.catch(e => e)));
    }

    /**
     * Implements https://wicg.github.io/shape-detection-api/#dom-barcodedetector-detect
     * @param {ImageBitmapSource} image - Image/Video/Canvas input.
     * @returns {Promise<sequence<DetectedBarcode>>} Fulfilled promise with detected codes.
     */
    detectQRCodes(image) {
      var that = this;
      return new Promise(function executorBCD(resolve, reject) {

        var canv = document.createElement("canvas");
        canv.setAttribute("id", "qr-canvas");
        canv.style.visibility = "hidden";
        document.body.appendChild(canv);

        // ZXing likes to get the data from a canvas element called "qr-canvas".
        // Dump |image| there and then just call qrcode.decode().
        var ctx = canv.getContext('2d');
        canv.width = image.width;
        canv.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);

        that._qrcode.debug = false;
        that._qrcode.decode(function(err, result) {
          if (err != null) {
            console.error(err);
            reject(new DOMException('OperationError', err));
          } else {
            console.log("detected: ", result);
            // Replicate sequence<DetectedBarcode> response; ZXing library only
            // provides a single detected |rawValue| barcode (no position).
            var detectedBarcode = new Object;
            detectedBarcode.rawValue = result;
            detectedBarcode.boundingBox = undefined;
            detectedBarcode.cornerPoints = [];
            resolve( [detectedBarcode] );
          }

        // Remove the "qr-canvas" element from the document.
        canv.parentNode.removeChild(canv);
        });
      });
    };

    detectBarcodes(image) {
      var that = this;
      return new Promise(function executorBCD(resolve, reject) {

        var canv = document.createElement("canvas");
        canv.setAttribute("id", "temp-canvas");
        if (!that._debug)
          canv.style.visibility = "hidden";
        document.body.appendChild(canv);
        var ctx = canv.getContext('2d');
        canv.width = image.width;
        canv.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);

        const what = canv.toDataURL();
        that._quagga.decodeSingle({
          src: what,
          numOfWorkers: 0,  // Needs to be 0 when used within node
          locate: true,
          inputStream: { size: canv.width > canv.height ? canv.width : canv.height },
          decoder: {
            readers : [
              "upc_reader", "code_128_reader", "code_39_reader",
              "code_39_vin_reader", "ean_8_reader", "ean_reader", "upc_e_reader",
              "codabar_reader"
            ]
          },
          multiple: true,
        }, function(result) {
          var detectedBarcode = new Object;
          detectedBarcode.boundingBox = undefined;
          detectedBarcode.cornerPoints = [];
          if(result) {
            if (result.codeResult) {
              console.log("detected: ", result.codeResult.code);
              detectedBarcode.rawValue = result.codeResult.code;
            }
            resolve( [detectedBarcode] );

            if (that._debug) {
              var ctx = document.getElementById('temp-canvas').getContext("2d");
              ctx.beginPath();
              ctx.lineWidth = 2;
              ctx.strokeStyle = "yellow";
              for(var i = 0; i < result.boxes.length; i++) {
                ctx.moveTo(Math.floor(result.boxes[i][0][0]),
                           Math.floor(result.boxes[i][0][1]));
                ctx.lineTo(Math.floor(result.boxes[i][1][0]),
                           Math.floor(result.boxes[i][1][1]));
                ctx.lineTo(Math.floor(result.boxes[i][2][0]),
                           Math.floor(result.boxes[i][2][1]));
                ctx.lineTo(Math.floor(result.boxes[i][3][0]),
                           Math.floor(result.boxes[i][3][1]));
                ctx.lineTo(Math.floor(result.boxes[i][0][0]),
                           Math.floor(result.boxes[i][0][1]));
                ctx.stroke();
              }
              ctx.closePath();
            }

          } else {
            console.error("not detected");
            reject(new DOMException('OperationError', "nothing found"));
          }
        });

        if (!that._debug) {
          // Remove the "temp-canvas" element from the document.
          canv.parentNode.removeChild(canv);
        }

      });
    };
  };
}
