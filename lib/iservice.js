/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs  = require('fs');
var Path = require('path');
var Util = require('util');
var Tool = require(__dirname + '/tool.js');

var Events  = require(__dirname + '/events.js');

var WHOAMI  = [require('os').hostname(), process.pid, ];
setInterval(function () {
  WHOAMI[0] = require('os').hostname();
}, 60000);

try {
  exports.version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf-8').trim()).version;
} catch (e) {
  exports.version = 'unknown';
}

exports.create = function (options) {

  /* {{{ config and init */

  var _options  = {
    'host'  : '127.0.0.1',
    'token' : '',
    'cache' : __dirname + '/../run/cache',
    'uuid'  : process.pid,
  };
  for (var i in options) {
    _options[i] = options[i];
  }

  var _http = require(__dirname + '/http-client.js').create({
    'prefix'    : '/api',
      'heartbeat' : 60000,
      'pingurl' : '/ping',
      'timeout' : 100,      /**<    timeout for http call (ms)  */
  });
  _options.host.split(',').forEach(function (item) {
    item = item.split(':');
    _http.bind(item[0], item[1] || 80);
  });
  /* }}} */

  var _rand = parseInt(100000 * Math.random(), 10);

  /* {{{ function _buildURL() */
  var _buildURL = function (key, method) {
    return Util.format('/%s/%s', method,
        encodeURIComponent(Tool.clean(Tool.normalize('/' + key))));
  };
  /* }}} */

  /* {{{ function _parseRes() */
  var _parseRes = function (data, callback) {
    try {
      data = JSON.parse(data.toString());
    } catch (e) {
      return callback('FormatError', Tool.iError(e));
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
    key = Tool.normalize('/' + key);
    if (_caches[key]) {
      return callback(null, _caches[key].data, _caches[key].meta);
    }

    var fna = Tool.normalize(Util.format('%s/%s.zk', _options.cache, key));
    fs.readFile(fna, 'utf-8', function (error, data) {
      if (error) {
        return callback(Tool.iError('NotFound', error));
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

    timeout = timeout || 60000;
    var cfg = {
      'User-Agent'  : 'iservice-client@' + exports.version,
      'x-app-tmout' : timeout - 30, 
      'x-app-token' : _options.token,
    };

    var url = _buildURL(key, 'watch');
    var tms = Math.max(10, Math.min(3000, Math.ceil(timeout / 10)));

    (function _checkupdate() {
      _me.get(key, function (error, data, meta) {
        cfg['x-app-uuid'] = WHOAMI.join('-') + '-' + _rand;
        _http.post(url, data || '', function (error, data) {
          if (error) {
            callback(error);
          } else {
            _parseRes(data, callback);
          }
          setTimeout(_checkupdate, tms);
        }, cfg, timeout);
      });
    })();
  };
  /* }}} */

  /* {{{ public function sync() */
  _me.sync  = function (root, callback) {
    var cfg = {
      'User-Agent'  : 'iservice-client@' + exports.version,
      'x-app-token' : _options.token,
      'x-app-uuid'  : WHOAMI.join('-') + '-' + _rand,
    };
    _http.get(_buildURL(root, 'tree'), function (error, data) {
      if (error) {
        return callback(error);
      }

      _parseRes(data, function (error, data) {
        if (error) {
          return callback(error);
        }

        var dir = Tool.clean(Tool.normalize(Util.format(
              '/%s/%s', _options.cache, root)), 2);

        var evt = Events.create(function (error) {
          if (!error) {
            Tool.rmdir(dir);
            fs.renameSync(dir + '_tmp', dir);
            fs.renameSync(dir + '.zk_tmp', dir + '.zk');
            _me.removeAllCache();
          }
          callback(error);
        });

        Tool.rmdir(dir + '_tmp');
        data  = data || {};

        if (Object.keys(data).length === 0) {
          evt.wait('empty', function(){
            evt.emit('empty', Tool.iError('NoConfig', 'no config'));
          });
        }

        for (var key in data) {
          (function () {
            var idx = key;
            evt.wait(idx, function () {
              var relative = idx.substr(Path.normalize('/' + root).length);
              var _fn = '';
              if (Tool.normalize('/' + relative) !== '/') {
                _fn = Tool.normalize(dir + '_tmp/' + relative + '.zk');
              } else {
                _fn = Tool.normalize(dir + '.zk_tmp');
              }
              Tool.mkdir(Path.dirname(_fn));
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

