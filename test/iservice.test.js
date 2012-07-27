/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');

var http    = require('http').createServer(function (req, res) {
  res.end('hello world');
}).listen(33749);

describe('iservice connect interface', function () {

  /* {{{ client object */
  var client = require(__dirname + '/../lib/iservice.js').create({
    'hosts' : '127.0.0.1,127.0.0.2',
      'root'    : 'test',
      'user'    : 'unittest',
      'pass'    : '123456',
      'cache'   : __dirname + '/../run/cache',
      'uuid'    : 'test',
  });
  /* }}} */

  it('should_client_get_works_fine', function () {
  });

});

after(function () {
  http.close();
  http = null;
});
