/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var should  = require('should');
var service = require(__dirname + '/../');

describe('iservice interface', function () {

  it('should_iservice_create_client_works_fine', function () {
    var _me = service.createClient();
  });

});

