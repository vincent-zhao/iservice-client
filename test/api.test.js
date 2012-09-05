/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');

var Client  = require(__dirname + '/../').init({
  'host'    : '127.0.0.1'
  ,'root'   : '/apitest/'
  ,'token'  : ''
  ,'cache'  : __dirname + '/run/cache'
  ,'uuid'   : 'apitest'
});

describe('client api', function () {

  /* {{{ should_create_config_works_fine() */
  it('should_create_config_works_fine', function (done) {
    var config = Client.createConfig('/configtest');
    config.setEventHandle('error', function (error) {
      console.log(error);
    });

    config.get('path/key1', '', function (error, data) {
      error.should.have.property('name', 'NotFound');
      done();
    });

  });
  /* }}} */

});

