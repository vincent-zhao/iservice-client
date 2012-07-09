/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

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
    'cache' : __dirname + '/../run/cache'
  };
  for (var i in options) {
    this.options[i] = options[i];
  }

  this.handle = null;

};

Zookeeper.prototype.get = function (path, callback) {
};

Zookeeper.prototype.watch = function (path, callback) {
};

