/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs  = require('fs');
var Path = require('path');
var Util = require('util');
var Zookeeper = require('zookeeper');

/* {{{ function mkdir() */
var mkdir = function (path, mode) {
  if (!Path.existsSync(path)) {
    var p = Path.dirname(path);
    if (p && p !== path) {
      mkdir(p);
    }
    fs.mkdirSync(path, mode || 0755);
  }
};
/* }}} */

/* {{{ function rmdir() */
var rmdir = function (path) {
  try {
    if (!fs.statSync(path).isDirectory()) {
      return true;
    }
  } catch (e) {
    return 'ENOENT' == e.code ? true : false;
  }

  var clean = function (dir) {
    fs.readdirSync(dir).forEach(function (file) {
      var m = dir + '/' + file;
      if (fs.statSync(m).isDirectory()) {
        clean(m);
      } else {
        fs.unlinkSync(m);
      }
    });
    fs.rmdirSync(dir);
    return true;
  };

  return clean(path);
};
/* }}} */

var normalize = function (key) {
  return key.replace(/\/{2,}/g, '/').trim();
};

var noop = function () {
};

exports.create = function (options) {
  return new Storage(options);
};

var iError  = function (code, message) {
  if (!code) {
    return null;
  }

  var error = new Error(message || code);
  error.code = code;
  return error;
};

/* {{{ Storage constructor() */

var Storage = function (options) {

  this.options = {
    'hosts' : 'localhost:2181',
    'root'  : '/',
    'user'  : '',
    'pass'  : '',
    'cache' : __dirname + '/../run/cache',
    'uuid'  : process.pid,
    'readonly'  : true
  };
  for (var i in options) {
    this.options[i] = options[i];
  }

  /**
   *@本地读取根路径
   */
  this.__lroot  = Util.format('%s/%s', this.options.cache, this.options.uuid);

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
/* }}} */

/* {{{ public prototype cleanCache() */
/**
 * Clean data cache in the memory
 *
 * @access public
 * @return void
 */
Storage.prototype.cleanCache = function () {
  this._caches  = {};
};
/* }}} */

/* {{{ private prototype _writePath() */
/**
 * Build local cache path for write
 *
 * @access private
 * @param {String} key
 * @return {String}
 */
Storage.prototype._writePath = function (key) {
  return normalize(Util.format(
        '%s/%s_tmp/%s.zk', this.options.cache, this.options.uuid, key));
};
/* }}} */

/* {{{ private prototype _listTree() */
/**
 * List all children of a path
 *
 * @access private
 * @param {String} root
 * @param {Function} callback
 */
Storage.prototype._listTree = function (root, callback) {
  var _list = [];
  var _self = this;
  var _tree = function (key, cb) {
    var num = 0;
    _self._handle.a_get_children(key, false, function (code, error, children) {
      if (Zookeeper.ZOK !== code) {
        return cb(iError('ZookeeperError', error));
      }

      if (!children || !children.length) {
        return cb(null);
      }

      num += children.length;
      children.forEach(function (sub) {
        sub = normalize(key + '/' + sub);
        _list.push(sub);
        _tree(sub, function () {
          if ((--num) === 0) {
            cb(null);
          }
        });
      });
    });
  };
  _tree(normalize(_self.options.root + '/' + root), function (error) {
    callback(error, _list.sort(function (a, b) {
      return b.split('/').length - a.split('/').length;
    }));
  });
};
/* }}} */

/* {{{ public prototype get() */
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
  var _file = normalize(Util.format('%s/%s.zk', _self.__lroot, key));
  fs.readFile(_file, 'utf-8', function (error, data) {
    if (!error) {
      if (0 === data.indexOf(' HEAD:')) {
        var pos = data.indexOf('\n\n');
        if (pos > -1) {
          data = data.substring(pos + 2);
        }
      }
      _self._caches[key] = data;
    } else {
      error.code = _ERRORCODEMAP[error.code] || error.code || 'Unknown';
    }
    callback(error, data);
  });
};
/* }}} */

/* {{{ public prototype set() */
/**
 * Set or create a new value in the name of key
 *
 * @access public
 * @param {String} key
 * @param {String} value
 * @param {Function} callback
 */
Storage.prototype.set = function (key, value, callback) {
  var _self = this;
  if (_self.options.readonly) {
    return callback(iError('ReadOnly', 'system readonly'));
  }

  if (!_self._handle) {
    return _self._queue.push(function (error) {
      if (error) {
        callback(error);
      } else {
        _self.set(key, value, callback);
      }
    });
  }

  key = normalize(_self.options.root + '/' + key);
  _self._handle.a_set(key, value, -1, function (rt, error) {
    if (Zookeeper.ZNONODE === rt) {
      return _self._handle.a_create(key, value, 0, function (rt, error) {
        if (Zookeeper.ZNONODE === rt) {
          _self._handle.mkdirp(key, function (error) {
            if (error) {
              return callback(iError('CreateError', error));
            }
            _self.set(key, value, callback);
          });
        } else {
          callback(iError(Zookeeper.ZOK !== rt ? 'CreateError' : '', error));
        }
      });
    }

    callback(iError(Zookeeper.ZOK !== rt ? 'UpdateError' : '', error));
  });
};
/* }}} */

/* {{{ public prototype rm() */
Storage.prototype.rm = function (key, callback) {
  var _self = this;
  if (_self.options.readonly) {
    return callback(iError('ReadOnly', 'system readonly'));
  }

  if (!_self._handle) {
    return _self._queue.push(function (error) {
      if (error) {
        callback(error);
      } else {
        _self.rm(key, callback);
      }
    });
  }

  key = normalize(_self.options.root + '/' + key);
  _self._handle.a_delete_(key, -1, function (rt, error) {
    callback((rt === Zookeeper.ZNONODE || rt === Zookeeper.ZOK) ? null : iError('DeleteError', error));
  });
};
/* }}} */

/* {{{ public prototype watch() */
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
  if (!_self._handle) {
    return _self._queue.push(function () {
      _self.watch(key, interval, callback);
    });
  }

  var _path = normalize(_self.options.root + '/' + key);

  /* {{{ make sure data is changed */
  var check = function (next) {
    _self._handle.a_get(_path, false, function (code, error, stat, data) {
      if (Zookeeper.ZOK !== code && Zookeeper.ZNONODE !== code) {
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
    _self._handle.aw_get(_path, function (type, stat, path) {
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
/* }}} */

/* {{{ public prototype sync() */
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
    return this._queue.push(function (error) {
      if (error) {
        callback(error);
      } else {
        _self.sync(key, callback);
      }
    });
  }

  var _dump = function (root, cb) {
    _self._handle.a_get(root, false, function (code, error, stat, data) {
      if (Zookeeper.ZOK !== code) {
        return cb(iError('ZookeeperError', error));
      }

      var fname = _self._writePath(root);
      mkdir(Path.dirname(fname), 0755);

      var fhead = [stat.version, Math.max(stat.ctime.getTime(), stat.mtime.getTime())].join(',');
      fs.writeFile(fname, Util.format(' HEAD:%s\n\n%s', fhead, data), 'utf-8', function (error) {
        cb(error ? iError('BackupError', error.stack) : null);
      });
    });
  };

  return _self._listTree(key, function (error, list) {
    if (error) {
      return callback(error);
    }

    if (!list || !list.length) {
      return callback(null);
    }

    error   = null;

    var dir = Path.dirname(_self._writePath(''));
    var num = list.length;
    rmdir(dir);

    list.forEach(function (root) {
      _dump(root, function (err) {
        error = error || err;
        if ((--num) === 0) {
          var p = normalize(_self.options.cache + '/' + _self.options.uuid);
          rmdir(p) && fs.renameSync(dir, p);
          _self.__lroot = p;
          _self.cleanCache();
          callback(error);
        }
      });
    });
  });
};
/* }}} */

