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
    obj.availables = [{
      'host' : 'host1',
      'port' : 'port1'
    },{
      'host' : 'host2',
      'port' : 'port2'
    },{
      'host' : 'host3',
      'port' : 'port3'
    }];

    obj.get().should.eql({
      'host' : 'host1',
      'port' : 'port1'
    });
    obj.get().should.eql({
      'host' : 'host2',
      'port' : 'port2'
    });
    obj.get().should.eql({
      'host' : 'host3',
      'port' : 'port3'
    });

    done();
  });
  /*}}}*/

  /*{{{ should_set_works_fine */
  it('should_set_works_fine', function (done) {
    var _store = {
      getTree : function (root) {
        return {
          '/test' : {
            meta : 'meta1',
            data : JSON.stringify({host:"1.1.1.1",port:80})
          },
          '/test/a' : {
            meta : 'meta2',
            data : JSON.stringify({host:"2.2.2.2",port:90})
          }
        };
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
      obj.allServices = [{
        host : '127.0.0.1',
        port : 1234
      },{
        host : '127.0.0.1',
        port : 77899 
      }];
      obj.setHB({
        interval : 1000
      });
      setTimeout(function(){
        obj.availables.length.should.eql(1);
        obj.availables[0].should.eql({
          host : '127.0.0.1',
          port : 77899 
        });
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

