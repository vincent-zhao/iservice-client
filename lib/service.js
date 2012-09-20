var Subscribe = require(__dirname + '/subscribe.js');

exports.create = function (options) {

  var _me = {
    
    register : function () {
    
    },

    subscribe : function (name, filter, config) {
      return new Subscribe(name, filter, options, config);
    },

  }

  return _me;

}
