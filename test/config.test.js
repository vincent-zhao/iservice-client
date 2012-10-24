/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var config  = require(__dirname + '/../lib/config.js');

var _storer = function (data) {

  var _me   = {};
  _me.get   = function (key, callback) {
    key = key.replace(/\/{2,}/g, '/');
    if (key.indexOf('error') > -1) {
      return null;
    } else {
      return {
        data : data[key],
        meta : 'fake meta'
      };
    }
  };

  _me.watch = function (key, timeout, callback) {
    setTimeout(function () {
      callback(key.indexOf('watcherror') > -1 ? new Error('WatchError') : null, Date.now());
    }, timeout || 10);
  };

  _me.sync = function (prefix, callback) {
    callback(prefix.indexOf('syncerror') > -1 ? new Error('SyncError') : null);
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
      '/config/app1/app2/key1' : 'AbCd1我asd',
        '/config/app1/app2/key2' : '-123.3123',
        '/config/app1/app2/key3' : '; this is comment\na = "b"\n[section1]\n\n\n\na = -1231.3  \r\nbb\r\nc="\\\'12"',
        '/config/app3/app2/key1' : 'abcd',
    }));

    _me.setEventHandle('change', function (rev) {
      should.ok(rev);
      if ((--num) === 0) {
        done();
      }
    });

    var data = _me.get('key1');
    data.should.eql('AbCd1我asd');

    data = _me.get('key2', 'number');
    data.should.eql(-123.3123);

    data = _me.get('key3', 'ini');
    JSON.stringify(data).should.eql(JSON.stringify({
      'a' : 'b',
      'section1' : {'a' : -1231.3, 'c' : '\'12'}
    }));

    data = _me.get('error');
    should.ok(!data);
    done();
  });
  /* }}} */

  /* {{{ should_config_set_event_handle_works_fine() */
  it('should_config_set_event_handle_works_fine', function (done) {
    var _me = config.create('/syncerror', {'timeout' : 5}, _storer({}));
    _me.setEventHandle('error', function (error) {
      error.toString().should.include('SyncError');
      var _me = config.create('/watcherror', {'timeout' : 5}, _storer({}));
      _me.setEventHandle('error', function (error) {
        error.toString().should.include('WatchError');
        done();
      });
    });
  });
  /* }}} */

});

