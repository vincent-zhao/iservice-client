/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');

exports.create = function (prefix, conf, store) {

  var options  = {
    'watch_interval' : 300000,       /**<    变更检查周期    */
  };
  for (var i in conf) {
    options[i] = conf[i];
  }

  var Config = function () {
    Emitter.call(this);
  };
  Util.inherits(Config, Emitter);

  /* {{{ public prototype get() */
  Config.prototype.get = function (key, type, callback) {
    store.get(Util.format('%s/%s', prefix, key), function (error, data) {
      if (error) {
        return callback(error, null);
      }

      switch (type) {
        case 'number':
          data = Number(data);
          break;

        case 'ini':
          data = require(__dirname + '/parser/ini.js').parse(data);
          break;

        default:
          break;
      }
      callback(null, data);
    });
  };
  /* }}} */

  /* {{{ public prototype feedback() */
  Config.prototype.feedback = function (rev) {
    // TODO: to tell service center
  };
  /* }}} */

  /* {{{ public prototype setEventHandle() */
  Config.prototype.setEventHandle = function (evt, callback) {
    this.on(evt, callback);
  };
  /* }}} */

  var _me   = new Config();

  var onchange = function (rev, old) {
    store.sync(prefix, function (error) {
      if (error) {
        return _me.emit('error', error);
      }

      _me.emit('change', rev, old);
    });
  };

  store.watch(prefix, onchange);

  return _me;
};

