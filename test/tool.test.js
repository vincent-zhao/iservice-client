var fs      = require('fs');
var should  = require('should');
var exec    = require('child_process').exec;
var tool    = require(__dirname + '/../lib/tool.js');

/*{{{ beforeEach */
beforeEach(function (done) {
  cleanUp(function () {
    done();
  });
});
/*}}}*/

describe('tool test', function () {

  /*{{{ should_rmdir_works_fine() */
  it('should_rmdir_works_fine', function (done) {
    var root = __dirname + '/run';
    fs.mkdirSync(root + '/dir_test');
    fs.mkdirSync(root + '/dir_test/dir1');
    fs.mkdirSync(root + '/dir_test/dir2');
    fs.writeFileSync(root + '/dir_test/file1');
    fs.writeFileSync(root + '/dir_test/dir1/file2');
    tool.rmdir(root + '/dir_test');
    try {
      fs.statSync(root + '/dir_test');
    } catch(e) {
      done();
    }
  });
  /*}}}*/

  /*{{{ should_getpids_works_fine() */
  it('should_getpids_works_fine', function (done) {
    var file = __dirname + '/run/tmp.js';
    var content = 
      'var tool = require(__dirname + \'/../../lib/tool.js\');' +
      'setTimeout(function(){tool.getPids(function(error, pids){console.log(pids);});},1000);' + 
      'setTimeout(function(){},3000);';
    fs.writeFileSync(file, content);
    var command = 'node ' + file;
    var count = 2;
    exec(command, function (error, stdout, stderr) {
      stdout.split(',').length.should.eql(2);
      if (--count === 0) {
        done();
      }
    });
    exec(command, function (error, stdout, stderr) {
      stdout.split(',').length.should.eql(2);
      if (--count === 0) {
        done();
      }
    });
  });
  /*}}}*/

  /*{{{ should_dump_no_need_to_copy_works_fine() */
  it('should_dump_no_need_to_copy_works_fine', function (done) {
    fs.mkdirSync(__dirname + '/run/test_prefix_1');
    fs.mkdirSync(__dirname + '/run/test_prefix_2');
    fs.writeFileSync(__dirname + '/run/test_prefix_1/test', 'lalala');
    fs.writeFileSync(__dirname + '/run/test_prefix_2/test', 'lalala2');

    var file = __dirname + '/run/tmp2.js';
    var content = 
      'var tool = require(__dirname + \'/../../lib/tool.js\');' +
      'setTimeout(function(){tool.dump(__dirname, \'test_prefix_\', false, function(){console.log(\'finished!\');});},1000);' + 
      'setTimeout(function(){},3000);';
    fs.writeFileSync(file, content);
    var command = 'node ' + file;
    var count = 2;
    for(var i = 0;i < 2; i++) {
      exec(command, function (error, stdout, stderr) {
        if (--count === 0) {
          try {
            fs.statSync(__dirname + '/run/test_prefix_1');
          } catch(e) {
            try {
              fs.statSync(__dirname + '/run/test_prefix_2');
            } catch(e) {
              done();
            }
          }
        }
      });
    }
  });
  /*}}}*/

  /*{{{ should_dump_need_to_copy_works_fine() */
  it('should_dump_need_to_copy_works_fine', function (done) {
    fs.mkdirSync(__dirname + '/run/test_prefix_1');
    fs.writeFileSync(__dirname + '/run/test_prefix_1/test', 'lalala');
    setTimeout(function(){
      fs.mkdirSync(__dirname + '/run/test_prefix_2');
      fs.writeFileSync(__dirname + '/run/test_prefix_2/test', 'lalala2');

      var file = __dirname + '/run/tmp3.js';
      var content = 
        'var tool = require(__dirname + \'/../../lib/tool.js\');' +
        'setTimeout(function(){tool.dump(__dirname, \'test_prefix_\', true, function(){console.log(\'finished!\');});},1000);' + 
        'setTimeout(function(){},3000);';
      fs.writeFileSync(file, content);
      var command = 'node ' + file;
      var count = 2;
      for(var i = 0;i < 2; i++) {
        exec(command, function (error, stdout, stderr) {
          if (--count === 0) {
            fs.statSync(__dirname + '/run/test_prefix_1');
            fs.statSync(__dirname + '/run/test_prefix_2');
            var folders = fs.readdirSync(__dirname + '/run');
            var num = 0;
            for (var i = 0; i < folders.length; i++) {
              if (folders[i] !== 'test_prefix_1' && folders[i] !== 'test_prefix_2' && fs.statSync(__dirname + '/run/' + folders[i]).isDirectory()) {
                num++;
                fs.readFileSync(__dirname + '/run/' + folders[i] + '/test').toString().should.eql('lalala2');
              }
            }
            num.should.eql(2);
            done();
          }
        });
      }
    },2000);
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

