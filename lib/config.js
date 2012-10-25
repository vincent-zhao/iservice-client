/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');
var Path    = require('path');
var Tool    = require(__dirname + '/tool.js');

exports.create = function (prefix, conf, store) {

  /**
   * @ XXX: add "/config" in head of prefix
   */
  prefix = ('/config/' + prefix).replace(/\/{2,}/g, '/');

  var options = {
    'timeout'   : 60000,
  };
  for (var i in conf) {
    options[i] = conf[i];
  }

  var Config = function () {
    Emitter.call(this);
    this.on('error', function (error) {
    });
  };
  Util.inherits(Config, Emitter);

  /* {{{ public prototype get() */
  Config.prototype.get = function (key, type) {
    type = type || 'string';
    var path = Path.normalize('/' + key) === '/' ? prefix : Util.format('%s/%s', prefix, key);
    var data = store.get(path);
    if (!data) {
      return null;
    }
    data = data.data;
    switch (type) {
      case 'number':
        data = Number(data);
        break;
      case 'boolean':
        data = data === 'true';
        break;
      case 'object':
        data = JSON.parse(data);
        break;
      case 'ini':
        data = require(__dirname + '/parser/ini.js').parse(data);
        break;

      default:
        break;
    }
    return data;
  };
  /* }}} */

  /* {{{ public prototype setEventHandle() */
  Config.prototype.setEventHandle = function (evt, callback) {
    if ('error' === evt) {
      this.removeAllListeners('error');
    }
    this.on(evt, callback);
  };
  /* }}} */

  var _me   = new Config();

  /*{{{ check */
  var check = function () {
    setTimeout(function () {
      if (store.get(prefix)) {
        _me.emit('ready');
      } else {
        check();
      }
    },1000);
  }
  check();
  /*}}}*/

  /*{{{ sync() */
  var sync = function (rev, callback) {
    store.sync(prefix, function (error) {
      if (error) {
        _me.emit('error', error);
      } else {
        _me.emit('change', rev);
      }
      callback && callback();
    });
  }
  /*}}}*/

  sync("", function () {
    store.watch(prefix, options.timeout, function (error, rev) {
      if (error) {
        return _me.emit('error', error);
      }
      sync(rev);
    });
  });


  return _me;
};

