/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var config  = require(__dirname + '/../lib/config.js');

var _storer = function (data) {

  var _me   = {};
  _me.get   = function (key, callback) {
    key = key.replace(/\/{2,}/g, '/');
    callback(key.indexOf('error') > -1 ? new Error('TestError') : null, data[key]);
  };

  _me.watch = function (key, timeout, callback) {
    setTimeout(function () {
      callback(Date.now());
    }, timeout || 10);
  };

  _me.sync = function (prefix, callback) {
    callback(prefix.indexOf('error') > -1 ? new Error('SyncError') : null);
  };

  return _me;
};

describe('config interface', function () {

  /* {{{ should_config_get_value_works_fine() */
  it('should_config_get_value_works_fine', function (done) {

    var num = 5;
    var cfg = {
      'timeout' : 10,
    };

    var _me = config.create('/app1/app2/', cfg, _storer({
      '/app1/app2/key1' : 'AbCd1我asd',
        '/app1/app2/key2' : '-123.3123',
        '/app1/app2/key3' : '; this is comment\na = "b"\n[section1]\n\n\n\na = -1231.3  \r\nbb\r\nc="\\\'12"',
        '/app3/app2/key1' : 'abcd',
    }));

    _me.setEventHandle('change', function (rev) {
      should.ok(rev);
      if ((--num) === 0) {
        done();
      }
    });

    _me.get('key1', null, function (error, data) {
      should.ok(!error);
      data.should.eql('AbCd1我asd');
      if ((--num) === 0) {
        done();
      }
    });

    _me.get('key2', 'number', function (error, data) {
      should.ok(!error);
      data.should.eql(-123.3123);
      if ((--num) === 0) {
        done();
      }
    });

    _me.get('key3', 'ini', function (error, data) {
      should.ok(!error);
      JSON.stringify(data).should.eql(JSON.stringify({
        'a' : 'b',
        'section1' : {'a' : -1231.3, 'c' : '\'12'}
      }));
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

  /* {{{ should_config_set_event_handle_works_fine() */
  it('should_config_set_event_handle_works_fine', function (done) {
    var _me = config.create('/error', {'timeout' : 5}, _storer({}));
    _me.setEventHandle('error', function (error) {
      error.toString().should.include('SyncError');
      done();
    });
  });
  /* }}} */

});

