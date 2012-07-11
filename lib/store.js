/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs  = require('fs');
var Path = require('path');
var Util = require('util');
var Zookeeper = require('zookeeper');

var mkdir = function (path, mode) {
  if (!Path.existsSync(path)) {
    var p = Path.dirname(path);
    if (p && p !== path) {
      mkdir(p);
    }
    fs.mkdirSync(path, mode || 0755);
  }
};

var rmdir = function (path) {
  if (!fs.statSync(path).isDirectory()) {
    return true;
  }

  (function rm(dir) {
    fs.readdirSync(dir).forEach(function (file) {
      var m = dir + '/' + file;
      if (fs.statSync(m).isDirectory()) {
        rm(m) && fs.rmdirSync(m);
      } else {
        fs.unlinkSync(m);
      }
    });
  })(path);
  fs.rmdirSync(path);
};

var normalize = function (key) {
  return key.replace(/\/{2,}/g, '/').trim();
};

var noop = function () {
};

exports.create = function (options) {
  return new Storage(options);
};

var iError  = function (code, message) {
  var error = new Error(message || code);
  error.code = code;
  return error;
};

var Storage = function (options) {

  this.options = {
    'hosts' : 'localhost:2181',
    'root'  : '/',
    'user'  : '',
    'pass'  : '',
    'cache' : __dirname + '/../run/.cache',
    'uuid'  : process.pid
  };
  for (var i in options) {
    this.options[i] = options[i];
  }

  /**
   * @缓存的数据
   */
  this._caches  = {};

  /**
   * @变更回调
   */
  this._watcher = {};

  /**
   * @滞留的请求
   */
  this._queue   = [];

  /**
   * @zookeeper连接句柄
   */
  this._handle  = null;

  var _self = this;

  (new Zookeeper()).connect({
    'connect' : normalize(Util.format('%s/%s', this.options.hosts, this.options.root)),
    'timeout' : 300000,
    'debug_level' : Zookeeper.ZOO_LOG_LEVEL_WARN,
    'host_order_deterministic' : false
  }, function (error, zk) {
    if (error || !zk) {
      error = iError('ConnectError', error);
    } else {
      _self._handle = zk;
      _self._handle.setEncoding('utf-8');
    }

    while (_self._queue.length) {
      (_self._queue.shift())(error);
    }
  });

};

/**
 * Clean data cache in the memory
 *
 * @access public
 * @return void
 */
Storage.prototype.cleanCache = function () {
  this._caches  = {};
};

/**
 * Build local cache path by node path
 *
 * @access private
 * @param {String} key
 * @param {String} uuid
 * @return String
 */
Storage.prototype._localPath = function (key, uuid) {
  return normalize(Util.format(
        '%s/%s/%s.zk', this.options.cache, uuid || this.options.uuid, key));
};

/**
 * Get node value from zookeeper
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
var _ERRORCODEMAP = {
  'ENOENT' : 'NotFound',
};
Storage.prototype.get = function (key, callback) {
  key = normalize(key);
  if (this._caches[key]) {
    return callback(null, this._caches[key]);
  }

  var _self = this;
  fs.readFile(this._localPath(key), 'utf-8', function (error, data) {
    if (!error) {
      _self._caches[key] = data;
    } else {
      error.code = _ERRORCODEMAP[error.code] || error.code || 'Unknown';
    }
    callback(error, data);
  });
};

/**
 * Backup data into local file
 *
 * @access private
 * @param {String} key
 * @param {String} data
 * @return Boolean true or false
 */
Storage.prototype._backup = function (key, data, uuid) {
  key = this._localPath(key, uuid);
  mkdir(Path.dirname(key), 0755);
  return fs.writeFileSync(key, data, 'utf-8');
};

/**
 * Sync node tree into local file from zookeeper
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
Storage.prototype.sync = function (key, callback) {

  var _self = this;
  if (!this._handle) {
    this._queue.push(function (error) {
      if (error) {
        return callback(error);
      }
      _self.sync(key, callback);
    });
    return;
  }

  var _told = false;
  var _fail = function (error) {
    if (true !== _told) {
      callback(error);
    }
    _told = true;
  };

  var _wait = 1;
  var _sync = function (root) {
    _self._handle.a_get_children(root, false, function (code, error, children) {
      if (0 !== code) {
        return _fail(iError('ZookeeperError', error));
      }

      children.forEach(function (sub) {
        _wait++;
        _sync(normalize(root + '/' + sub));
      });

      _self._handle.a_get(root, false, function (code, error, stat, data) {
        if (0 !== code) {
          return _fail(iError('ZookeeperError', error));
        }

        try {
          _self._backup(root, data, _self.options.uuid + '_tmp');
          if (0 === (--_wait)) {
            var _d1 = Path.dirname(_self._localPath('a', _self.options.uuid + '_tmp'));
            var _d2 = Path.dirname(_self._localPath('a'));
            fs.rename(_d1, _d2, function (error) {
              if (error) {
                error = iError('RenameError', error);
              }
              callback(error);
            });
          }
        } catch (e) {
          _fail(iError('BackupError', e));
        }
      });
    });
  };
  _sync(normalize(this.options.root + '/' + key));
};

/**
 * Watch changes of node value
 *
 * @access public
 * @param {String} key
 * @param {Integer} interval (ms)
 * @param {Function} callback
 */
Storage.prototype.watch = function (key, interval, callback) {

  var _self = this;

  if (!this._handle) {
    this._queue.push(function (error) {
      if (error) {
        return callback(error);
      }
      _self.watch(key, interval, callback);
    });
    return;
  }

  var _path = normalize(this.options.root + '/' + key);

  /* {{{ make sure data is changed */
  var check = function (next) {
    _self._handle.a_get(_path, false, function (code, error, stat, data) {
      if (0 !== code) {
        return;
      }
      _self.get(key, function (error, prev) {
        if (data !== prev) {
          callback(data, prev);
        }
        if (next && 'function' === (typeof next)) {
          next();
        }
      });
    });
  };
  /* }}} */

  (function _watch() {
    _self._handle.aw_get(_path, function () {
      _watch();
      check();
    }, noop);
  })();

  (function _loop(time) {
    setTimeout(function () {
      check(function () {
        _loop(interval);
      });
    }, time);
  })(1 + Math.random() * interval);

};

