/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs = require('fs');
var Path = require('path');
var Util = require('util');

var mkdir = function (path, mode) {
  return true;
};

exports.create = function (options) {
  return new Zookeeper(options);
};

var Zookeeper = function (options) {

  if (!(this instanceof Zookeeper)) {
    return new Zookeeper(options);
  }

  this.options = {
    'hosts' : '',           /**<    zookeeper机器列表   */
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
   * @zookeeper连接句柄
   */
  this._handle  = null;
  if (!this._handle) {
    // XXX: readLocal
  }

  /**
   * @拉取定时器
   */
  this._timer   = null;

  /**
   * @变更回调
   */
  this._watcher = {};

};

/**
 * Build node path in zookeeper
 *
 * @access private
 * @param {String} key
 * @return String
 */
Zookeeper.prototype._path = function (key) {
  return (this.options.root + '/' + key).replace(/\/{2,}/g, '/');
};

/**
 * Backup data into local file
 *
 * @access private
 * @param {String} key
 * @param {String} data
 * @return Boolean true or false
 */
Zookeeper.prototype._backup = function (key, data) {
  key = Util.format(
      '%s/%s/%s.zk', this.options.cache, this.options.uuid, key
      ).replace(/\/{2,}/g, '/');

  mkdir(key, 0755);
  return fs.writeFileSync(key, data, 'utf-8');
};

/**
 * Dump node tree into local file from zookeeper
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
Zookeeper.prototype.dump = function (key, callback) {
};

/**
 * Get node value from zookeeper
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
Zookeeper.prototype.get = function (key, callback) {
};

/**
 * Watch changes of node value
 *
 * @access public
 * @param {String} key
 * @param {Function} callback
 */
Zookeeper.prototype.watch = function (key, callback) {
  key = this._path(key);
  if (!this._watcher[key]) {
    this._watcher[key] = [];
  }
  this._watcher[key].push(callback);
  if (!this._timer) {

  }
};

