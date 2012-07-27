/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');

/* {{{ mocked iservice server */

var __mockeddata = {
  '/test/key1'  : {
    'data'  : 1234,
    'meta'  : 1,
  },
  '/test/key2'  : {
    'data'  : 5678,
    'meta'  : 2,
  },
  '/test/key1/aa'   : {
    'data'  : 'abcd',
    'meta'  : 2,
  },
  '/test'   : {
    'data'  : '周华健',
    'meta'  : 1,
  },
};

var http = require('http').createServer(function (req, res) {
  var url = req.url.split('/');
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

  res.end(req.url);
}).listen(33750);

/* }}} */

describe('iservice connect interface', function () {

  /* {{{ client object */
  var client = require(__dirname + '/../lib/iservice.js').create({
    'hosts' : '127.0.0.1:33750',
      'root'    : 'test',
      'user'    : 'unittest',
      'pass'    : '123456',
      'cache'   : __dirname + '/../run/cache',
      'uuid'    : 'test',
  });
  /* }}} */

  /* {{{ should_client_get_works_fine() */
  it('should_client_get_works_fine', function (done) {
    client.get('/test/key1', function (error, data) {
      should.ok(!error);
      console.log(data.toString());
      done();
    });
  });
  /* }}} */

});

after(function () {
  http.close();
  http = null;
});
