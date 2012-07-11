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
};

var normalize = function (key) {
  return key.replace(/\/{2,}/g, '/').trim();
};

exports.create = function (options) {
  return new Storage(options);
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
   * @zookeeper连接句柄
   */
  var _afterConnected = function (error, zk) {
    zk.setEncoding('utf-8');
  };

  this._handle  = new Zookeeper();
  this._handle.connect({
    'connect' : normalize(Util.format('%s/%s', this.options.hosts, this.options.root)),
    'timeout' : 20000,
    'debug_level' : Zookeeper.ZOO_LOG_LEVEL_WARN,
    'host_order_deterministic' : false
  }, _afterConnected);

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
 * Backup data into local file
 *
 * @access private
 * @param {String} key
 * @param {String} data
 * @return Boolean true or false
 */
Storage.prototype._backup = function (key, data) {
  key = this._localPath(key);
  mkdir(Path.dirname(key), 0755);
  return fs.writeFileSync(key, data, 'utf-8');
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
 * Dump node tree into local file from zookeeper
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
Storage.prototype.dumpTree = function (key, callback) {
  // write to a temp path and rename ...
  callback(null);
};

/**
 * Watch changes of node value
 *
 * @access public
 * @param {String} key
 * @param {Object} options
 * @param {Function} callback
 */
Storage.prototype.watch = function (key, options, callback) {
  key = normalize(key);
  if (!this._watcher[key]) {
    this._watcher[key] = Watcher(
        normalize(this.options.root + '/' + key), options, this._handle);
  }
  this._watcher[key].push(callback);
};

var Watcher = function (path, options, zk) {

  var _current = null;      /**<    current value */
  var callback = [];        /**<    callbacks when change   */

  var _me = {};
  _me.push  = function (cb) {
    ('function' === (typeof cb)) && callback.push(cb);
  };

  return _me;
};

