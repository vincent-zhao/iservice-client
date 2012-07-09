/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');

exports.create = function (prefix, store) {

  var _path = function (key) {
    return (prefix + '/' + key).replace(/\/{2,}/g, '/');
  };

  var Config = function () {
    Emitter.call(this);
    /**
      store.watch('/META/config/' + prefix, function (data) {
      this.emit('change', data);
      });
      */
  };
  Util.inherits(Config, Emitter);

  Config.prototype.get = function (key, type, callback) {
    store.get(_path(key), function (error, data) {
      if (error) {
        return callback(error, null);
      }

      switch (type) {
        case 'number':
          data = Number(data);
          break;

        case 'ini':
          // XXX: ini parse
          break;

        default:
          break;
      }
      callback(null, data);
    });
  };

  return new Config();
};

