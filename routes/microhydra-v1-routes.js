/**
 * @name microhydra-v1-api
 * @description This module packages the Microhydra API.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const sharp = require("sharp");
const bodyParser = require("body-parser");
const hydraExpress = require('hydra-express');
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require('fwsp-server-response');

let serverResponse = new ServerResponse();
express.response.sendError = function(err) {
  serverResponse.sendServerError(this, {result: {error: err}});
};
express.response.sendOk = function(result) {
  serverResponse.sendOk(this, {result});
};

let api = express.Router();

api.get('/',
(req, res) => {
  res.sendOk({greeting: 'Welcome to Hydra Express!'});
});

api.param('image', (req, res, next, image) => {
  if (!image.match(/\.(png|jpg)$/i)) {
    return res.sendError('Invalid image type/extension');
  }

  req.image = image;
  req.localpath = path.join(process.cwd(), "uploads", req.image);

  return next();
});

api.post('/uploads/:image', bodyParser.raw({
  limit: '10mb',
  type: 'image/*'
}), (req, res) => {
  let fd = fs.createWriteStream(req.localpath, {
    flags: 'w+',
    encoding: 'binary'
  });

  fd.end(req.body);

  fd.on('close', () => {
    res.sendOk({ size: req.body.length });
  });
});

api.head('/uploads/:image', (req, res) => {
  fs.access(req.localpath.fs.constants.R_OK, (err) => {
    if (err) {
      return res.sendError('Image no found');
    }

    return res.sendOk();
  });

});

api.get('/uploads/:image', download_image);

function download_image(req, res) {
  fs.access(req.localpath, fs.constants.R_OK, (err) => {
    if (err) return res.sendError('image no found');

    let image = sharp(req.localpath);
    let width = +req.query.width;
    let height = +req.query.height;
    let blur = +req.query.blur;
    let sharpen = +req.query.sharpen;
    let greyscale = ['y', 'yes', '1', 'on'].includes(req.query.greyscale);
    let flip = ['y', 'yes', '1', 'on'].includes(req.query.flip);
    let flop = ['y', 'yes', '1', 'on'].includes(req.query.flop);

    if (width > 0 && height > 0) {
      image.ignoreAspectRatio();
    }

    if (width > 0 || height > 0) {
      image.resize(width || null, height || null);
    }

    if (flip) image.flip();
    if (flop) image.flop();
    if (blur > 0) image.blur(blur);
    if (sharpen > 0) image.sharpen(sharpen);
    if (greyscale) image.greyscale();

    res.setHeader('Content-Type', `image/${path.extname(req.image).substr(1)}`);

    image.pipe(res);
  });
}

module.exports = api;
