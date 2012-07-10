/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');

exports.create = function (prefix, store) {

  var Config = function () {
    Emitter.call(this);
  };
  Util.inherits(Config, Emitter);

  /* {{{ public prototype backdoor() */
  Config.prototype.backdoor = function (fname) {
  };
  /* }}} */

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

  var _me   = new Config();

  var onchange = function (old, rev) {
    store.dumpTree(prefix, function (error) {
      if (error) {
        return _me.emit('error', error);
      }

      store.cleanCache();
      _me.emit('change', rev, old);
    });
  };

  var options   = {
    'interval' : 60000,         /**<    变更检查周期    */
  };

  store.watch(Util.format('/%s/META', prefix), options, onchange);

  return _me;
};

