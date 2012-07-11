/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs = require('fs');
var should  = require('should');
var Zookeeper = require(__dirname + '/../lib/store.js');

describe('zookeeper interface', function () {

  var cache = __dirname + '/run/.cache';

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

  /* {{{ should_zookeeper_watch_path_works_fine() */
  it('should_zookeeper_watch_path_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'cache' : cache,
        'uuid' : 'test'
    });

    _zk.watch('//META/trigger1', function (_old, _new) {
      console.log(_new);
      });
    done();
  });
  /* }}} */

  it('should_zookeeper_dump_tree_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'hosts' : 'localhost:2181,localhost:2181',
        'cache' : cache,
        'uuid' : 'test'
    });

    setTimeout(function () {
      _zk.dumpTree('/', function (error) {
        should.ok(!error);
        done();
      });
    }, 200);
  });

});

