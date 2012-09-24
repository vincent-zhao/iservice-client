/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

var fs      = require('fs');
var should  = require('should');
var exec    = require('child_process').exec;
var http    = require('http');
var Subscribe = require(__dirname + '/../lib/subscribe.js');

/*{{{ beforeEach */
beforeEach(function (done) {
  cleanUp(function () {
    done();
  });
});
/*}}}*/

describe('Subscribe test', function () {

  /*{{{ should_get_works_fine */
  it('should_get_works_fine', function (done) {
    var obj = new Subscribe('test',{},{host:'127.0.0.1:80',cache:__dirname + '/run'});
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
    var root = __dirname + '/run';
    fs.mkdirSync(root + '/iservice_cache_' + process.pid);
    fs.mkdirSync(root + '/iservice_cache_' + process.pid + '/service_cache');
    fs.mkdirSync(root + '/iservice_cache_' + process.pid + '/service_cache/service');
    fs.mkdirSync(root + '/iservice_cache_' + process.pid + '/service_cache/service/app');
    fs.mkdirSync(root + '/iservice_cache_' + process.pid + '/service_cache/service/app/1.0');
    fs.mkdirSync(root + '/iservice_cache_' + process.pid + '/service_cache/service/app/2.0');
    fs.writeFileSync(root + '/iservice_cache_' + process.pid + '/service_cache/service/app/1.0/1', JSON.stringify({data:JSON.stringify({addr:'127.0.0.1:80'})}));
    fs.writeFileSync(root + '/iservice_cache_' + process.pid + '/service_cache/service/app/2.0/1', JSON.stringify({data:JSON.stringify({addr:'127.0.0.1:90'})}));

    var obj = new Subscribe('app', {}, {
      host : '127.0.0.1:80',
      root : '/',
      cache : root,
      folderPrefix : 'iservice_cache_',
    });
    obj.start = function(){};
    obj.set(function(){
      obj.allServices.length.should.eql(2);
      if (obj.allServices[0] === '127.0.0.1:80' || obj.allServices[0] === '127.0.0.1:90') {
        done();
     }
    });
  });
  /*}}}*/

  /*{{{ should_check_works_fine */
  it('should_check_works_fine', function (done) {
    var server = http.createServer(function (req, res) {
      if (req.url === '/api/tree/' + encodeURIComponent('service/test')) {
        res.end(JSON.stringify({
          '/test' : 'value1',
          '/test/a' : 'value2'
        }));
      }
    }).listen(77899, function () {
      var obj = new Subscribe('test', {}, {
        host : '127.0.0.1:77899',
        root : '/',
        cache : __dirname + '/run',
        folderPrefix : 'iservice_cache_',
      });
      obj.start = function(){}
      obj.check(function (err, data) {
        if (err) throw new Error();
        JSON.parse(data)['/test'].should.eql('value1');
        JSON.parse(data)['/test/a'].should.eql('value2');
        server.close();
        done();
      });
    });
  });
  /*}}}*/

  /*{{{ should_sync_works_fine */
  it('should_sync_works_fine', function (done) {
    var obj = new Subscribe('app1', {}, {
      host : '127.0.0.1:80',
      root : '/',
      cache : __dirname + '/run',
      folderPrefix : 'iservice_cache_',
    });
    obj.start = function(){}
    var services = {
      '/service/app1' : 'abcdef',
      '/service/app1/key1' : 'abcdefg',
    }
    obj.sync(services, function (err) {
      fs.readFileSync(__dirname + '/run/iservice_cache_' + process.pid + '/service_cache/service/app1.zk').toString().should.eql('\"abcdef\"');
      fs.readFileSync(__dirname + '/run/iservice_cache_' + process.pid + '/service_cache/service/app1/key1.zk').toString().should.eql('\"abcdefg\"');
      done();
    });
  });
  /*}}}*/

  /*{{{ should_setHB_default_works_fine */
  it('should_setHB_default_works_fine', function (done) {
    var server = http.createServer(function (req, res) {
      if (req.url === '/status.taobao') {
        res.end('ok');
      }
    }).listen(77899, function () {
      var obj = new Subscribe('test', {}, {
        host : '127.0.0.1:80',
        folderPrefix : 'iservice_cache_',
      });
      obj.start = function(){};
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

