/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var events  = require(__dirname + '/../lib/events.js');

describe('events proxy', function () {

  /* {{{ should_events_proxy_works_fine() */
  it('should_events_proxy_works_fine', function (done) {
    var _me = events.create(function (error) {
      should.ok(!error);
      done();
    });
    _me.wait('case1', function () {
      var _evt1 = events.create(function () {
        _me.emit('case1');
      });

      _evt1.wait('hello1');
      _evt1.wait('hello2');
      process.nextTick(function () {
        _evt1.emit('hello4');
        _evt1.emit('hello1');
        _evt1.emit('hello1');
        _evt1.emit('hello1');
        _evt1.emit('hello2');
      });
    });
    _me.wait('case2', function () {
      var _evt2 = events.create(function (error) {
        should.ok(error);
        error.toString().should.include('test1');
        _me.emit('case2');
      });
      _evt2.wait('hello3');
      _evt2.emit('hello3', new Error('test1'));

      _evt2.wait('hello4');
      _evt2.emit('hello4', new Error('test2'));
    });
  });
  /* }}} */

});
