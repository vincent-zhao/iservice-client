/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');

/* {{{ mocked iservice server */

var __mockeddata = {
  '/test/key1'  : {
    'data'  : 1234,
    'meta'  : {'v' : 1, 't' : 1},
  },
  '/test/key2'  : {
    'data'  : 5678,
    'meta'  : {'v' : 2, 't' : 3},
  },
  '/test/key1/aa'   : {
    'data'  : '{"a" : "abcd"}',
    'meta'  : {'v' : 2, 't' : 2},
  },
  '/test'   : {
    'data'  : '周华健',
    'meta'  : {'v' : 1, 't' : 4},
  },
  '/'   : {
    'data'  : 3456,
    'meta'  : {'v' : 1, 't' : 5},
  },
};

var http = require('http').createServer(function (req, res) {
  var url = [];
  req.url.split('?').shift().split('/').forEach(function (item) {
    item = item.trim();
    if ('' !== item) {
      url.push(decodeURIComponent(item));
    }
  });

  var ctl = url.shift();
  if ('api' === ctl) {
    var key = url.join('/');
    switch (url.shift()) {
      case 'get':
        res.write(JSON.stringify({
          'error'   : null,
          'data'    : __mockeddata[key],
        }));
        break;

      case 'watch':
        return setTimeout(function () {
          res.end(JSON.stringify({
            'error' : null,
            'data'  : Date.now(),
          }));
        }, (req.headers['x-app-tmout'] || 1000) - 5);
        break;

      case 'tree':
        res.write(JSON.stringify({
          'error'   : null,
          'data'    : __mockeddata,
        }));
        break;

      case 'feedback':
        break;

      default:
        res.write('undefined action.');
        break;
    }
  }

  res.end();
}).listen(33750);

/* }}} */

describe('iservice connect interface', function () {

  beforeEach(function (done) {
    var cmd = '/bin/rm -rf "' + __dirname + '/run/cache"';
    require('child_process').exec(cmd, {}, function (error) {
      should.ok(!error);
      done();
    });
  });

  /* {{{ client object */
  var client = require(__dirname + '/../lib/iservice.js').create({
    'host' : '127.0.0.1:33750',
      'root'    : '/',
      'token'   : 'unittest',
      'cache'   : __dirname + '/run/cache',
      'uuid'    : '{PID}',
  });
  /* }}} */

  /* {{{ should_client_dump_and_get_works_fine() */
  it('should_client_dump_and_get_works_fine', function (done) {
    client.sync('/', function (error) {
      should.ok(!error);
      client.get('/test/key1', function (error, data, meta) {
        should.ok(!error);
        data.should.eql(1234);
        JSON.stringify(meta).should.eql(JSON.stringify({
          'v' : 1, 't' : 1
        }));
        done();
      });
    });
  });
  /* }}} */

  /* {{{ should_client_dump_and_get_bug(sync_not_root)_fixed_ok() */
  it('should_client_dump_and_get_bug_fixed_ok', function (done) {
      __mockeddata = {
        '/test/key1'  : {
          'data'  : 1234,
          'meta'  : {'v' : 1, 't' : 1},
        },
        '/test/key2'  : {
          'data'  : 5678,
          'meta'  : {'v' : 2, 't' : 3},
        },
        '/test/key1/aa'   : {
          'data'  : '{"a" : "abcd"}',
          'meta'  : {'v' : 2, 't' : 2},
        },
        '/test'   : {
          'data'  : '周华健',
          'meta'  : {'v' : 1, 't' : 4},
        }
      };
      client.sync('/test', function (error) {
        should.ok(!error);
        client.get('/test/key1', function (error, data, meta) {
          should.ok(!error);
          data.should.eql(1234);
          JSON.stringify(meta).should.eql(JSON.stringify({
            'v' : 1, 't' : 1 
          }));
          __mockeddata = {
            '/test/key1'  : {
              'data'  : 1234,
              'meta'  : {'v' : 1, 't' : 1},
            },
            '/test/key2'  : {
              'data'  : 5678,
              'meta'  : {'v' : 2, 't' : 3},
            },
            '/test/key1/aa'   : {
              'data'  : '{"a" : "abcd"}',
              'meta'  : {'v' : 2, 't' : 2},
            },
            '/test'   : {
              'data'  : '周华健',
              'meta'  : {'v' : 1, 't' : 4},
            },
            '/'   : {
              'data'  : 3456,
              'meta'  : {'v' : 1, 't' : 5},
            },
          };
          done();
        }); 
      }); 
    }); 
  /* }}} */

  /* {{{ should_client_dump_and_get_bug(sync_path.zk_file_exist)_fixed_ok() */
  it('should_client_dump_and_get_bug_fixed_ok', function (done) {
      __mockeddata = {
        '/test/key1'  : {
          'data'  : 1234,
          'meta'  : {'v' : 1, 't' : 1},
        },
        '/test/key2'  : {
          'data'  : 5678,
          'meta'  : {'v' : 2, 't' : 3},
        },
        '/test/key1/aa'   : {
          'data'  : '{"a" : "abcd"}',
          'meta'  : {'v' : 2, 't' : 2},
        },
        '/test'   : {
          'data'  : '周华健',
          'meta'  : {'v' : 1, 't' : 4},
        }
      };
      client.sync('/test', function (error) {
        should.ok(!error);
        client.get('/test/key1', function (error, data, meta) {
          should.ok(!error);
          data.should.eql(1234);
          JSON.stringify(meta).should.eql(JSON.stringify({
            'v' : 1, 't' : 1 
          }));
          client.get('/test', function (error, data, meta) {
            data.should.eql("周华健");
            __mockeddata = {
              '/test/key1'  : {
                'data'  : 1234,
                'meta'  : {'v' : 1, 't' : 1},
              },
              '/test/key2'  : {
                'data'  : 5678,
                'meta'  : {'v' : 2, 't' : 3},
              },
              '/test/key1/aa'   : {
                'data'  : '{"a" : "abcd"}',
                'meta'  : {'v' : 2, 't' : 2},
              },
              '/test'   : {
                'data'  : '周华健',
                'meta'  : {'v' : 1, 't' : 4},
              },
              '/'   : {
                'data'  : 3456,
                'meta'  : {'v' : 1, 't' : 5},
              },
            };
            done();
          });
        }); 
      }); 
    }); 
  /* }}} */

  /* {{{ should_client_watch_works_fine() */
  it('should_client_watch_works_fine', function (done) {
    var num = 0;
    client.watch('/aa', 10, function (error, data) {
      should.ok(!error);
      if ((++num) >= 2) {
        done();
      }
    });
  });
  /* }}} */

  /*{{{ should_client_rmdir_works_fine() */
  it('should_client_rmdir_works_fine', function (done) {
    var root = __dirname + '/run/cache';
    fs.mkdirSync(root);
    fs.mkdirSync(root + '/dir_test');
    fs.mkdirSync(root + '/dir_test/dir1');
    fs.mkdirSync(root + '/dir_test/dir2');
    fs.writeFileSync(root + '/dir_test/file1');
    fs.writeFileSync(root + '/dir_test/dir1/file2');
    require(__dirname + '/../lib/iservice.js').rmdir(root + '/dir_test');
    try {
      fs.statSync(root + '/dir_test');
    } catch(e) {
      done();
    }
  });
  /*}}}*/

});

after(function () {
  http.close();
  http = null;
});
