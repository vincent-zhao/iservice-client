/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs  = require('fs');
var Path = require('path');
var Util = require('util');

/* {{{ private function clean() */
var clean = function (str) {
  var m = str.length;
  for (var i = 0; i < m; i++) {
    var c = str.charCodeAt(i);
    if (c > 32 && c != 47) {
      break;
    }
  }

  for (var j = m - 1; j > i; j--) {
    var c = str.charCodeAt(j);
    if (c > 32 && c != 47) {
      break;
    }
  }

  return str.slice(i, j + 1);
};
/* }}} */

/* {{{ private function mkdir() */

var mkdir = function (path, mode) {
  if (!Path.existsSync(path)) {
    var p = Path.dirname(path);
    if (p && p !== path) {
      mkdir(p);
    }
    fs.mkdirSync(path, mode || 493/**<  0755    */);
  }
};
/* }}} */

/* {{{ private function normalize() */
var normalize = function (key) {
  return key.replace(/\/{2,}/g, '/');
};
/* }}} */

/* {{{ private function iError() */
var iError = function (name, error) {
  if (!(error instanceof Error)) {
    error = new Error(error);
  }
  error.name = name || 'Unknown';
  return error;
};
/* }}} */

exports.create = function (options) {

  /* {{{ config and init */

  var _options  = {
    'hosts' : '127.0.0.1',
    'root'  : '/',
    'user'  : '',
    'pass'  : '',
    'cache' : __dirname + '/../run/cache',
    'uuid'  : process.pid,
  };
  for (var i in options) {
    _options[i] = options[i];
  }
  _options.root = clean(_options.root);

  var _http = require(__dirname + '/http-client.js').create({
    'prefix'    : '/api',
      'heartbeat' : 60000,
      'pingurl' : '/ping',
      'timeout' : 100,      /**<    timeout for http call (ms)  */
  });
  _options.hosts.split(',').forEach(function (item) {
    item = item.split(':');
    _http.bind(item[0], item[1] || 80);
  });
  /* }}} */

  var _buildURL = function (key, method) {
    return Util.format('/%s/%s', method,
        encodeURIComponent(clean(normalize(_options.root + '/' + key))));
  };

  var _me = {};

  _me.get = function (key, callback) {
    _http.get(_buildURL(key, 'get'), function (error, data) {
      callback(error, data);
    });
  };

  _me.watch = function (key, callback) {
  };

  _me.sync  = function (root, callback) {
    _http.get(_buildURL(root, 'tree'), function (error, data) {
      if (error) {
        return callback(error);
      }

      var fname = normalize(Util.format(
          '%s/%s/%s/%s', _options.cache, _options.uuid, _options.root, root)).trim();

      mkdir(Path.dirname(fname));
      fs.writeFile(fname, data, 'utf-8', function (error) {
        callback(error);
      });
    });
  };

  return _me;
};
