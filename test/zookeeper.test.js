/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var Zookeeper = require(__dirname + '/../lib/store.js');

describe('zookeeper interface', function () {

  /* {{{ should_data_backup_info_local_file_works_fine() */
  it('should_data_backup_info_local_file_works_fine', function (done) {
    var _zk = Zookeeper.create({
      'cache' : __dirname + '/run/.cache',
        'uuid' : 'test'
    });
    try {
      _zk._backup('///i///am/not/exists', 'This is a demo ');
    } catch (e) {
    }
    done();
  });
  /* }}} */

});

