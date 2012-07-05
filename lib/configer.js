/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

exports.create = function (prefix, store) {

  var _path = function (key) {
    return (prefix + '/' + key).replace(/\/{2,}/g, '/');
  };

  var _me = {};

  _me.get = function (key, type, callback) {
    store.get(_path(key), function (error, data) {
      if (error) {
        return callback(error, null);
      }

      callback(null, data);
    });
  };

  return _me;
};

