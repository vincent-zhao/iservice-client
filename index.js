/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var options = null;
var storage = null;
var connect = function () {
  if (!storage) {
    storage = require(__dirname + '/lib/iservice.js').create(options);
  }
  return storage;
};

exports.init = function (config) {
  options = config;
  return exports;
};

exports.createConfig = function (prefix, config) {
  return require(__dirname + '/lib/config.js').create(prefix, config, connect());
};

exports.createService = function () {
  return require(__dirname + '/lib/service.js').create(options);
}

