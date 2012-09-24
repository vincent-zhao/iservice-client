/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */
"use strict";

var options = {
  host  : '127.0.0.1:2181',
  root  : '/',
  cache : __dirname + '/../run/cache',
  uuid  : process.pid,
  useold : true
};

var storage = null;
var connect = function () {
  if (!storage) {
    storage = require(__dirname + '/lib/iservice.js').create(options);
  }
  return storage;
};

exports.init = function (config) {
  for (var i in config) {
    options[i] = config[i];
  }

  if (options.useold) {
    setTimeout(function(){
      var copy = false;
      try {
        require('fs').statSync(options.cache + '/iservice_cache_' + process.pid);
      } catch(e) {
        copy = true;
      }
      require(__dirname + '/lib/tool.js').dump(options.cache, '/iservice_cache_', copy);
    }, 5000);
  }

  return exports;
};

exports.createConfig = function (prefix, config) {
  return require(__dirname + '/lib/config.js').create(prefix, config, connect());
};

exports.createService = function () {
  return require(__dirname + '/lib/service.js').create(config, connect());
}



