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

  var _options  = {};
  for (var i in options) {
    _options[i] = options[i];
  }
  _options.root = Tool.clean(_options.root);

  var _http = require(__dirname + '/http-client.js').create({
    'prefix'    : '/api',
    'heartbeat' : 60000,
    'pingurl' : '/status.taobao',
    'timeout' : 2000,      /**<    timeout for http call (ms)  */
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
        encodeURIComponent(Tool.clean(Tool.normalize(_options.root + '/' + key))));
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
  var selfFolder = Tool.normalize(_options.cache + '/iservice_cache_' + process.pid);

  /* {{{ public function get() */
  _me.get = function (key) {
    key = Tool.normalize('/' + key);
    if (_caches[key]) {
      return _caches[key];
    }

    var fna = Tool.normalize(Util.format('%s/%s/%s.zk', selfFolder, _options.root, key));
    try {
      var data = JSON.parse(fs.readFileSync(fna, 'utf-8'));
      _caches[key] = data;
      return data;
    } catch(e) {
      return null;
    }
  };
  /* }}} */

  /*{{{ public function getTree() */
  _me.getTree = function (key) {
    var _self = this;
    var tree = {};

    /*{{{ cover() */
    var cover = function (path) {
      try {
        var absPath = Tool.normalize(Util.format('%s/%s/%s', selfFolder, _options.root, path));
        var file = fs.statSync(absPath);
        if (file.isDirectory()) {
          var list = fs.readdirSync(absPath);
          list.forEach(function (f) {
            cover(Tool.normalize(path + '/' + f));
          });
        } else {
          try {
            fs.statSync(absPath.substr(0, absPath.length - 3));
            return;
          } catch(e) {
            var key = path.substr(0, path.length - 3);
            var data = _self.get(key);
            tree[key] = {
              data : data ? data.data : undefined,
              meta : data ? data.meta : undefined
            }
          }
        }
      } catch(e) {
        return;
      }
    }
    /*}}}*/

    cover(Tool.normalize(key));
    return tree;
  }
  /*}}}*/

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
      var val = _me.get(key);
      var data = val ? val.data : undefined;
      cfg['x-app-uuid'] = WHOAMI.join('-') + '-' + _rand;
      _http.post(url, data || '', function (error, data) {
        if (error) {
          callback(error);
        } else {
          _parseRes(data, callback);
        }
        setTimeout(_checkupdate, tms);
      }, cfg, timeout);
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
              '/%s/%s/%s', selfFolder, _options.root, root)), 2);

        var evt = Events.create(function (error) {
          if (!error) {
            Tool.rmdir(dir);
            fs.renameSync(dir + '_tmp', dir);
            try {
              fs.renameSync(dir + '.zk_tmp', dir + '.zk');
            } catch(e) {}
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
              var relative = idx.substr(Path.normalize('/' + _options.root + '/' + root).length);
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

