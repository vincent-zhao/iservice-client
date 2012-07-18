/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs = require('fs');
var should  = require('should');
var Zookeeper = require(__dirname + '/../lib/store.js');

describe('zookeeper interface', function () {

  var cache = __dirname + '/run/cache';

  beforeEach(function (done) {
    require('child_process').exec('rm -rf "' + cache + '"', {}, function (error, stdout, stderr) {
      should.ok(!error);
      done();
    });
  });

  /* {{{ should_zookeeper_backup_and_get_works_fine() */
  it('should_zookeeper_backup_and_get_works_fine', function (done) {

    var _zk = Zookeeper.create({
      'cache' : cache,
        'uuid' : 'test'
    });

    var key = '///i///am/not/exists';

    _zk.get(key, function (error, data) {
      error.should.have.property('code', 'NotFound');
      should.ok(!data);

      /**
       * @ _backup is a private method, only for test
       */
      _zk._backup('///i///am/not/exists', 'This is a demo ');
      _zk.cleanCache();
      _zk.get(key, function (error, data) {
        should.ok(!error);
        data.should.eql('This is a demo ');
        _zk.get(key, function (error, data) {
          should.ok(!error);
          data.should.eql('This is a demo ');
          done();
        });
      });
    });
  });
  /* }}} */

  /* {{{ should_zookeeper_connect_error_works_fine() */
  it('should_zookeeper_connect_error_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2183',
        'cache' : cache,
        'uuid' : 'test'
    });

    _zk.sync('/', function (error) {
      error.should.have.property('code', 'ConnectError');
      done();
    });
  });
  /* }}} */

  /* {{{ should_zookeeper_dump_tree_works_fine() */
  xit('should_zookeeper_dump_tree_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test'
    });

    var num = 2;
    _zk.sync('/', function (error) {
      console.log(error);
      should.ok(!error);
      if ((--num) === 0) {
        done();
      }
    });
    _zk.sync('/i/am/not/exists', function (error) {
      error.should.have.property('code', 'ZookeeperError');
      if ((--num) === 0) {
        done();
      }
    });
  });
  /* }}} */

  /* {{{ should_zookeepep_readonly_works_fine() */
  it('should_zookeepep_readonly_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test'
    });
    _zk.set('key1', 1234, function (error) {
      error.should.have.property('code', 'ReadOnly');
      _zk.rm('key1', function (error) {
        error.should.have.property('code', 'ReadOnly');
        done();
      });
    });
  });
  /* }}} */

  /* {{{ should_zookeeper_rm_and_set_works_fine() */
  it('should_zookeeper_rm_and_set_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test',
        'readonly'  : false
    });

    var value = (new Date()).getTime();
    _zk.rm('/test/key1', function (error) {
      should.ok(!error);
      _zk.set('/test/key1', 'hello world', function (error) {
        should.ok(!error);
        _zk.set('test/key1', value, function (error) {
          should.ok(!error);
          _zk._handle.a_get('/test/key1', false, function (rt, error, stat, data) {
            data.should.eql(value.toString());
            done();
          });
        });
      });
    });
  });
  /* }}} */

  /* {{{ should_zookeeper_watch_change_works_fine() */
  it('should_zookeeper_watch_change_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test',
        'readonly'  : false
    });

    _zk.set('test/for/watch', 1, function (error) {
      should.ok(!error);

      var expect = 1;
      _zk.watch('test/for/watch', 60000, function (now, prev) {
        now = now - 0;
        now.should.eql(expect);
        if (3 === now) {
          done();
        }
      });

      _zk.set('test/for/watch', 2, function (error) {
        should.ok(!error);
        expect = 2;
      });

      _zk.set('test/for/watch', 2, function (error) {
        should.ok(!error);
        expect = 2;
      });

      _zk.set('test/for/watch', 3, function (error) {
        should.ok(!error);
        expect = 3;
      });
    });
  });
  /* }}} */

  /* {{{ should_timer_watch_change_works_fine() */
  it('should_timer_watch_change_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test',
        'readonly'  : false
    });

    var num = 7;

    var expect  = null;

    _zk.rm('/key1', function (error) {
      should.ok(!error);

      /**
       * @ watch a empty node
       */
      _zk.watch('/key1', 2, function (now, pre) {
        should.ok(pre === undefined);
        should.ok(now == expect);       // XXX: number vs string
        if ((--num) === 0) {
          (now - 0).should.eql(2);
          done();
        }
      });

      _zk.set('key1', 1, function (error) {
        should.ok(!error);
        expect = 1;

        setTimeout(function () {
          _zk.set('key1', 2, function (error) {
            should.ok(!error);
            expect = 2;
          });
        }, 5);
      });

    });

  });
  /* }}} */

});

