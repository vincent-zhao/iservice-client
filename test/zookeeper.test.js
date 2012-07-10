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

  /* {{{ should_data_backup_info_local_file_works_fine() */
  it('should_data_backup_info_local_file_works_fine', function (done) {

    var _zk = Zookeeper.create({
      'cache' : cache,
        'uuid' : 'test'
    });

    var _fn = cache + '/test/i/am/not/exists.zk';
    fs.readFile(_fn, 'utf-8', function (error, data) {
      error.should.have.property('code', 'ENOENT');
      _zk._backup('///i///am/not/exists', 'This is a demo ');
      fs.readFile(_fn, 'utf-8', function (error, data) {
        should.ok(!error);
        data.should.eql('This is a demo ');
        done();
      });
    });
  });
  /* }}} */

});

