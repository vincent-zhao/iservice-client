/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');
var exec    = require('child_process').exec;
var http    = require('http');
var Service = require(__dirname + '/../lib/service.js');

describe('service test', function () {
  
  /*{{{ should_get_works_fine */
  it('should_get_works_fine', function (done) {
    var obj = new Service.Subscribe('test', {}, {'prefix':''}); 
    obj.start = function(){};
    obj.availables = ['addr1', 'addr2', 'addr3'];

    obj.get().should.eql('addr1');
    obj.get().should.eql('addr2');
    obj.get().should.eql('addr3');

    done();
  });
  /*}}}*/

  /*{{{ should_set_works_fine */
  it('should_set_works_fine', function (done) {
    var _store = {
      getTree : function (root, callback) {
        callback(null, {
          '/test' : {
            meta : 'meta1',
            data : JSON.stringify({addr:"1.1.1.1:80"})
          },
          '/test/a' : {
            meta : 'meta2',
            data : JSON.stringify({addr:"2.2.2.2:90"})
          }
        });
      }
    }
    var obj = new Service.Subscribe('test', {}, {'prefix':''}, _store); 
    obj.start = function(){};
    obj.on('change', function (list) {
      list.length.should.eql(2);
      done();
    });
    obj.set();
  });
  /*}}}*/

  /*{{{ should_setHB_default_works_fine */
  it('should_setHB_default_works_fine', function (done) {
    var server = http.createServer(function (req, res) {
      if (req.url === '/status.taobao') {
        res.end('ok');
      }
    }).listen(77899, function () {
      var obj = new Service.Subscribe('test', {}, {'prefix':''});
      obj.start = function(){}
      obj.allServices = ['127.0.0.1:1234','127.0.0.1:77899'];
      obj.setHB({
        interval : 1000
      });
      setTimeout(function(){
        obj.availables.length.should.eql(1);
        obj.availables[0].should.eql('127.0.0.1:77899');
        server.close();
        done();
      }, 3000);
    });
  });
  /*}}}*/

});

/*{{{ cleanUp() */
function cleanUp(callback){
  exec('rm -rf ' + __dirname + '/run/*', function (err, out, stderr) {
    callback();
  });
}
/*}}}*/

