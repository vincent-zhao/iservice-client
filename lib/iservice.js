/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs  = require('fs');
var Path = require('path');
var Util = require('util');

var Events = require(__dirname + '/events.js');

/* {{{ private function clean() */
var clean = function (str, mode) {
  var m = str.length;
  var i = 0;
  var j = m - 1;

  mode = mode || 3;
  if (mode & 1) {
    for (i = 0; i < m; i++) {
      var c = str.charCodeAt(i);
      if (c > 32 && c != 47) {
        break;
      }
    }
  }

  if (mode & 2) {
    for (j = m - 1; j > i; j--) {
      var c = str.charCodeAt(j);
      if (c > 32 && c != 47) {
        break;
      }
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

/* {{{ private function rmdir() */
var rmdir = function (path) {
  try {
    if (!fs.statSync(path).isDirectory()) {
      return true;
    }
  } catch (e) {
    return;
  }

  (function rm(dir) {
    fs.readdirSync(dir).forEach(function (file) {
      var m = dir + '/' + file;
      if (fs.statSync(m).isDirectory()) {
        rm(m) && fs.rmdirSync(m);
      }
      fs.unlinkSync(m);
    });
  })(path);

  fs.rmdirSync(path);
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
    'token' : '',
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

  /* {{{ function _buildURL() */
  var _buildURL = function (key, method) {
    return Util.format('/%s/%s', method,
        encodeURIComponent(clean(normalize(_options.root + '/' + key))));
  };
  /* }}} */

  /* {{{ function _parseRes() */
  var _parseRes = function (data, callback) {
    try {
      data = JSON.parse(data.toString());
    } catch (e) {
      return callback('FormatError', iError(e));
    }

    if (!data) {
      return callback('FormatError', 'empty data');
    }

    if (data.error) {
      return callback('RemoteError', data.error);
    }

    callback(null, data.data);
  };
  /* }}} */

  var _me = {};

  /**
   * @ 访问缓存
   */
  var _caches   = {};

  /* {{{ public function get() */
  _me.get = function (key, callback) {
    key = normalize('/' + key);
    if (_caches[key]) {
      return callback(null, _caches[key].data, _caches[key].meta);
    }

    var fna = normalize(Util.format('%s/%s.zk', _options.cache, key));
    fs.readFile(fna, 'utf-8', function (error, data) {
      if (error) {
        callback(iError('NotFound', error));
      }
      try {
        data = JSON.parse(data);
        _caches[key] = data;
      } catch (error) {
        data = {};
      }
      callback(error, data.data, data.meta);
    });
  };
  /* }}} */

  /* {{{ public function watch() */
  _me.watch = function (key, timeout, callback) {
    var cfg = {
      'x-app-tmout' : (timeout || 60000) - 50, 
      'x-app-token' : _options.token,
      'x-app-uuid'  : _options.uuid,
    };

    var tms = Math.min(3000, Math.round(cfg.timeout / 10));
    var _fn = function () {
      _http.get(_buildURL(key, 'watch'), function (error, data) {
        if (error) {
          return callback(error);
        }
        _parseRes(data, function (error, data) {
          callback(error, data);
          setTimeout(_fn, tms);
        });
      }, cfg, timeout || 60000);
    };
    _fn();
  };
  /* }}} */

  /* {{{ public function sync() */
  _me.sync  = function (root, callback) {
    var cfg = {
      'x-app-token' : _options.token,
      'x-app-uuid'  : _options.uuid,
    };
    _http.get(_buildURL(root, 'tree'), function (error, data) {
      if (error) {
        return callback(error);
      }

      _parseRes(data, function (error, data) {
        if (error) {
          return callback(error);
        }

        var dir = clean(normalize(Util.format(
              '/%s/%s/%s', _options.cache, _options.root, root)), 2);

        var evt = Events.create(function (error) {
          if (!error) {
            rmdir(dir);
            fs.renameSync(dir + '_tmp', dir);
            _me.removeAllCache();
          }
          callback(error);
        });

        rmdir(dir + '_tmp');
        data  = data || {};

        for (var key in data) {
          (function () {
            var idx = key;
            evt.wait(idx, function () {
              var _fn = normalize(dir + '_tmp/' + idx + '.zk');
              mkdir(Path.dirname(_fn));
              fs.writeFile(_fn, JSON.stringify(data[idx]), 'utf-8', function (error) {
                evt.emit(idx, error);
              });
            });
          })();
        }
      });
    }, cfg);
  };
  /* }}} */

  /* {{{ public function removeAllCache() */
  _me.removeAllCache = function () {
    _caches = {};
  };
  /* }}} */

  return _me;
};
