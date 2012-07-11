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

  /* {{{ should_zookeeper_watch_path_works_fine() */
  it('should_zookeeper_watch_path_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'cache' : cache,
        'uuid' : 'test'
    });

    _zk.watch('//META/trigger1', function (now, pre) {
      });
    done();
  });
  /* }}} */

  /* {{{ should_zookeeper_dump_tree_works_fine() */
  it('should_zookeeper_dump_tree_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test'
    });

    var num = 2;
    _zk.sync('/', function (error) {
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

});

