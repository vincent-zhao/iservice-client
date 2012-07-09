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

  Client.prototype.createConfig = function (prefix) {
    return require(__dirname + '/lib/config.js').create(prefix, zk);
  };

  return new Client();
};

