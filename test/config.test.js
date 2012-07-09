/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var config  = require(__dirname + '/../lib/config.js');

var _storer = function (data) {

  var _me   = {};
  _me.get   = function (key, callback) {
    callback(key.indexOf('error') > -1 ? new Error('TestError') : null, data[key]);
  };

  _me.watch = function (key, callback) {
    callback((new Date()).getTime());
  };

  return _me;
};

describe('configer interface test', function () {

  /* {{{ should_configer_get_value_works_fine() */
  it('should_configer_get_value_works_fine', function (done) {

    var num = 2;
    var _me = config.create('///app1/app2/', _storer({
    '/app1/app2/key1' : 'AbCd1我asd'
  }));

    _me.get('key1', null, function (error, data) {
      should.ok(!error);
      data.should.eql('AbCd1我asd');
      if ((--num) === 0) {
        done();
      }
    });

    _me.get('error', null, function (error, data) {
      error.toString().should.eql('Error: TestError');
      if ((--num) === 0) {
        done();
      }
    });
  });
  /* }}} */

});

