/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

exports.create = function (callback) {

  /**
   * @ 等待的事件列表
   */
  var waits = {};

  /**
   * @ 最先返回的错误
   */
  var error = null;

  var _me   = {};

  _me.wait  = function (evt, cb) {
    waits[evt] = true;
    cb && cb();
  };

  _me.emit  = function (evt, e) {
    if (!waits[evt]) {
      return;
    }

    if (e && !error) {
      error = e;
    }
    process.nextTick(function () {
      delete waits[evt];
      for (var key in waits) {
        return;
      }

      callback(error);
    });
  };

  return _me;
};

