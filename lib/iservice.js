/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs  = require('fs');
var Path = require('path');
var Util = require('util');
var Http = require(__dirname + '/http-client.js');

var normalize = function (key) {
  return key.replace(/\/{2,}/g, '/').trim();
};

var iError  = function (code, message) {
  if (!code) {
    return null;
  }

  var error = new Error(message || code);
  error.code = code;
  return error;
};

exports.create = function (options) {

  var _me = {};

  _me.get = function () {
  };

  _me.watch = function () {
  };

  _me.sync  = function () {
  };

  return _me;
};
