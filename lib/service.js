var Subscribe = require(__dirname + '/subscribe.js');

exports.create = function (options) {

  var _options = {
    'host' : '127.0.0.1:2181',
    'root' : '/',
    'cache' : __dirname + '/../run/cache',

  }

  for (var i in options) {
    _options[i] = options[i];
  }

  var _me = {
    
    register : function () {
    
    },

    subscribe : function (name, filter, config) {
      return new Subscribe(name, filter, _options, config);
    },

  }

  return _me;

}
