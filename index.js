/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var Emitter = require('events').EventEmitter;
var Util    = require('util');

exports.createClient = function (options) {

  var Client = function () {
    Emitter.call(this);
  };
  Util.inherits(Client, Emitter);

  /**
   * @zookeeper object
   */
  var zk = require(__dirname + '/lib/zookeeper.js').create(options);

  Client.prototype.createConfig = function (prefix) {
    return require(__dirname + '/lib/config.js').create(prefix, zk);
  };

  return new Client();
};

