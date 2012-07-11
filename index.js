/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');

exports.createClient = function (options) {

  /**
   * @zookeeper object
   */
  var zk = require(__dirname + '/lib/store.js').create(options);

  var Client = function () {
    Emitter.call(this);
  };
  Util.inherits(Client, Emitter);

  Client.prototype.setEventHandle = function (evt, callback) {
    this.on(evt, callback);
  };

  Client.prototype.createConfig = function (prefix, conf) {
    return require(__dirname + '/lib/config.js').create(prefix, conf, zk);
  };

  var _me = new Client();

  return _me;
};

